import { composeFieldPlate, canvasDims } from "@/lib/fieldplate";

// TEMP smoke test — confirms @napi-rs/canvas + Lora render on the server. Remove after.
export const runtime = "nodejs";

export async function GET() {
  const bird = new Uint8Array(
    await (
      await fetch("https://cdn.jsdelivr.net/gh/hexonMD/flock-plates@main/american-robin.png")
    ).arrayBuffer()
  );
  const { w, h } = canvasDims("16x24");
  const png = await composeFieldPlate(bird, "American Robin", "Turdus migratorius", w, h);
  return new Response(new Uint8Array(png), { headers: { "content-type": "image/png" } });
}
