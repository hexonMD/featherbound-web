import { NextRequest, NextResponse } from "next/server";
import { getSexPhotosBatch } from "@/lib/sexPhotos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/sexphotos { scis: string[] } -> { photos: { "<scientific>": { m: [...], f: [...] } } }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const scis = Array.isArray(body.scis) ? body.scis.map(String).filter(Boolean) : [];
  if (scis.length === 0) return NextResponse.json({ photos: {} });
  return NextResponse.json({ photos: await getSexPhotosBatch(scis) });
}
