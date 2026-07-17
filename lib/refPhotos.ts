// Reference photos for the plate-review page — REAL photographs only, from Flickr + iNaturalist, so a
// reviewer picks the redraw source from actual birds (not the illustrations our clean manifest was
// padding species with). Both sources are filtered to derivative-AND-commercial-safe licences
// (CC0 / CC BY / CC BY-SA / public domain) because a picked photo becomes the source for a shipped
// plate — never show a photo we couldn't legally redraw from. Internal QA tool.

export type RefPhoto = { u: string; a: string; l: string; s?: string; st?: string };

const cache = new Map<string, RefPhoto[]>();          // per-process; live sources are slow/rate-limited

// Only licences that permit BOTH derivatives and commercial use (we generate a plate + it's paid).
function inatSafe(code: string | null | undefined): string | null {
  const c = (code || "").toLowerCase();
  if (c === "cc0" || c === "pd") return "CC0";
  if (c === "cc-by") return "CC BY";
  if (c === "cc-by-sa") return "CC BY-SA";
  return null;                                        // drop NC, ND, all-rights-reserved
}
// Flickr licence ids -> label, restricted to the derivative+commercial-safe set.
function flickrSafe(id: string | number | undefined): string | null {
  switch (String(id)) {
    case "4": return "CC BY";
    case "5": return "CC BY-SA";
    case "7": return "no known copyright";
    case "9": return "CC0";
    case "10": return "Public Domain";
    default: return null;                             // 1/2/3 = NC, 6 = ND -> excluded
  }
}

function cleanAttr(s: string | undefined, fallback = "iNaturalist"): string {
  if (!s) return fallback;
  const noTags = s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").trim();
  const m = noTags.match(/(?:\(c\)|©)?\s*([^,]+?),?\s*(?:some|all|no) rights/i);
  return (m ? m[1] : noTags).replace(/^\(c\)\s*/i, "").trim() || fallback;
}

async function fromFlickr(sci: string): Promise<RefPhoto[]> {
  const key = process.env.FLICKR_API_KEY;
  if (!key) return [];
  try {
    const url =
      `https://api.flickr.com/services/rest/?method=flickr.photos.search&api_key=${key}` +
      `&text=${encodeURIComponent(sci)}&license=4,5,7,9,10&sort=relevance&content_type=1` +
      `&media=photos&per_page=10&extras=url_m,owner_name,license&format=json&nojsoncallback=1`;
    const r = await fetch(url, { signal: AbortSignal.timeout(7000) }).then((x) => x.json());
    const photos: Array<{ url_m?: string; ownername?: string; license?: string }> = r?.photos?.photo || [];
    return photos
      .map((p) => {
        const l = flickrSafe(p.license);
        if (!p.url_m || !l) return null;
        return { u: p.url_m, a: p.ownername || "Flickr", l, s: "flickr" } as RefPhoto;
      })
      .filter(Boolean as unknown as (x: RefPhoto | null) => x is RefPhoto)
      .slice(0, 5);
  } catch {
    return [];
  }
}

async function fromINat(sci: string): Promise<RefPhoto[]> {
  try {
    const sr = await fetch(
      `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sci)}&rank=species&per_page=1`,
      { signal: AbortSignal.timeout(7000) },
    ).then((r) => r.json());
    const t = sr?.results?.[0];
    if (!t?.id) return [];
    const dr = await fetch(`https://api.inaturalist.org/v1/taxa/${t.id}`, {
      signal: AbortSignal.timeout(7000),
    }).then((r) => r.json());
    const tp = dr?.results?.[0]?.taxon_photos || [];
    return (tp
      .map((x: { photo?: { medium_url?: string; url?: string; attribution?: string; license_code?: string } }) => {
        const ph = x.photo || {};
        const u = ph.medium_url || ph.url;
        const l = inatSafe(ph.license_code);
        if (!u || !l) return null;
        return { u, a: cleanAttr(ph.attribution), l, s: "inat" } as RefPhoto;
      })
      .filter(Boolean) as RefPhoto[]).slice(0, 5);
  } catch {
    return [];
  }
}

export async function getRefPhotos(sci: string): Promise<RefPhoto[]> {
  if (cache.has(sci)) return cache.get(sci)!;
  const [fl, inat] = await Promise.all([fromFlickr(sci), fromINat(sci)]);
  const seen = new Set<string>();
  const merged = [...fl, ...inat].filter((p) => (seen.has(p.u) ? false : (seen.add(p.u), true))).slice(0, 8);
  cache.set(sci, merged);
  return merged;
}

export async function getRefPhotosBatch(scis: string[]): Promise<Record<string, RefPhoto[]>> {
  const uniq = Array.from(new Set(scis.filter(Boolean))).slice(0, 60);
  const out: Record<string, RefPhoto[]> = {};
  const CONC = 4;
  for (let i = 0; i < uniq.length; i += CONC) {
    const batch = uniq.slice(i, i + CONC);
    const res = await Promise.all(batch.map((s) => getRefPhotos(s)));
    batch.forEach((s, k) => { out[s] = res[k]; });
  }
  return out;
}
