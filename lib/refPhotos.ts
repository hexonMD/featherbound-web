import fs from "fs";
import path from "path";

// Reference photos for the plate-review page. Prefers our clean, attributed pull
// (public/ref-photos.json, built by fb-distill/build_ref_manifest.py). Where that has nothing —
// mostly common species that were already well-covered before the under-150 pulls — it falls back
// to iNaturalist's taxon photos, which carry their own attribution. Internal QA tool only.

export type RefPhoto = { u: string; a: string; l: string; s?: string; st?: string };

type Manifest = Record<string, RefPhoto[]>;
let manifest: Manifest | null = null;
const inatCache = new Map<string, RefPhoto[]>();      // per-process cache; iNat is slow + rate-limited

function loadManifest(): Manifest {
  if (manifest) return manifest;
  try {
    const p = path.join(process.cwd(), "public", "ref-photos.json");
    manifest = JSON.parse(fs.readFileSync(p, "utf-8")) as Manifest;
  } catch {
    manifest = {};
  }
  return manifest;
}

function licLabel(code: string | null | undefined): string {
  const c = (code || "").toLowerCase();
  if (c === "cc0" || c === "pd") return "CC0";
  if (c === "cc-by-sa") return "CC BY-SA";
  if (c === "cc-by-nd") return "CC BY-ND";
  if (c === "cc-by-nc" || c === "cc-by-nc-sa" || c === "cc-by-nc-nd") return "CC BY-NC";
  if (c === "cc-by") return "CC BY";
  return code ? code.toUpperCase() : "all rights reserved";
}

// Strip HTML/entities iNat sometimes embeds in the attribution string.
function cleanAttr(s: string | undefined): string {
  if (!s) return "iNaturalist";
  const noTags = s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim();
  // e.g. "(c) Jane Doe, some rights reserved (CC BY)" -> "Jane Doe"
  const m = noTags.match(/(?:\(c\)|©)?\s*([^,]+?),?\s*(?:some|all|no) rights/i);
  return (m ? m[1] : noTags).replace(/^\(c\)\s*/i, "").trim() || "iNaturalist";
}

async function fromINat(sci: string): Promise<RefPhoto[]> {
  if (inatCache.has(sci)) return inatCache.get(sci)!;
  let out: RefPhoto[] = [];
  try {
    const ctrl = AbortSignal.timeout(7000);
    const sr = await fetch(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sci)}&rank=species&per_page=1`,
      { signal: ctrl },
    ).then((r) => r.json());
    const t = sr?.results?.[0];
    if (t?.id) {
      const dr = await fetch(`https://api.inaturalist.org/v1/taxa/${t.id}`, {
        signal: AbortSignal.timeout(7000),
      }).then((r) => r.json());
      const tp = dr?.results?.[0]?.taxon_photos || [];
      out = (tp
        .map((x: { photo?: { medium_url?: string; url?: string; attribution?: string; license_code?: string } }) => {
          const ph = x.photo || {};
          const u = ph.medium_url || ph.url;
          if (!u) return null;
          const l = licLabel(ph.license_code);
          if (!l.startsWith("CC")) return null;   // drop all-rights-reserved / unlicensed
          return { u, a: cleanAttr(ph.attribution), l, s: "inat" } as RefPhoto;
        })
        .filter(Boolean) as RefPhoto[]);
      // non-commercial last (still shown — this is QA, not distribution)
      out.sort((a, b) => (a.l.includes("NC") ? 1 : 0) - (b.l.includes("NC") ? 1 : 0));
      out = out.slice(0, 6);
      if (out.length === 0 && t.default_photo?.medium_url) {
        const dl = licLabel(t.default_photo.license_code);
        if (dl.startsWith("CC")) {
          out = [{ u: t.default_photo.medium_url, a: cleanAttr(t.default_photo.attribution), l: dl, s: "inat" }];
        }
      }
    }
  } catch {
    out = [];
  }
  inatCache.set(sci, out);
  return out;
}

export async function getRefPhotos(sci: string): Promise<RefPhoto[]> {
  const m = loadManifest();
  const clean = m[sci];
  if (clean && clean.length) return clean;
  return fromINat(sci);
}

export async function getRefPhotosBatch(scis: string[]): Promise<Record<string, RefPhoto[]>> {
  const uniq = Array.from(new Set(scis.filter(Boolean))).slice(0, 60);
  const out: Record<string, RefPhoto[]> = {};
  // clean-manifest hits are synchronous; only iNat fallbacks need awaiting (cap concurrency low).
  const needFetch: string[] = [];
  const m = loadManifest();
  for (const sci of uniq) {
    const clean = m[sci];
    if (clean && clean.length) out[sci] = clean;
    else needFetch.push(sci);
  }
  const CONC = 4;
  for (let i = 0; i < needFetch.length; i += CONC) {
    const batch = needFetch.slice(i, i + CONC);
    const res = await Promise.all(batch.map((s) => fromINat(s)));
    batch.forEach((s, k) => { out[s] = res[k]; });
  }
  return out;
}
