import { NextRequest, NextResponse } from "next/server";
import { getRefPhotosBatch } from "@/lib/refPhotos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/refphotos { scis: string[] } -> { photos: { "<scientific>": [{u,a,l,s,st}] } }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const scis = Array.isArray(body.scis) ? body.scis.map(String).filter(Boolean) : [];
  if (scis.length === 0) return NextResponse.json({ photos: {} });
  const photos = await getRefPhotosBatch(scis);
  return NextResponse.json({ photos });
}
