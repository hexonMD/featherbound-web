import { AwsClient } from "aws4fetch";
import { composeFieldPlate, canvasDims } from "./fieldplate";

// Print master pipeline. On order: upscale the bird plate to print resolution (once per bird,
// cached), then compose it onto a portrait field-guide plate at the ordered size's ratio
// (cached per bird+size), and hand Prodigi that. Upscale not regenerate — the exact plate the
// buyer collected. Fully fallback-safe: if the pipeline isn't configured or errors, return the
// original plate so a sale never fails.

const SITE = "https://featherbound.app";
const abs = (p: string) => (/^https?:\/\//.test(p) ? p : `${SITE}${p}`);
const configured = () =>
  !!process.env.REPLICATE_API_TOKEN && !!process.env.R2_PUBLIC_BASE && !!process.env.R2_ACCESS_KEY_ID;

export function plateSlug(commonName: string): string {
  return commonName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// The Prodigi print asset for one bird at one size: a composed field-guide plate.
export async function printMasterUrl(
  imagePath: string,
  slug: string,
  common: string,
  latin: string,
  sizeId: string
): Promise<string> {
  const original = abs(imagePath);
  if (!configured()) return original;

  const r2Base = process.env.R2_PUBLIC_BASE!;
  const { w, h } = canvasDims(sizeId);
  const key = `prints/${slug}-${sizeId}.png`;
  const publicUrl = `${r2Base}/${key}`;
  try {
    if ((await fetch(publicUrl, { method: "HEAD" })).ok) return publicUrl; // cached composite
  } catch {}

  try {
    const bird = await upscaledBird(original, slug);
    const composed = await composeFieldPlate(bird, common, latin, w, h);
    await putToR2(key, composed);
    return publicUrl;
  } catch (e) {
    console.error("[print-master] failed, using original plate", e);
    return original;
  }
}

// Upscaled bird cutout, cached per bird (reused across every size).
async function upscaledBird(original: string, slug: string): Promise<Uint8Array> {
  const r2Base = process.env.R2_PUBLIC_BASE!;
  const key = `prints/_masters/${slug}.png`;
  try {
    const cached = await fetch(`${r2Base}/${key}`);
    if (cached.ok) return new Uint8Array(await cached.arrayBuffer());
  } catch {}
  const up = await replicateUpscale(original, process.env.REPLICATE_API_TOKEN!);
  const src = up ?? original;
  const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
  await putToR2(key, bytes);
  return bytes;
}

// Real-ESRGAN on Replicate — 4× upscale, no face-enhance (bird illustration, not a face).
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
  for (let i = 0; i < 40 && !["succeeded", "failed", "canceled"].includes(pred.status); i++) {
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

export async function putToR2(key: string, bytes: Uint8Array | ArrayBuffer) {
  const client = new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    region: "auto",
    service: "s3",
  });
  const endpoint =
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`;
  // R2 requires a Content-Length on PUT (no chunked transfer). undici omits it for some body
  // shapes → "R2 PUT 411". Normalize to a standalone ArrayBuffer with an explicit length so
  // the header is always present and aws4fetch signs it.
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const ab = u8.slice().buffer as ArrayBuffer; // fresh, exactly-sized standalone ArrayBuffer
  const res = await client.fetch(endpoint, {
    method: "PUT",
    body: ab,
    headers: { "content-type": "image/png", "content-length": String(u8.byteLength) },
  });
  if (!res.ok) throw new Error(`R2 PUT ${res.status}`);
}
