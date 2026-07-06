// Prodigi print-on-demand fulfilment. The API key lives ONLY in env (PRODIGI_API_KEY) and
// is used server-side only. Called after a confirmed payment (Stripe webhook), never from
// the browser.
//
// How SKUs work here (important): a Prodigi SKU is the PRODUCT (a 16×24 fine-art print, a
// Gildan tee, an 11oz mug…), NOT the bird. The bird is the image asset applied to that
// product. So there's one SKU per product type, shared across every bird — the artwork URL
// is what makes it a robin vs a chickadee. `reference` is a human-readable "<Bird> — <Product>"
// label stamped on the order (and each item) so orders read by bird + product in dashboards.
export async function createProdigiOrder(
  art: { prodigiSku: string; image: string },
  recipient: Record<string, unknown>,
  reference?: string
) {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY not set");
  const res = await fetch("https://api.prodigi.com/v4.0/Orders", {
    method: "POST",
    headers: { "X-API-Key": key, "content-type": "application/json" },
    body: JSON.stringify({
      merchantReference: reference,
      shippingMethod: "Standard",
      recipient,
      items: [
        {
          merchantReference: reference,
          sku: art.prodigiSku,
          copies: 1,
          sizing: "fillPrintArea",
          assets: [{ printArea: "default", url: `https://featherbound.app${art.image}` }],
        },
      ],
    }),
  });
  return res.json();
}
