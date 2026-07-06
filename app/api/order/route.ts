import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { artworks } from "@/lib/data";
import { productById, printSizeById, SHIRT_SIZES, sizesFor } from "@/lib/products";

// Print ordering — real Stripe Checkout. The secret key is server-side only (env). Flow:
// this creates a hosted Checkout Session (collects payment + shipping address) and redirects
// the buyer to it. On payment, Stripe fires /api/stripe/webhook, which creates the Prodigi
// order for fulfilment (see lib/prodigi.ts). Nothing is printed until money clears.
export const runtime = "nodejs";

const SITE = "https://featherbound.app";

// Where Prodigi can currently ship. Keep in sync with fulfilment coverage.
const SHIP_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  ["US", "CA", "GB", "IE", "AU", "NZ", "FR", "DE", "NL", "SE", "NO", "DK", "FI", "ES", "IT", "BE", "AT", "CH", "PT"];

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "payments not configured" }, { status: 503 });
  const stripe = new Stripe(secret);

  const form = await req.formData();
  const artworkId = String(form.get("artworkId") ?? "");
  const productType = String(form.get("productType") ?? "print");
  const sizeId = String(form.get("size") ?? "");
  const art = artworks.find((a) => a.id === artworkId);
  const product = productById(productType);
  if (!art || !product) return NextResponse.json({ error: "unknown item" }, { status: 404 });
  // Never start checkout for a product whose Prodigi SKU isn't confirmed live — a paid order
  // we can't fulfil means a refund. The picker already hides these; this guards direct POSTs.
  if (!product.available) return NextResponse.json({ error: "product unavailable" }, { status: 409 });

  // Resolve price + SKU + Prodigi attributes for the chosen size.
  //   • Print: size is a different SKU; price scales off the artwork's base price.
  //   • Shirt: same SKU + a size (and colour) attribute; must have a valid size.
  //   • Mug/tote: no size.
  let priceUsd = productType === "print" ? art.priceUsd : product.priceUsd;
  let prodigiSku = productType === "print" ? art.prodigiSku : product.prodigiSku;
  let sizeLabel = "";
  if (productType === "print") {
    const size = printSizeById(sizeId);
    prodigiSku = size.sku;
    priceUsd = Math.round(art.priceUsd * size.mult);
    sizeLabel = size.label;
  } else if (productType === "shirt") {
    const size = SHIRT_SIZES.find((s) => s.id === sizeId);
    if (!size) return NextResponse.json({ error: "pick a shirt size" }, { status: 400 });
    sizeLabel = size.label;
  } else if (sizesFor(productType).length && !sizeId) {
    return NextResponse.json({ error: "pick a size" }, { status: 400 });
  }

  const name = `${art.speciesCommon} — ${product.label}${sizeLabel ? ` (${sizeLabel})` : ""}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(priceUsd * 100),
          product_data: {
            name,
            description: product.blurb,
            images: [`${SITE}${art.image}`],
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: SHIP_COUNTRIES },
    phone_number_collection: { enabled: true },
    success_url: `${SITE}/print/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE}/print/${encodeURIComponent(art.speciesSci)}`,
    // The webhook needs these to fulfil the right item + attributes after payment clears.
    metadata: { artworkId: art.id, productType, prodigiSku, sizeId, sizeLabel },
  });

  if (!session.url) return NextResponse.json({ error: "could not start checkout" }, { status: 502 });
  return NextResponse.redirect(session.url, 303);
}
