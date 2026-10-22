import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/candidates[?lane=female] -> the plate-candidate manifest written by fb-distill
// (gen_candidates.py -> manifest.json; gen_female_candidates.py -> female-manifest.json), shape
// {meta, species: {slug: [{id,url,seed,prompt_variant,model,ref,prompt}]}}. Proxied server-side so
// the browser doesn't need CORS on the media bucket; module-cached briefly because a generation run
// re-uploads it every few minutes.
const KEYS = { main: "plate-candidates/manifest.json", female: "plate-candidates/female-manifest.json" } as const;
const cache: Partial<Record<keyof typeof KEYS, { at: number; body: unknown }>> = {};
const TTL = 30_000;

export async function GET(req: NextRequest) {
  const lane = req.nextUrl.searchParams.get("lane") === "female" ? "female" : "main";
  const hit = cache[lane];
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json(hit.body);
  const base = process.env.R2_PUBLIC_BASE || "https://media.featherbound.app";
  try {
    const res = await fetch(`${base}/${KEYS[lane]}`, { cache: "no-store" });
    if (res.status === 404) return NextResponse.json({ meta: null, species: {} });
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    const body = await res.json();
    cache[lane] = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch (e) {
    if (hit) return NextResponse.json(hit.body);
    return NextResponse.json({ meta: null, species: {}, error: String(e) }, { status: 502 });
  }
}
