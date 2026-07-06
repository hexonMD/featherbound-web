import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { parseCollageSpec, printCollageUrl } from "@/lib/collage";
import { COLLAGE_BASE_USD, printSizeById } from "@/lib/products";

// Order a collection collage ("field guide") print. The app POSTs the selected birds + title
// + size; we compose the collage, upload it as the Prodigi print asset, and open a Stripe
// Checkout Session. On payment the shared webhook (kind:"collage") sends the asset to Prodigi.
// Unlike single plates, a collage MUST be composed (no per-bird fallback), so R2 is required.
export const runtime = "nodejs";

const SITE = "https://featherbound.app";
const SHIP_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  ["US", "CA", "GB", "IE", "AU", "NZ", "FR", "DE", "NL", "SE", "NO", "DK", "FI", "ES", "IT", "BE", "AT", "CH", "PT"];

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "payments not configured" }, { status: 503 });
  if (!process.env.R2_PUBLIC_BASE || !process.env.R2_ACCESS_KEY_ID)
    return NextResponse.json({ error: "print rendering not configured" }, { status: 503 });
  const stripe = new Stripe(secret);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { spec, error } = parseCollageSpec(raw);
  if (!spec) return NextResponse.json({ error }, { status: 400 });

  const size = printSizeById(spec.sizeId);
  const priceUsd = Math.round(COLLAGE_BASE_USD * size.mult);

  // Compose + upload the collage now so we can show it in Checkout and hand it to Prodigi.
  let assetUrl: string;
  try {
    assetUrl = await printCollageUrl(spec);
  } catch (e) {
    console.error("[collage/order] compose failed", e);
    return NextResponse.json({ error: "could not build your field guide" }, { status: 502 });
  }

  const name = `${spec.title} — Field Guide print (${size.label})`;
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
            description: `${spec.birds.length} birds from your collection, on museum-quality fine-art paper`,
            images: [assetUrl],
          },
        },
      },
    ],
    shipping_address_collection: { allowed_countries: SHIP_COUNTRIES },
    phone_number_collection: { enabled: true },
    success_url: `${SITE}/print/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE}/store`,
    metadata: {
      kind: "collage",
      assetUrl,
      prodigiSku: size.sku,
      sizeId: size.id,
      sizeLabel: size.label,
      title: spec.title,
      birdCount: String(spec.birds.length),
    },
  });

  if (!session.url) return NextResponse.json({ error: "could not start checkout" }, { status: 502 });
  return NextResponse.json({ url: session.url });
}
