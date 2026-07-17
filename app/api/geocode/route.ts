import { NextRequest, NextResponse } from "next/server";

// Turn coordinates <-> a human place (state/province, country) so the /identify page never shows raw
// lat/long. Reverse: coords -> "City, Province, Country". Forward: typed place -> coords. Uses OSM
// Nominatim (free, no key); low-volume beta use with a proper UA. lat/lon stay the source of truth
// for the model — this is just the human label.
export const runtime = "nodejs";

const UA = "FeatherBound/1.0 (https://featherbound.app; bird identify)";

function placeFrom(addr: Record<string, string> | undefined): string {
  if (!addr) return "";
  const locality = addr.city || addr.town || addr.village || addr.county || "";
  const region = addr.state || addr.province || addr.region || "";
  const country = addr.country || "";
  return [locality, region, country].filter(Boolean).join(", ");
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("mode");
  try {
    if (mode === "reverse") {
      const lat = sp.get("lat");
      const lon = sp.get("lon");
      if (!lat || !lon) return NextResponse.json({ error: "lat/lon required" }, { status: 400 });
      const u = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json&zoom=8&addressdetails=1`;
      const r = await fetch(u, { headers: { "User-Agent": UA, "Accept-Language": "en" }, signal: AbortSignal.timeout(8000) });
      const j = await r.json();
      return NextResponse.json({ place: placeFrom(j.address) || j.display_name || "" });
    }
    if (mode === "forward") {
      const q = (sp.get("q") || "").trim();
      if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
      const u = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&addressdetails=1`;
      const r = await fetch(u, { headers: { "User-Agent": UA, "Accept-Language": "en" }, signal: AbortSignal.timeout(8000) });
      const arr = await r.json();
      if (!Array.isArray(arr) || !arr.length) return NextResponse.json({ error: "not found" }, { status: 404 });
      const hit = arr[0];
      return NextResponse.json({
        lat: parseFloat(hit.lat),
        lon: parseFloat(hit.lon),
        place: placeFrom(hit.address) || hit.display_name || q,
      });
    }
    return NextResponse.json({ error: "bad mode" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "geocoder unavailable" }, { status: 502 });
  }
}
