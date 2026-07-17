import { NextRequest, NextResponse } from "next/server";

// Server-side proxy to the FeatherBound inference service (the new clean regional model). The model
// weights live on a private GPU box and NEVER leave it — the browser only ever sees top-k names, and
// only this route (holding the bearer key) can reach the service. Per-IP rate limiting is the guard
// against model-extraction / distillation (mass-querying to clone the outputs).
export const runtime = "nodejs";
export const maxDuration = 30;

const INFERENCE_URL = process.env.INFERENCE_URL ?? "";
const IDENTIFY_KEY = process.env.IDENTIFY_KEY ?? "";
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const WINDOW_MS = 10 * 60 * 1000; // 10 min
const MAX_PER_WINDOW = 25; // per IP

const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return false;
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff ? xff.split(",")[0] : req.headers.get("x-real-ip") ?? "unknown").trim();
}

export async function POST(req: NextRequest) {
  if (!INFERENCE_URL) return NextResponse.json({ error: "not configured" }, { status: 503 });
  if (rateLimited(clientIp(req)))
    return NextResponse.json({ error: "Too many identifications — take a breather and try again shortly." }, { status: 429 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const file = form.get("file");
  const lat = form.get("lat");
  const lon = form.get("lon");
  if (!(file instanceof File)) return NextResponse.json({ error: "no photo" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "photo too large (max 12 MB)" }, { status: 413 });
  if (lat == null || lon == null) return NextResponse.json({ error: "location required" }, { status: 400 });

  const out = new FormData();
  out.set("file", file, "photo.jpg");
  out.set("lat", String(lat));
  out.set("lon", String(lon));

  try {
    const r = await fetch(`${INFERENCE_URL}/identify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${IDENTIFY_KEY}` },
      body: out,
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) return NextResponse.json({ error: "identify failed" }, { status: 502 });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ error: "the identifier is offline right now — try again in a bit" }, { status: 502 });
  }
}
