// Prodigi print-on-demand fulfilment. The API key lives ONLY in env (PRODIGI_API_KEY) and
// is used server-side only. Called after a confirmed payment (Stripe webhook), never from
// the browser.
export async function createProdigiOrder(
  art: { prodigiSku: string; image: string },
  recipient: Record<string, unknown>
) {
  const key = process.env.PRODIGI_API_KEY;
  if (!key) throw new Error("PRODIGI_API_KEY not set");
  const res = await fetch("https://api.prodigi.com/v4.0/Orders", {
    method: "POST",
    headers: { "X-API-Key": key, "content-type": "application/json" },
    body: JSON.stringify({
      shippingMethod: "Standard",
      recipient,
      items: [
        {
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
