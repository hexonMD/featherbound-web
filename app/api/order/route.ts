import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { artworks } from "@/lib/data";
import { productById } from "@/lib/products";

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
  const art = artworks.find((a) => a.id === artworkId);
  const product = productById(productType);
  if (!art || !product) return NextResponse.json({ error: "unknown item" }, { status: 404 });
  // Never start checkout for a product whose Prodigi SKU isn't confirmed live — a paid order
  // we can't fulfil means a refund. The picker already hides these; this guards direct POSTs.
  if (!product.available) return NextResponse.json({ error: "product unavailable" }, { status: 409 });

  // The fine-art print uses the artwork's own price + SKU; other products use the catalogue.
  const priceUsd = productType === "print" ? art.priceUsd : product.priceUsd;
  const prodigiSku = productType === "print" ? art.prodigiSku : product.prodigiSku;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(priceUsd * 100),
          product_data: {
            name: `${art.speciesCommon} — ${product.label}`,
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
    // The webhook needs these to fulfil the right item after payment clears.
    metadata: { artworkId: art.id, productType, prodigiSku },
  });

  if (!session.url) return NextResponse.json({ error: "could not start checkout" }, { status: 502 });
  return NextResponse.redirect(session.url, 303);
}
