import { NextRequest, NextResponse } from "next/server";
import {
  recordRequest, recordPendingCatch, listRequests, updateRequest, REQUESTS_CONFIGURED, type RequestStatus,
} from "@/lib/birdRequests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDENTIFY_KEY = process.env.IDENTIFY_KEY || "";   // app-facing bearer (same one /api/identify uses)
const REQUEST_KEY = process.env.REQUEST_KEY || "";     // the iOS app's vision key (fbv_…) — it already holds this
const APP_KEYS = new Set([IDENTIFY_KEY, REQUEST_KEY].filter(Boolean));  // any accepted for a user request POST
const ADMIN_KEY = process.env.ADMIN_KEY || "";         // dashboard mutations; reads stay open (internal tool)
const STATUSES = new Set<RequestStatus>(["requested", "generating", "in_review", "live", "rejected"]);

function bearer(req: NextRequest): string {
  return (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

// POST /api/bird-requests  { species_sci, common_name?, user_id?, sample_photo_url?, region? }
//   Called by the app when a user requests a bird we don't have yet. Bumps the per-species count.
export async function POST(req: NextRequest) {
  if (!REQUESTS_CONFIGURED) {
    return NextResponse.json({ error: "requests not configured (SUPABASE_SERVICE_KEY missing)" }, { status: 503 });
  }
  if (APP_KEYS.size && !APP_KEYS.has(bearer(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const species_sci = String(body.species_sci ?? "").trim();
  if (!species_sci || species_sci.length > 120) {
    return NextResponse.json({ error: "species_sci required" }, { status: 400 });
  }
  const s = (v: unknown, n = 200) => (typeof v === "string" ? v.slice(0, n) : undefined);
  const uid = s(body.user_id, 120);
  const common = s(body.common_name, 120) ?? null;
  const region = s(body.region, 160) ?? null;
  const photo = /^https?:\/\//i.test(String(body.sample_photo_url ?? "")) ? String(body.sample_photo_url) : null;
  try {
    const row = await recordRequest({ species_sci, common_name: common, user_id: uid ?? null, sample_photo_url: photo, region });
    // Preserve the finder's catch so it can drop into their collection once the plate is live.
    if (uid) {
      try { await recordPendingCatch({ user_id: uid, species_sci, common_name: common, photo_url: photo, region }); }
      catch { /* best-effort; the request itself is what matters */ }
    }
    return NextResponse.json({ ok: true, request: row });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET /api/bird-requests -> { requests: [...] }  (admin dashboard read)
export async function GET() {
  if (!REQUESTS_CONFIGURED) return NextResponse.json({ requests: [], configured: false });
  try {
    return NextResponse.json({ requests: await listRequests(), configured: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/bird-requests { species_sci, status?, note? }  (admin dashboard status/notes)
export async function PATCH(req: NextRequest) {
  if (!REQUESTS_CONFIGURED) {
    return NextResponse.json({ error: "requests not configured" }, { status: 503 });
  }
  if (ADMIN_KEY && bearer(req) !== ADMIN_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const species_sci = String(body.species_sci ?? "").trim();
  if (!species_sci) return NextResponse.json({ error: "species_sci required" }, { status: 400 });
  const status = body.status as RequestStatus | undefined;
  if (status && !STATUSES.has(status)) return NextResponse.json({ error: "bad status" }, { status: 400 });
  const note = typeof body.note === "string" ? body.note : undefined;
  try {
    const row = await updateRequest(species_sci, { status, note });
    return NextResponse.json({ ok: true, request: row });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
