import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { join } from "path";

// Composes a bird plate onto a portrait "field-guide plate" layout at the print's exact
// aspect ratio — bird up top on its own cream field, double-line frame, species name + Latin,
// and a footer wordmark. This is what turns the landscape-plate / portrait-print mismatch
// into the aesthetic (see the approved mock). Deterministic; runs at order time.

let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  GlobalFonts.registerFromPath(join(process.cwd(), "public/fonts/Lora.ttf"), "Lora");
  GlobalFonts.registerFromPath(join(process.cwd(), "public/fonts/Lora-Italic.ttf"), "Lora Italic");
  fontsReady = true;
}

export async function composeFieldPlate(
  birdPng: Buffer | Uint8Array,
  common: string,
  latin: string,
  W: number,
  H: number
): Promise<Buffer> {
  ensureFonts();
  const bird = await loadImage(birdPng);
  const S = W / 1600; // proportions authored at 1600px wide, scale to any size

  // The plates are transparent ink-and-watercolour cutouts, so the bird sits directly on the
  // field-guide cream — matched to the plates that DO carry a baked cream bg, so both blend.
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f6efd8";
  ctx.fillRect(0, 0, W, H);

  const INK = "#2e271d", MUT = "#6b6150", LINE = "#3a2f26";

  // double-line frame
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 4 * S;
  ctx.strokeRect(70 * S, 70 * S, W - 140 * S, H - 140 * S);
  ctx.lineWidth = 2 * S;
  ctx.strokeRect(92 * S, 92 * S, W - 184 * S, H - 184 * S);

  // bird sized to the frame width with margin
  const bw = W - 300 * S;
  const bh = bird.height * (bw / bird.width);

  const nameSize = Math.round(104 * S);
  const latSize = Math.round(60 * S);
  const RULE_GAP = 130 * S, RULE_TO_NAME = 74 * S, NAME_TO_LAT = 150 * S;
  const hasLatin = !!latin;
  const blockH =
    bh + RULE_GAP + RULE_TO_NAME + nameSize + (hasLatin ? NAME_TO_LAT + latSize : 0);
  const top = 150 * S, bottom = H - 240 * S;
  const by = top + ((bottom - top) - blockH) / 2;

  ctx.drawImage(bird, (W - bw) / 2, by, bw, bh);

  const ry = by + bh + RULE_GAP;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3 * S;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 90 * S, ry);
  ctx.lineTo(W / 2 + 90 * S, ry);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = INK;
  ctx.font = `bold ${nameSize}px Lora`;
  ctx.fillText(common, W / 2, ry + RULE_TO_NAME);
  if (hasLatin) {
    ctx.fillStyle = MUT;
    ctx.font = `${latSize}px "Lora Italic"`;
    ctx.fillText(latin, W / 2, ry + RULE_TO_NAME + nameSize + NAME_TO_LAT);
  }

  ctx.fillStyle = MUT;
  ctx.font = `${Math.round(34 * S)}px Lora`;
  ctx.fillText("F E A T H E R B O U N D   ·   F I E L D   G U I D E", W / 2, H - 178 * S);

  return canvas.toBuffer("image/png");
}

// Print dimensions (px) for a size id like "16x24" — inches × DPI, capped so 24×36 stays sane.
export function canvasDims(sizeId: string, dpi = 150): { w: number; h: number } {
  const m = /^(\d+)x(\d+)$/.exec(sizeId);
  const [wi, hi] = m ? [Number(m[1]), Number(m[2])] : [16, 24];
  const scale = Math.min(1, 5400 / (Math.max(wi, hi) * dpi));
  return { w: Math.round(wi * dpi * scale), h: Math.round(hi * dpi * scale) };
}
