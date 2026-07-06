import { AwsClient } from "aws4fetch";

// Print-master resolution. The plates are ~734×460 (great for the app/web, too small to print
// large). We DON'T pre-generate high-res masters for all 1,682 birds — instead, when an order
// comes in, we upscale THAT bird's plate to print resolution once, cache it in R2, and hand
// Prodigi the R2 URL. Upscaling (not regeneration) so the print is pixel-for-pixel the exact
// plate the buyer collected. One master per bird, reused across sizes (Prodigi's fillPrintArea
// handles the per-size crop). Fully fallback-safe: if the upscaler isn't configured, we return
// the original plate so a sale never fails — it just prints at display res until it's wired.

const SITE = "https://featherbound.app";

export function plateSlug(commonName: string): string {
  return commonName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function printMasterUrl(imagePath: string, slug: string): Promise<string> {
  const original = /^https?:\/\//.test(imagePath) ? imagePath : `${SITE}${imagePath}`;
  const token = process.env.REPLICATE_API_TOKEN;
  const r2Base = process.env.R2_PUBLIC_BASE;
  if (!token || !r2Base || !process.env.R2_ACCESS_KEY_ID) return original; // not wired → safe fallback

  const key = `prints/${slug}.png`;
  const publicUrl = `${r2Base}/${key}`;
  // Already upscaled once → reuse the cached master (idempotent; one upscale per bird ever).
  try {
    if ((await fetch(publicUrl, { method: "HEAD" })).ok) return publicUrl;
  } catch {}

  try {
    const upscaled = await replicateUpscale(original, token);
    if (!upscaled) return original;
    const bytes = await (await fetch(upscaled)).arrayBuffer();
    await putToR2(key, bytes);
    return publicUrl;
  } catch (e) {
    console.error("[upscale] failed, using original plate", e);
    return original;
  }
}

// Real-ESRGAN on Replicate — 4× upscale, no face-enhance (it's bird illustration, not a face).
// Uses the model endpoint (latest version, no pinned hash) + `prefer: wait` to return inline.
async function replicateUpscale(imageUrl: string, token: string): Promise<string | null> {
  const create = await fetch(
    "https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions",
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", prefer: "wait" },
      body: JSON.stringify({ input: { image: imageUrl, scale: 4, face_enhance: false } }),
    }
  );
  let pred = await create.json();
  for (let i = 0; i < 40 && pred.status !== "succeeded" && pred.status !== "failed" && pred.status !== "canceled"; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    pred = await (
      await fetch(`https://api.replicate.com/v1/predictions/${pred.id}`, {
        headers: { authorization: `Bearer ${token}` },
      })
    ).json();
  }
  if (pred.status !== "succeeded") return null;
  return typeof pred.output === "string" ? pred.output : pred.output?.[0] ?? null;
}

async function putToR2(key: string, bytes: ArrayBuffer) {
  const client = new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    region: "auto",
    service: "s3",
  });
  const endpoint =
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`;
  const res = await client.fetch(endpoint, {
    method: "PUT",
    body: bytes,
    headers: { "content-type": "image/png" },
  });
  if (!res.ok) throw new Error(`R2 PUT ${res.status}`);
}
