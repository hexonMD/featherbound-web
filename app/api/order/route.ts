import { NextRequest, NextResponse } from "next/server";
import { artworks } from "@/lib/data";

// Server-side print ordering. The Prodigi key lives ONLY in env (PRODIGI_API_KEY) and is
// never exposed to the browser. Full flow (to wire next): Stripe Checkout for payment →
// webhook → createProdigiOrder() (see lib/prodigi.ts). Payment isn't connected yet, so
// this returns a friendly placeholder.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const id = String(form.get("artworkId") ?? "");
  const art = artworks.find((a) => a.id === id);
  if (!art) return NextResponse.json({ error: "unknown artwork" }, { status: 404 });

  return new NextResponse(
    `<!doctype html><html><body style="font-family:Georgia,serif;background:#f0e4cb;color:#2c271d;text-align:center;padding:90px 24px">
       <h1 style="font-size:34px">Checkout coming soon</h1>
       <p style="color:#6b6150;max-width:460px;margin:14px auto 0;line-height:1.5">
         Print ordering for <b>${art.speciesCommon}</b> is being wired up (payment and fulfilment). It will be live shortly.
       </p>
       <p style="margin-top:26px"><a href="/#prints" style="color:#3f6d5a;font-weight:700">Back to prints</a></p>
     </body></html>`,
    { headers: { "content-type": "text/html" } }
  );
}
