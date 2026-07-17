import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side image proxy for the plate-review page. Some reference-photo hosts (BioDivLibrary,
// a few iNat CDNs) block hotlinking from the browser even with a no-referrer policy; fetching them
// server-side and streaming the bytes back sidesteps referrer/CORS blocks so no tile is broken.
// Internal QA tool; only proxies http(s) image URLs and only used as an on-error fallback.
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u || !/^https?:\/\//i.test(u)) return new NextResponse("bad url", { status: 400 });
  try {
    const res = await fetch(u, {
      headers: { "user-agent": "FeatherBound/1.0 (+https://featherbound.app)", accept: "image/*,*/*" },
      cache: "no-store",
    });
    if (!res.ok) return new NextResponse(`upstream ${res.status}`, { status: 502 });
    const ct = res.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) return new NextResponse("not an image", { status: 415 });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: { "content-type": ct, "cache-control": "public, max-age=86400, immutable" },
    });
  } catch {
    return new NextResponse("fetch failed", { status: 502 });
  }
}
