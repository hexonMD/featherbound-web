import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { artworks } from "@/lib/data";
import { productById, SHIRT_COLOR } from "@/lib/products";
import { createProdigiOrder } from "@/lib/prodigi";
import { printMasterUrl, plateSlug } from "@/lib/upscale";

// Stripe → Prodigi fulfilment. Fires after a Checkout payment clears. Verifies the Stripe
// signature (STRIPE_WEBHOOK_SECRET), then places the print-on-demand order with the shipping
// address the buyer entered. Runs server-side only; needs the raw request body for signature
// verification, so we read req.text() (never req.json()).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !whSecret) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const stripe = new Stripe(secret);

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", whSecret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = event.data.object as any;
    const md = (session.metadata ?? {}) as Record<string, string>;
    const art = artworks.find((a) => a.id === md.artworkId);
    // Shipping address the buyer entered at checkout. Field name has shifted across Stripe
    // API versions (shipping_details → collected_information.shipping_details); try both, then
    // fall back to the billing/customer details.
    const shipping = session.shipping_details
      ?? session.collected_information?.shipping_details
      ?? session.customer_details;
    const a = shipping?.address ?? session.customer_details?.address ?? {};

    if (art && a.line1 && a.country) {
      const recipient = {
        name: shipping?.name ?? session.customer_details?.name ?? "",
        email: session.customer_details?.email ?? undefined,
        phoneNumber: session.customer_details?.phone ?? undefined,
        address: {
          line1: a.line1,
          line2: a.line2 ?? undefined,
          postalOrZipCode: a.postal_code ?? "",
          countryCode: a.country,
          townOrCity: a.city ?? "",
          stateOrCounty: a.state ?? undefined,
        },
      };
      // Readable order label: "<Bird> — <Product> (<Size>)", stamped on the Prodigi order so
      // it reads by bird + product + size, matching the Stripe line item.
      const product = productById(md.productType || "print");
      const reference =
        `${art.speciesCommon} — ${product?.label ?? md.productType}` +
        (md.sizeLabel ? ` (${md.sizeLabel})` : "");
      // Prodigi item attributes: apparel needs size + colour; the print pins its paper.
      let attributes: Record<string, string> | undefined;
      if (md.productType === "shirt" && md.sizeId) {
        attributes = { size: md.sizeId, color: SHIRT_COLOR };
      } else if (md.productType === "print") {
        attributes = { paperType: "EMA", substrateWeight: "200gsm" };
      }
      // Upscale this bird's plate to print resolution (cached in R2), then fulfil with that
      // high-res master. Falls back to the on-site plate if the upscaler isn't configured.
      const assetUrl = await printMasterUrl(art.image, plateSlug(art.speciesCommon));
      try {
        await createProdigiOrder(
          { prodigiSku: md.prodigiSku || art.prodigiSku, image: art.image, assetUrl },
          recipient,
          reference,
          attributes
        );
      } catch (err) {
        // Don't 500 back to Stripe on a fulfilment hiccup — the payment is already captured.
        // Log so a failed print can be retried manually; returning 200 stops Stripe retrying
        // a request that would just fail again.
        console.error("[prodigi] fulfilment failed for", md.artworkId, err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
