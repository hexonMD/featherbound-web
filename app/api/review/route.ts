import { NextRequest, NextResponse } from "next/server";
import { getReviewState, setReviewEntry, type ReviewStatus } from "@/lib/reviewStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET  /api/review            -> { state: { slug: {status,note,by,at} } }
// POST /api/review {slug,status?,note?,by}  -> upsert one slug's review entry
export async function GET() {
  const state = await getReviewState();
  return NextResponse.json({ state });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const slug = String(body.slug ?? "").trim();
  if (!slug || slug.length > 120) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  let status: ReviewStatus | null | undefined;
  if (body.status === "checked" || body.status === "failed") status = body.status;
  else if (body.status === null || body.status === "unchecked") status = null;
  else status = undefined;
  const note = typeof body.note === "string" ? body.note.slice(0, 2000) : undefined;
  const by = typeof body.by === "string" ? body.by.slice(0, 60) : undefined;
  // `source` = picked reference URL to redraw from; empty string clears it. Only accept http(s).
  let source: string | null | undefined;
  if (body.source === null || body.source === "") source = null;
  else if (typeof body.source === "string" && /^https?:\/\//i.test(body.source)) source = body.source;
  else source = undefined;
  try {
    const entry = await setReviewEntry(slug, { status, note, by, source });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
