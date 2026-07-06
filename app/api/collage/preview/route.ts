import { NextRequest, NextResponse } from "next/server";
import { parseCollageSpec, composeCollagePreview } from "@/lib/collage";

// In-app preview of a collection collage. The app POSTs the selected birds + title + size;
// we render the same field-guide layout (scaled down for speed) and return the PNG so the
// user sees the real print before paying. No upload, no Stripe — just pixels.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const { spec, error } = parseCollageSpec(raw);
  if (!spec) return NextResponse.json({ error }, { status: 400 });

  try {
    const png = await composeCollagePreview(spec);
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: { "content-type": "image/png", "cache-control": "no-store" },
    });
  } catch (e) {
    console.error("[collage/preview] compose failed", e);
    return NextResponse.json({ error: "could not render preview" }, { status: 502 });
  }
}
