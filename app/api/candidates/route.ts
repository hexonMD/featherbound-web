import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/candidates -> the plate-candidate manifest written by fb-distill/gen_candidates.py
// ({meta, species: {slug: [{id,url,seed,prompt_variant,model,ref,prompt}]}}). Proxied server-side so
// the browser doesn't need CORS on the media bucket; module-cached briefly because an overnight
// generation run re-uploads it every few minutes.
const KEY = "plate-candidates/manifest.json";
let cache: { at: number; body: unknown } | null = null;
const TTL = 30_000;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) return NextResponse.json(cache.body);
  const base = process.env.R2_PUBLIC_BASE || "https://media.featherbound.app";
  try {
    const res = await fetch(`${base}/${KEY}`, { cache: "no-store" });
    if (res.status === 404) return NextResponse.json({ meta: null, species: {} });
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    const body = await res.json();
    cache = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch (e) {
    if (cache) return NextResponse.json(cache.body);
    return NextResponse.json({ meta: null, species: {}, error: String(e) }, { status: 502 });
  }
}
