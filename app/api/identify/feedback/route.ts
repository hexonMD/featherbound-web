import { NextRequest, NextResponse } from "next/server";

// Relays the human "right / wrong -> real species" correction to the inference box, where it's stored
// next to the uploaded photo as training/eval data for the next model round.
export const runtime = "nodejs";

const INFERENCE_URL = process.env.INFERENCE_URL ?? "";
const IDENTIFY_KEY = process.env.IDENTIFY_KEY ?? "";

export async function POST(req: NextRequest) {
  if (!INFERENCE_URL) return NextResponse.json({ error: "not configured" }, { status: 503 });
  let body: { id?: string; verdict?: string; correct_sci?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!body.id || (body.verdict !== "correct" && body.verdict !== "wrong"))
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    const r = await fetch(`${INFERENCE_URL}/feedback`, {
      method: "POST",
      headers: { Authorization: `Bearer ${IDENTIFY_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: body.id, verdict: body.verdict, correct_sci: body.correct_sci ?? null }),
      signal: AbortSignal.timeout(10000),
    });
    return NextResponse.json({ ok: r.ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
