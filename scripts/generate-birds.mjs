import fs from "fs";
const D = "C:/Users/MIKEDO~1/AppData/Local/Temp/claude/C--Users-Mike-Doyle-Campmatch/b1529418-e838-4273-85fe-8f3114b030e5/scratchpad/fb-feat";
const OUT = "C:/Users/Mike Doyle/featherbound-web/lib/birds.ts";

// Match the app's PlateArt.slug EXACTLY: lowercase, keep Unicode letters/numbers (accents
// survive), non-alphanumeric runs → single dash, trim dashes.
const slugify = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");

const deslug = (slug) => {
  const out = [];
  for (const w of slug.split("-")) {
    if (w === "s" && out.length) out[out.length - 1] += "'s"; // cooper-s-hawk → Cooper's Hawk
    else out.push(w.charAt(0).toUpperCase() + w.slice(1));
  }
  return out.join(" ");
};

// Only top-level plates are bird species; subfolders (badges/…) are app art, not for sale.
const plateSlugs = fs.readFileSync(`${D}/plate-slugs.txt`, "utf8")
  .split(/\r?\n/).filter(Boolean)
  .filter((p) => !p.includes("/"))
  .map((p) => p.replace(/\.png$/, ""));

// Two indexes: by common-name slug, and by scientific-name slug (some plates are named after
// the sci name — resolve those back to the real common name).
// Gemini-resolved common names for slugs named after old/synonym scientific names.
const overrides = JSON.parse(fs.readFileSync(`${D}/name-overrides.json`, "utf8"));
const byCommonSlug = new Map();
const bySciSlug = new Map();
for (const line of fs.readFileSync(`${D}/common-names.txt`, "utf8").split(/\r?\n/)) {
  const i = line.indexOf("_");
  if (i < 0) continue;
  const sci = line.slice(0, i).trim();
  const common = line.slice(i + 1).trim();
  if (!sci || !common) continue;
  const cs = slugify(common), ss = slugify(sci);
  if (!byCommonSlug.has(cs)) byCommonSlug.set(cs, { sci, common });
  if (!bySciSlug.has(ss)) bySciSlug.set(ss, { sci, common });
}

// A sci-named plate may carry a subspecies (3rd token) — try the full sci-slug, then drop
// trailing tokens down to genus+species, so "anas-platyrhynchos-domesticus" → Mallard.
function matchSci(slug) {
  const toks = slug.split("-");
  for (let n = toks.length; n >= 2; n--) {
    const e = bySciSlug.get(toks.slice(0, n).join("-"));
    if (e) return e;
  }
  return undefined;
}

let viaCommon = 0, viaSci = 0, viaDeslug = 0;
const bySlug = new Map();
for (const slug of plateSlugs) {
  let e = byCommonSlug.get(slug);
  if (e) viaCommon++;
  else if ((e = matchSci(slug))) viaSci++;
  if (e) bySlug.set(slug, { sci: e.sci, common: e.common, slug });
  else { bySlug.set(slug, { sci: "", common: overrides[slug] || deslug(slug), slug }); viaDeslug++; }
}

const birds = [...bySlug.values()].sort((a, b) => a.common.localeCompare(b.common));
const body =
  `// AUTO-GENERATED from flock-plates (${plateSlugs.length} plates) + common-names.txt. Do not edit by hand.\n` +
  `// Each bird's ink-and-watercolour plate is the print asset, served via jsDelivr's CDN of\n` +
  `// the flock-plates GitHub repo. Slug = lowercase common name (matches the app's PlateArt.slug).\n` +
  `export type Bird = { sci: string; common: string; slug: string };\n\n` +
  `export function plateUrl(slug: string): string {\n` +
  `  return \`https://cdn.jsdelivr.net/gh/hexonMD/flock-plates@main/\${slug}.png\`;\n` +
  `}\n\n` +
  `export const BIRDS: Bird[] = [\n` +
  birds.map((b) => `  { sci: ${JSON.stringify(b.sci)}, common: ${JSON.stringify(b.common)}, slug: ${JSON.stringify(b.slug)} },`).join("\n") +
  `\n];\n`;
fs.writeFileSync(OUT, body);

console.log(`${birds.length} birds → common-name match: ${viaCommon}, sci-name match: ${viaSci}, de-slug fallback: ${viaDeslug}`);
console.log("sample fallbacks:", [...bySlug.values()].filter((b) => !b.sci).slice(0, 12).map((b) => b.slug));
