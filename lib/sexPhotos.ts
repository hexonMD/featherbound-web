// Sex-annotated reference photos for the M/F labelling tab (/review/sex) and the female candidate lane.
// iNaturalist research-grade observations carrying the community "Sex" annotation (term 9: value
// 11 = male, 10 = female), restricted to derivative+commercial-safe photo licences (CC0 / CC BY /
// CC BY-SA) for the same reason as refPhotos.ts: a picked photo can become a shipped plate's source.

import type { RefPhoto } from "./refPhotos";

export type SexPhotos = { m: RefPhoto[]; f: RefPhoto[] };
const cache = new Map<string, SexPhotos>();
const SAFE: Record<string, string> = { cc0: "CC0", "cc-by": "CC BY", "cc-by-sa": "CC BY-SA" };

function attr(s: string | undefined): string {
  if (!s) return "iNaturalist";
  const m = s.match(/(?:\(c\)|©)?\s*([^,]+?),?\s*(?:some|all|no) rights/i);
  const out = (m ? m[1] : s).replace(/^\(c\)\s*/i, "").trim();
  return out && !/^no$/i.test(out) ? out : "iNaturalist";
}

async function bySex(sci: string, value: 10 | 11): Promise<RefPhoto[]> {
  try {
    const url =
      `https://api.inaturalist.org/v1/observations?taxon_name=${encodeURIComponent(sci)}` +
      `&term_id=9&term_value_id=${value}&photo_license=cc0,cc-by,cc-by-sa&quality_grade=research` +
      `&photos=true&order_by=votes&per_page=8`;
    const r = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "FeatherBound plate review (featherbound.app)" },
    }).then((x) => x.json());
    const out: RefPhoto[] = [];
    for (const o of r?.results || []) {
      const p = o?.photos?.[0];
      const l = SAFE[(p?.license_code || "").toLowerCase()];
      if (!p?.url || !l) continue;
      out.push({ u: String(p.url).replace("/square.", "/medium."), a: attr(p.attribution), l, s: "inat" });
      if (out.length >= 4) break;
    }
    return out;
  } catch {
    return [];
  }
}

export async function getSexPhotos(sci: string): Promise<SexPhotos> {
  const hit = cache.get(sci);
  if (hit) return hit;
  const [m, f] = await Promise.all([bySex(sci, 11), bySex(sci, 10)]);
  const res = { m, f };
  if (m.length || f.length) cache.set(sci, res);   // don't cache a transient failure
  return res;
}

export async function getSexPhotosBatch(scis: string[]): Promise<Record<string, SexPhotos>> {
  const uniq = Array.from(new Set(scis.filter(Boolean))).slice(0, 30);
  const out: Record<string, SexPhotos> = {};
  const CONC = 3;                                   // iNat asks for ~1 req/s; keep it gentle
  for (let i = 0; i < uniq.length; i += CONC) {
    const batch = uniq.slice(i, i + CONC);
    const res = await Promise.all(batch.map((s) => getSexPhotos(s)));
    batch.forEach((s, k) => { out[s] = res[k]; });
  }
  return out;
}
