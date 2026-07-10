// Regenerate lib/birds.ts from the FULL flock-plates set (~10.5k plates → ~7.1k unique species),
// tagging each with region buckets (na / eu / row) from the bundled eBird region data so the store
// can offer a location filter. Preserves the existing resolved names; resolves new slugs via the
// name maps. Run: node scripts/generate-birds-v2.mjs
import fs from "fs";

const PLATES = "F:/flock-gpu/flock-plates";
const C2C = "C:/Users/Mike Doyle/fb-distill/code2common.txt";       // code|common
const S2C = "C:/Users/Mike Doyle/fb-distill/sci2code.txt";          // sci|code
const REGIONS = "C:/Users/Mike Doyle/featherbound-android/app/src/main/assets/species-seasonality-regions.json";
const EXISTING = "C:/Users/Mike Doyle/featherbound-web/lib/birds.ts";
const OUT = "C:/Users/Mike Doyle/featherbound-web/lib/birds.ts";

const slugify = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
const deslug = (slug) => {
  const out = [];
  for (const w of slug.split("-")) {
    if (w === "s" && out.length) out[out.length - 1] += "'s";
    else out.push(w.charAt(0).toUpperCase() + w.slice(1));
  }
  return out.join(" ");
};

// name maps: code->common, sci->code  =>  common<->sci
const code2common = new Map();
for (const l of fs.readFileSync(C2C, "utf8").split(/\r?\n/)) {
  const i = l.indexOf("|"); if (i < 0) continue;
  code2common.set(l.slice(0, i).trim(), l.slice(i + 1).trim());
}
const commonSlugMap = new Map();  // slug(common) -> {sci, common}
const sciSlugMap = new Map();     // slug(sci) -> {sci, common}
for (const l of fs.readFileSync(S2C, "utf8").split(/\r?\n/)) {
  const i = l.indexOf("|"); if (i < 0) continue;
  const sci = l.slice(0, i).trim(); const code = l.slice(i + 1).trim();
  const common = code2common.get(code); if (!sci || !common) continue;
  const cs = slugify(common), ss = slugify(sci);
  if (!commonSlugMap.has(cs)) commonSlugMap.set(cs, { sci, common });
  if (!sciSlugMap.has(ss)) sciSlugMap.set(ss, { sci, common });
}

// region buckets from the FULL eBird US+CA / EU country species lists (scripts/region-sci.json,
// generated via the eBird spplist API — ~1,429 NA + 1,201 EU species, not just the seasonality subset).
const regionSci = JSON.parse(fs.readFileSync("C:/Users/Mike Doyle/featherbound-web/scripts/region-sci.json", "utf8"));
const naSet = new Set(regionSci.na);
const euSet = new Set(regionSci.eu);

// existing resolved names (keep quality)
const existing = new Map(); // slug -> {sci, common}
for (const m of fs.readFileSync(EXISTING, "utf8").matchAll(/\{ sci: "([^"]*)", common: "([^"]*)", slug: "([^"]*)"/g)) {
  existing.set(m[3], { sci: m[1], common: m[2] });
}

const slugs = fs.readdirSync(PLATES).filter((f) => f.endsWith(".png")).map((f) => f.slice(0, -4));

const bySlug = [];
for (const slug of slugs) {
  let r = existing.get(slug) || commonSlugMap.get(slug) || sciSlugMap.get(slug);
  if (!r) r = { sci: "", common: deslug(slug) };
  const regions = [];
  if (r.sci) {
    if (naSet.has(r.sci)) regions.push("na");
    if (euSet.has(r.sci)) regions.push("eu");
  }
  bySlug.push({ sci: r.sci, common: r.common, slug, regions });
}

// dedupe by common name (a species can have both a common-slug and a sci-slug plate)
const seen = new Set();
const birds = [];
for (const b of bySlug.sort((a, z) => a.common.localeCompare(z.common))) {
  const key = b.common.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  birds.push(b);
}

const na = birds.filter((b) => b.regions.includes("na")).length;
const eu = birds.filter((b) => b.regions.includes("eu")).length;

const body = birds
  .map((b) => `  { sci: ${JSON.stringify(b.sci)}, common: ${JSON.stringify(b.common)}, slug: ${JSON.stringify(b.slug)}, regions: ${JSON.stringify(b.regions)} },`)
  .join("\n");

const out = `// AUTO-GENERATED from flock-plates (${slugs.length} plates → ${birds.length} unique species) + eBird
// region data. Do not edit by hand. Plate served via jsDelivr's CDN of the flock-plates GitHub repo.
// regions: "na" = North America (US/CA eBird), "eu" = Europe; empty = rest of world / unknown.
export type Region = "na" | "eu";
export type Bird = { sci: string; common: string; slug: string; regions: Region[] };

export function plateUrl(slug: string): string {
  return \`https://cdn.jsdelivr.net/gh/hexonMD/flock-plates@main/\${slug}.png\`;
}

export const BIRDS: Bird[] = [
${body}
];
`;
fs.writeFileSync(OUT, out);
console.log(`wrote ${birds.length} birds (na ${na}, eu ${eu}, other ${birds.length - na - eu})`);
