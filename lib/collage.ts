import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { join } from "path";
import { plateUrl } from "./birds";
import { canvasDims } from "./fieldplate";
import { putToR2 } from "./upscale";
import { resolveArtwork } from "./data";
import { MAX_COLLAGE_BIRDS, MIN_COLLAGE_BIRDS, printSizeById } from "./products";

// A personalized "collection" print: the birds a user collected, laid out as a field-guide
// page — each plate in a grid cell with its common name + seen date, framed, with an editable
// title. Same canvas + Lora setup as lib/fieldplate.ts; the collage is what makes low-res
// plates a non-issue (small grid cells).

let ready = false;
function fonts() {
  if (ready) return;
  GlobalFonts.registerFromPath(join(process.cwd(), "public/fonts/Lora.ttf"), "Lora");
  GlobalFonts.registerFromPath(join(process.cwd(), "public/fonts/Lora-Italic.ttf"), "Lora Italic");
  ready = true;
}

export type CollageBird = {
  name: string;
  date: string;
  area?: string; // where they found it — optional, rendered under the date
  image: Buffer | Uint8Array;
};

function cols(n: number): number {
  return n <= 6 ? 2 : n <= 12 ? 3 : n <= 24 ? 4 : 5;
}

export async function composeCollage(
  birds: CollageBird[],
  title: string,
  W: number,
  H: number
): Promise<Buffer> {
  fonts();
  const S = W / 1600;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const INK = "#2e271d", MUT = "#6b6150", LINE = "#3a2f26";

  ctx.fillStyle = "#f6efd8";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 4 * S;
  ctx.strokeRect(70 * S, 70 * S, W - 140 * S, H - 140 * S);
  ctx.lineWidth = 2 * S;
  ctx.strokeRect(92 * S, 92 * S, W - 184 * S, H - 184 * S);

  // title + count
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK;
  ctx.font = `bold ${Math.round(64 * S)}px Lora`;
  ctx.fillText(title, W / 2, 150 * S);
  ctx.fillStyle = MUT;
  ctx.font = `italic ${Math.round(34 * S)}px "Lora Italic"`;
  ctx.fillText(`${birds.length} species collected`, W / 2, 232 * S);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2 * S;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 110 * S, 300 * S);
  ctx.lineTo(W / 2 + 110 * S, 300 * S);
  ctx.stroke();

  // grid
  const n = birds.length;
  const nc = cols(n);
  const nr = Math.ceil(n / nc);
  const gridTop = 360 * S, gridBottom = H - 170 * S, gridLeft = 150 * S, gridRight = W - 150 * S;
  const cellW = (gridRight - gridLeft) / nc, cellH = (gridBottom - gridTop) / nr;

  const imgs = await Promise.all(birds.map((b) => loadImage(b.image)));
  const nameSize = Math.max(18, Math.round(cellH * 0.072));
  const dateSize = Math.max(14, Math.round(cellH * 0.05));

  for (let i = 0; i < n; i++) {
    const c = i % nc, r = Math.floor(i / nc);
    // center any short final row so odd counts don't leave a lopsided gap
    const inRow = Math.min(nc, n - r * nc);
    const rowInset = ((nc - inRow) * cellW) / 2;
    const cx = gridLeft + rowInset + c * cellW + cellW / 2;
    const cy = gridTop + r * cellH;
    const img = imgs[i];

    // plate fits the upper part of the cell, bottom-anchored above the label
    const imgBottom = cy + cellH * 0.6;
    const maxW = cellW * 0.86, maxH = cellH * 0.52;
    const sc = Math.min(maxW / img.width, maxH / img.height);
    const iw = img.width * sc, ih = img.height * sc;
    ctx.drawImage(img, cx - iw / 2, imgBottom - ih, iw, ih);

    let ty = cy + cellH * 0.64;
    ctx.fillStyle = INK;
    ctx.font = `bold ${nameSize}px Lora`;
    ctx.fillText(birds[i].name, cx, ty, cellW * 0.94);
    ty += nameSize * 1.3;
    ctx.fillStyle = MUT;
    ctx.font = `italic ${dateSize}px "Lora Italic"`;
    ctx.fillText(birds[i].date, cx, ty, cellW * 0.94);
    if (birds[i].area) {
      ty += dateSize * 1.3;
      ctx.font = `${dateSize}px Lora`;
      ctx.fillText(birds[i].area!, cx, ty, cellW * 0.94);
    }
  }

  ctx.fillStyle = MUT;
  ctx.font = `${Math.round(28 * S)}px Lora`;
  ctx.fillText("F E A T H E R B O U N D   ·   F I E L D   G U I D E", W / 2, H - 132 * S);

  return canvas.toBuffer("image/png");
}

// ── Ordering: a collage from a client spec (app sends the selected birds) ─────────
// One entry per selected bird. `slug` (resolved from the app's sci/name) picks the plate off
// the flock-plates CDN; the rest are what the user recorded (common name, seen date, area).
export type CollageSpecBird = { slug: string; name: string; date: string; area?: string };
export type CollageSpec = { birds: CollageSpecBird[]; title: string; sizeId: string };

// Validate + normalize an untrusted client spec (the app POSTs this). Returns a clean spec
// or an error string. Caps the bird count at MAX (one-sheet legibility) and requires MIN.
export function parseCollageSpec(raw: unknown): { spec?: CollageSpec; error?: string } {
  const body = (raw ?? {}) as Record<string, unknown>;
  const birdsIn = Array.isArray(body.birds) ? body.birds : null;
  if (!birdsIn) return { error: "birds required" };
  const birds: CollageSpecBird[] = [];
  const seen = new Set<string>();
  for (const b of birdsIn) {
    const o = (b ?? {}) as Record<string, unknown>;
    // The app sends its species keys (sci name preferred, common as fallback); we resolve to
    // the canonical flock-plate slug so a print always maps to a real plate on the CDN.
    const sci = typeof o.sci === "string" ? o.sci.trim() : "";
    const rawName = typeof o.name === "string" ? o.name.trim() : "";
    const date = typeof o.date === "string" ? o.date.trim() : "";
    const art = resolveArtwork(sci || rawName || "");
    if (!art || seen.has(art.slug)) continue; // skip unmatched / duplicate species
    seen.add(art.slug);
    const name = (rawName || art.speciesCommon).slice(0, 60);
    const area = typeof o.area === "string" && o.area.trim() ? o.area.trim().slice(0, 60) : undefined;
    birds.push({ slug: art.slug, name, date: date.slice(0, 40), area });
  }
  if (birds.length < MIN_COLLAGE_BIRDS)
    return { error: `pick at least ${MIN_COLLAGE_BIRDS} birds` };
  if (birds.length > MAX_COLLAGE_BIRDS)
    return { error: `a single field guide holds up to ${MAX_COLLAGE_BIRDS} birds` };

  const title =
    (typeof body.title === "string" && body.title.trim() ? body.title.trim() : "My Field Guide").slice(0, 60);
  const sizeId = printSizeById(typeof body.sizeId === "string" ? body.sizeId : "").id;
  return { spec: { birds, title, sizeId } };
}

// Preview render: same layout, scaled to a screen-friendly width (fast, small payload).
export async function composeCollagePreview(spec: CollageSpec, previewW = 1000): Promise<Buffer> {
  const { w, h } = canvasDims(spec.sizeId);
  const pw = previewW;
  const ph = Math.round((h / w) * pw);
  const birds: CollageBird[] = await Promise.all(
    spec.birds.map(async (b) => {
      const res = await fetch(plateUrl(b.slug));
      if (!res.ok) throw new Error(`plate ${b.slug} ${res.status}`);
      return { name: b.name, date: b.date, area: b.area, image: Buffer.from(await res.arrayBuffer()) };
    })
  );
  return composeCollage(birds, spec.title, pw, ph);
}

// Deterministic key so the same order composes once (preview + checkout + re-order agree).
function specHash(spec: CollageSpec): string {
  const s = JSON.stringify([
    spec.sizeId,
    spec.title,
    spec.birds.map((b) => [b.slug, b.name, b.date, b.area ?? ""]),
  ]);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// Fetch each bird's plate and compose the collage at the ordered size's print resolution.
export async function composeCollageFromSpec(spec: CollageSpec): Promise<Buffer> {
  const { w, h } = canvasDims(spec.sizeId);
  const birds: CollageBird[] = await Promise.all(
    spec.birds.map(async (b) => {
      const res = await fetch(plateUrl(b.slug));
      if (!res.ok) throw new Error(`plate ${b.slug} ${res.status}`);
      return {
        name: b.name,
        date: b.date,
        area: b.area,
        image: Buffer.from(await res.arrayBuffer()),
      };
    })
  );
  return composeCollage(birds, spec.title, w, h);
}

// Compose + upload to R2, returning the public print-asset URL. Cached by spec hash so a
// repeat of the same selection is a HEAD hit, not a re-compose. Requires R2 env; the caller
// guards on that (a collage has no single-plate fallback — it must be composed).
export async function printCollageUrl(spec: CollageSpec): Promise<string> {
  const r2Base = process.env.R2_PUBLIC_BASE!;
  const key = `collages/${specHash(spec)}.png`;
  const publicUrl = `${r2Base}/${key}`;
  try {
    if ((await fetch(publicUrl, { method: "HEAD" })).ok) return publicUrl;
  } catch {}
  const png = await composeCollageFromSpec(spec);
  await putToR2(key, png);
  return publicUrl;
}
