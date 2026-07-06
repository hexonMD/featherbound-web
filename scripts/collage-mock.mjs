// Self-contained proof of the collection collage (mirrors lib/collage.ts).
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

GlobalFonts.registerFromPath(join(process.cwd(), "public/fonts/Lora.ttf"), "Lora");
GlobalFonts.registerFromPath(join(process.cwd(), "public/fonts/Lora-Italic.ttf"), "Lora Italic");

const cols = (n) => (n <= 6 ? 2 : n <= 12 ? 3 : n <= 24 ? 4 : 5);

async function composeCollage(birds, title, W, H) {
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
    const inRow = Math.min(nc, n - r * nc);
    const rowInset = ((nc - inRow) * cellW) / 2;
    const cx = gridLeft + rowInset + c * cellW + cellW / 2;
    const cy = gridTop + r * cellH;
    const img = imgs[i];
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
      ctx.fillText(birds[i].area, cx, ty, cellW * 0.94);
    }
  }

  ctx.fillStyle = MUT;
  ctx.font = `${Math.round(28 * S)}px Lora`;
  ctx.fillText("F E A T H E R B O U N D   ·   F I E L D   G U I D E", W / 2, H - 132 * S);
  return canvas.toBuffer("image/png");
}

const plate = (slug) => `https://cdn.jsdelivr.net/gh/hexonMD/flock-plates@main/${slug}.png`;
// 11 birds → tests the centered short final row; areas included
const sample = [
  ["american-robin", "American Robin", "May 2, 2026", "Beacon Hill Park"],
  ["northern-cardinal", "Northern Cardinal", "May 4, 2026", "Back garden"],
  ["blue-jay", "Blue Jay", "May 9, 2026", "Mount Douglas"],
  ["american-goldfinch", "American Goldfinch", "May 12, 2026", "Swan Lake"],
  ["black-capped-chickadee", "Black-capped Chickadee", "May 15, 2026", "Goldstream Park"],
  ["baltimore-oriole", "Baltimore Oriole", "May 21, 2026", "Elk Lake"],
  ["eastern-bluebird", "Eastern Bluebird", "May 24, 2026", "Cordova Bay"],
  ["cedar-waxwing", "Cedar Waxwing", "Jun 1, 2026", "Thetis Lake"],
  ["ruby-throated-hummingbird", "Ruby-throated Hummingbird", "Jun 6, 2026", "Back garden"],
  ["downy-woodpecker", "Downy Woodpecker", "Jun 9, 2026", "Francis King Park"],
  ["red-winged-blackbird", "Red-winged Blackbird", "Jun 14, 2026", "Swan Lake"],
];

async function grab(slug) {
  const r = await fetch(plate(slug));
  if (!r.ok) throw new Error(`${slug} ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

const birds = [];
for (const [slug, name, date, area] of sample) {
  try {
    birds.push({ name, date, area, image: await grab(slug) });
    process.stdout.write(".");
  } catch {
    process.stdout.write("x");
  }
}
console.log(`\n${birds.length} plates`);
writeFileSync("./collage-mock.png", await composeCollage(birds, "Mike's Field Guide", 1600, 2400));
console.log("wrote collage-mock.png");
