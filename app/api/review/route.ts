import { NextRequest, NextResponse } from "next/server";
import { getReviewState, setReviewEntry, type ReviewStatus } from "@/lib/reviewStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET  /api/review            -> { state: { slug: {status,note,by,at} } }
// POST /api/review {slug,status?,note?,source?,pick?,pickNote?,by}  -> upsert one slug's review entry
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
  // Pick mode: `pick` = candidate id | "current" | "none"; null/"" clears the pick (and its note).
  let pick: string | null | undefined;
  if (body.pick === null || body.pick === "") pick = null;
  else if (typeof body.pick === "string" && /^[a-z0-9_-]{1,40}$/i.test(body.pick)) pick = body.pick;
  else pick = undefined;
  const pickNote = typeof body.pickNote === "string" ? body.pickNote.slice(0, 2000) : undefined;
  // M/F labelling: sex = m|f|s|x, null/"" clears. Female lane pick mirrors pick/pickNote.
  let sex: "m" | "f" | "s" | "x" | null | undefined;
  if (body.sex === null || body.sex === "") sex = null;
  else if (body.sex === "m" || body.sex === "f" || body.sex === "s" || body.sex === "x") sex = body.sex;
  else sex = undefined;
  let fpick: string | null | undefined;
  if (body.fpick === null || body.fpick === "") fpick = null;
  else if (typeof body.fpick === "string" && /^[a-z0-9_-]{1,40}$/i.test(body.fpick)) fpick = body.fpick;
  else fpick = undefined;
  const fpickNote = typeof body.fpickNote === "string" ? body.fpickNote.slice(0, 2000) : undefined;
  try {
    const entry = await setReviewEntry(slug, { status, note, by, source, pick, pickNote, sex, fpick, fpickNote });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
