"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Hidden M/F labelling tab. Scope = sexually dimorphic species (public/dimorphic.json, built by
// fb-distill/build_dimorphic.py from species_info.dimorphic), app-scope first. For each: the current
// shipped plate next to real MALE and FEMALE photos (iNat sex-annotated, /api/sexphotos). Label what
// the plate shows: m = male, f = female, s = sexes look the same, x = wrong / mixed.
// Stored in the shared R2 review blob as sex / sexBy / sexAt (other fields untouched).

type D = { s: string; n: string; sci: string; mp?: string; fp?: string; fe?: number; a?: number; v?: number };
type Entry = { sex?: Label; sexBy?: string; sexAt?: number };
type Label = "m" | "f" | "s" | "x";
type Photo = { u: string; a: string; l: string };
type SexPh = { m: Photo[]; f: Photo[] };
type Zoom = { src: string; label: string } | null;

const PLATE = (slug: string, v?: number) =>
  `https://raw.githubusercontent.com/hexonMD/flock-plates/main/${slug}.png${v ? `?v=${v}` : ""}`;
const PROXY = (url: string) => `/api/img?u=${encodeURIComponent(url)}`;
const LABELS: { k: Label; t: string; cls: string }[] = [
  { k: "m", t: "♂ Male", cls: "m" }, { k: "f", t: "♀ Female", cls: "f" },
  { k: "s", t: "Same (not dimorphic)", cls: "s" }, { k: "x", t: "Wrong / mixed", cls: "x" },
];
const FILTERS = ["Unlabelled", "Male", "Female", "Same", "Wrong", "All"] as const;
type Filter = (typeof FILTERS)[number];
const FMAP: Record<Filter, Label | "" | "*"> = { Unlabelled: "", Male: "m", Female: "f", Same: "s", Wrong: "x", All: "*" };

function Photos({ list, onZoom, tag }: { list: Photo[] | undefined; onZoom: (z: Zoom) => void; tag: string }) {
  if (list === undefined) return <div className="ph">loading…</div>;
  if (list.length === 0) return <div className="ph">no {tag} photos on iNat</div>;
  return (
    <>
      {list.slice(0, 4).map((p, i) => (
        <figure key={i} onClick={() => onZoom({ src: p.u, label: `${tag} · ${p.a} · ${p.l}` })}>
          <img src={p.u} alt={tag} referrerPolicy="no-referrer" loading="lazy"
               onError={(e) => { const im = e.currentTarget; if (!im.dataset.px) { im.dataset.px = "1"; im.src = PROXY(p.u); } else im.closest("figure")!.style.display = "none"; }} />
        </figure>
      ))}
    </>
  );
}

export default function SexPage() {
  const [list, setList] = useState<D[]>([]);
  const [state, setState] = useState<Record<string, Entry>>({});
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Filter>("Unlabelled");
  const [appOnly, setAppOnly] = useState(false);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [who, setWho] = useState("");
  const [photos, setPhotos] = useState<Record<string, SexPh>>({});
  const [zoom, setZoom] = useState<Zoom>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const requested = useRef<Set<string>>(new Set());
  const advanceT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try { setWho(localStorage.getItem("fb_review_who") || ""); } catch { /* private mode */ }
    Promise.all([
      fetch("/dimorphic.json").then((r) => r.json()).catch(() => []),
      fetch("/api/review", { cache: "no-store" }).then((r) => r.json()).then((d) => d.state || {}).catch(() => ({})),
    ]).then(([d, s]) => { setList(d as D[]); setState(s); setReady(true); });
  }, []);

  const by = useMemo(() => { const m: Record<string, D> = {}; for (const d of list) m[d.s] = d; return m; }, [list]);
  const scoped = useMemo(() => (appOnly ? list.filter((d) => d.a) : list), [list, appOnly]);

  useEffect(() => {
    if (!ready) return;
    const ql = q.trim().toLowerCase();
    const want = FMAP[filter];
    setOrder(scoped.filter((d) => {
      if (ql && !d.s.includes(ql) && !d.n.toLowerCase().includes(ql) && !d.sci.toLowerCase().includes(ql)) return false;
      const v = state[d.s]?.sex || "";
      return want === "*" || v === want;
    }).map((d) => d.s));
    setIdx(0);
  }, [ready, filter, q, scoped]); // eslint-disable-line react-hooks/exhaustive-deps

  const slug = order[idx];
  const d = slug ? by[slug] : undefined;
  const entry = slug ? state[slug] : undefined;

  useEffect(() => {
    const look = order.slice(idx, idx + 3).map((s) => by[s]?.sci).filter((s): s is string => !!s && !requested.current.has(s));
    if (!look.length) return;
    look.forEach((s) => requested.current.add(s));
    fetch("/api/sexphotos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scis: look }) })
      .then((r) => r.json()).then((r) => setPhotos((p) => ({ ...p, ...(r.photos || {}) })))
      .catch(() => look.forEach((s) => requested.current.delete(s)));
  }, [idx, order, by]);

  const setWhoPersist = (v: string) => { setWho(v); try { localStorage.setItem("fb_review_who", v); } catch { /* ignore */ } };

  const save = useCallback((s: string, sex: Label | null) => {
    setState((prev) => {
      const cur = { ...(prev[s] || {}) };
      if (!sex) { delete cur.sex; delete cur.sexBy; delete cur.sexAt; }
      else { cur.sex = sex; cur.sexBy = who || cur.sexBy; cur.sexAt = Date.now(); }
      return { ...prev, [s]: cur };
    });
    queue.current = queue.current.then(() =>
      fetch("/api/review", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: s, sex, by: who }),
      }).then(() => undefined).catch(() => undefined),
    );
  }, [who]);

  const go = useCallback((dd: number) => {
    if (advanceT.current) { clearTimeout(advanceT.current); advanceT.current = null; }
    setZoom(null);
    setIdx((i) => Math.max(0, Math.min(order.length - 1, i + dd)));
  }, [order.length]);

  const label = useCallback((v: Label) => {
    if (!slug) return;
    const off = entry?.sex === v;
    save(slug, off ? null : v);
    if (!off && idx < order.length - 1) {
      if (advanceT.current) clearTimeout(advanceT.current);
      advanceT.current = setTimeout(() => { advanceT.current = null; setZoom(null); setIdx((i) => Math.min(order.length - 1, i + 1)); }, 300);
    }
  }, [slug, entry?.sex, save, idx, order.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "Escape") { if (zoom) setZoom(null); else if (t?.tagName === "INPUT") t.blur(); return; }
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "m" || e.key === "f" || e.key === "s" || e.key === "x") { e.preventDefault(); label(e.key); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [label, go, zoom]);

  const counts = useMemo(() => {
    const c = { m: 0, f: 0, s: 0, x: 0 };
    for (const x of scoped) { const v = state[x.s]?.sex; if (v) c[v]++; }
    return { ...c, done: c.m + c.f + c.s + c.x, total: scoped.length };
  }, [scoped, state]);

  if (!ready) return <div className="sx"><p style={{ padding: 40 }}>Loading…</p><style jsx global>{css}</style></div>;
  const ph = d ? photos[d.sci] : undefined;

  return (
    <div className="sx">
      <header>
        <div className="top">
          <h1>Male / female labels</h1>
          <span className="links"><a href="/review/pick">Pick mode</a> · <a href="/review/pick?lane=female">♀ lane</a> · <a href="/review">Review</a></span>
        </div>
        <div className="bar">
          <div className="seg m" style={{ width: `${(counts.m / Math.max(1, counts.total)) * 100}%` }} />
          <div className="seg f" style={{ width: `${(counts.f / Math.max(1, counts.total)) * 100}%` }} />
          <div className="seg s" style={{ width: `${(counts.s / Math.max(1, counts.total)) * 100}%` }} />
          <div className="seg x" style={{ width: `${(counts.x / Math.max(1, counts.total)) * 100}%` }} />
        </div>
        <div className="stats">
          {counts.done.toLocaleString()} / {counts.total.toLocaleString()} labelled · <b className="m">{counts.m} ♂</b> · <b className="f">{counts.f} ♀</b> · {counts.s} same · <b className="x">{counts.x} wrong</b>
        </div>
        <div className="controls">
          <input className="who" placeholder="your name" value={who} onChange={(e) => setWhoPersist(e.target.value)} />
          <input className="q" placeholder="search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="app"><input type="checkbox" checked={appOnly} onChange={(e) => setAppOnly(e.target.checked)} /> App only</label>
          <div className="filters">
            {FILTERS.map((f) => <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>)}
          </div>
        </div>
        {!who && <div className="warn">Enter your name so your labels are tagged.</div>}
      </header>

      {!d ? <p className="empty">Nothing in this filter.</p> : (
        <main key={slug}>
          <div className="head">
            <div>
              <div className="name">{d.n}{d.a ? "" : <span className="na"> · not in app</span>}</div>
              <div className="sci">{d.sci}</div>
            </div>
            <div className="pos">{idx + 1} / {order.length}</div>
          </div>
          <div className="layout">
            <section className="platecol">
              <figure className="plate" onClick={() => setZoom({ src: PLATE(d.s, d.v), label: "Current shipped plate" })}>
                <img src={PLATE(d.s, d.v)} alt="plate" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.15")} />
                <figcaption>current plate</figcaption>
              </figure>
              {d.fe ? (
                <figure className="fplate" onClick={() => setZoom({ src: PLATE(`${d.s}-female`), label: "Existing female plate" })}>
                  <img src={PLATE(`${d.s}-female`)} alt="female plate" />
                  <figcaption>existing ♀ plate</figcaption>
                </figure>
              ) : null}
            </section>
            <section className="photos">
              <div className="row">
                <div className="rh m">♂ Male{d.mp ? <span>{d.mp}</span> : null}</div>
                <div className="grid"><Photos list={ph?.m} onZoom={setZoom} tag="male" /></div>
              </div>
              <div className="row">
                <div className="rh f">♀ Female{d.fp ? <span>{d.fp}</span> : null}</div>
                <div className="grid"><Photos list={ph?.f} onZoom={setZoom} tag="female" /></div>
              </div>
            </section>
          </div>
          <div className="actbar">
            <button className="nav" disabled={idx <= 0} onClick={() => go(-1)}>←</button>
            {LABELS.map((l) => (
              <button key={l.k} className={`lab ${l.cls}${entry?.sex === l.k ? " on" : ""}`} onClick={() => label(l.k)}>
                {l.t} <kbd>{l.k}</kbd>
              </button>
            ))}
            <button className="nav" disabled={idx >= order.length - 1} onClick={() => go(1)}>→</button>
          </div>
          <div className="who-line">{entry?.sexBy ? `labelled by ${entry.sexBy}` : "m male · f female · s same · x wrong/mixed · ← → move"}</div>
        </main>
      )}

      {zoom && (
        <div className="lb" onClick={() => setZoom(null)}>
          <div className="lbin" onClick={(e) => e.stopPropagation()}>
            <img src={zoom.src} alt="" referrerPolicy="no-referrer" />
            <div className="lbcap">{zoom.label}</div>
            <button onClick={() => setZoom(null)}>Close</button>
          </div>
        </div>
      )}
      <style jsx global>{css}</style>
    </div>
  );
}

const css = `
.sx{max-width:1280px;margin:0 auto;padding:16px 16px 96px;color:#2b2a26;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.sx .top{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.sx h1{font-family:Georgia,'Times New Roman',serif;font-size:26px;margin:0 0 6px}
.sx .links{font-size:13px;color:#a49d8c}.sx .links a{color:#6b665c;text-decoration:none}
.sx .bar{height:8px;background:#e7e2d6;border-radius:6px;overflow:hidden;display:flex}
.sx .seg{height:100%;transition:width .3s}
.sx .seg.m,.sx .lab.m.on{background:#3f6a8a}.sx .seg.f,.sx .lab.f.on{background:#9a4f7d}
.sx .seg.s,.sx .lab.s.on{background:#7c9a6a}.sx .seg.x,.sx .lab.x.on{background:#b4462f}
.sx .stats{font-size:13px;color:#6b665c;margin:6px 0 10px}
.sx .stats .m{color:#3f6a8a}.sx .stats .f{color:#9a4f7d}.sx .stats .x{color:#b4462f}
.sx .controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.sx .who{width:130px}.sx .q{flex:1;min-width:140px}
.sx .who,.sx .q{padding:8px 12px;border:1px solid #d6d0c3;border-radius:8px;background:#fff;font-size:14px}
.sx .app{display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:7px 10px;border:1px solid #d6d0c3;border-radius:8px;background:#fff;cursor:pointer}
.sx .filters{display:flex;gap:4px;flex-wrap:wrap}
.sx .filters button{padding:7px 11px;border:1px solid #d6d0c3;background:#fff;border-radius:8px;cursor:pointer;font-size:13px}
.sx .filters button.on{background:#2b2a26;color:#fff;border-color:#2b2a26}
.sx .warn{background:#fbf1d9;border:1px solid #e8d8a8;color:#7a5e17;padding:7px 12px;border-radius:8px;margin:10px 0 0;font-size:13px}
.sx .empty{text-align:center;color:#a49d8c;padding:60px 0}
.sx main{margin-top:14px}
.sx .head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:10px}
.sx .name{font-family:Georgia,serif;font-size:24px;font-weight:600;line-height:1.15}
.sx .na{font-family:inherit;font-size:13px;font-weight:400;color:#a49d8c}
.sx .sci{font-style:italic;color:#8a8474;font-size:14px}
.sx .pos{font-size:13px;color:#8a8474;white-space:nowrap}
.sx .layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:16px;align-items:start}
.sx .platecol{display:flex;flex-direction:column;gap:8px;min-width:0}
.sx .plate,.sx .fplate{margin:0;position:relative;cursor:zoom-in;background:#f6f3ea;border-radius:10px}
.sx .plate img{width:100%;aspect-ratio:1/1;max-height:calc(100vh - 360px);object-fit:contain;display:block}
.sx .fplate{width:45%;border:1px dashed #d8bccd}
.sx .fplate img{width:100%;aspect-ratio:1/1;object-fit:contain;display:block}
.sx figcaption{position:absolute;top:6px;left:6px;background:#2b2a26;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.05em}
.sx .fplate figcaption{background:#9a4f7d}
.sx .photos{display:flex;flex-direction:column;gap:12px;min-width:0}
.sx .rh{font-size:14px;font-weight:700;margin-bottom:5px}
.sx .rh span{display:block;font-weight:400;font-size:12px;color:#6b665c;line-height:1.35;margin-top:2px}
.sx .rh.m{color:#3f6a8a}.sx .rh.f{color:#9a4f7d}
.sx .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.sx .grid figure{margin:0;cursor:zoom-in;min-width:0}
.sx .grid img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:6px;background:#f0ece1;display:block}
.sx .ph{grid-column:1/-1;height:64px;display:flex;align-items:center;justify-content:center;background:#f0ece1;border-radius:6px;color:#a49d8c;font-size:12px}
.sx .actbar{position:sticky;bottom:0;display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;margin-top:14px;padding:10px 0;background:linear-gradient(rgba(253,252,248,0),#fdfcf8 30%)}
.sx .actbar button{padding:11px 14px;border:1px solid #d6d0c3;background:#fff;border-radius:10px;cursor:pointer;font-size:14px}
.sx .actbar .nav{width:52px;font-size:18px}.sx .actbar button:disabled{opacity:.35;cursor:default}
.sx .lab.on{color:#fff;border-color:transparent}
.sx kbd{font-size:11px;border:1px solid currentColor;border-radius:4px;padding:0 4px;margin-left:4px;opacity:.6;font-family:inherit}
.sx .who-line{text-align:center;font-size:12px;color:#a49d8c}
.sx .lb{position:fixed;inset:0;background:rgba(20,18,14,.86);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px}
.sx .lbin{max-width:min(94vw,900px);display:flex;flex-direction:column;align-items:center;gap:10px}
.sx .lbin img{max-width:100%;max-height:76vh;object-fit:contain;border-radius:10px;background:#fff}
.sx .lbcap{color:#e9e4d8;font-size:13px;text-align:center}
.sx .lbin button{padding:9px 16px;border:1px solid #6b665c;background:#2b2a26;color:#fff;border-radius:8px;cursor:pointer;font-size:14px}
@media (max-width:820px){
  .sx{padding:12px 12px 120px}
  .sx h1{font-size:21px}
  .sx .layout{grid-template-columns:1fr;gap:10px}
  .sx .plate img{max-height:none}
  .sx .platecol{display:grid;grid-template-columns:minmax(0,1fr) 34%;align-items:start}
  .sx .fplate{width:100%}
  .sx .name{font-size:20px}
  .sx .actbar{gap:6px}
  .sx .actbar button{padding:10px 9px;font-size:13px}
  .sx .actbar .nav{width:42px}
  .sx .actbar .lab{flex:1 1 40%}
  .sx kbd{display:none}
}
`;
