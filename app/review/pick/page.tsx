"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Hidden "pick the best plate" review mode. For each species with generated candidates
// (fb-distill/gen_candidates.py -> plate-candidates/manifest.json on R2): the shipped plate, real
// reference photos, and the candidate grid. Pick one, keep the current plate, or mark "none close".
// Picks live in the same shared R2 review blob as /review (pick / pickNote / pickBy / pickAt fields).
// Keyboard: 1-6 pick · k keep current · n none close · ← → species · z zoom · Esc close.

type Bird = { s: string; n: string; sci?: string; v?: number };
type Cand = { id: string; url: string; seed: number; prompt_variant: string; model: string; ref?: string };
type Manifest = { meta: { model?: string; updated?: number; count?: number } | null; species: Record<string, Cand[]> };
type Entry = { status?: string; note?: string; pick?: string; pickNote?: string; pickBy?: string; pickAt?: number };
type State = Record<string, Entry>;
type Photo = { u: string; a: string; l: string; s?: string };
type Zoom = { src: string; label: string; cand?: number } | null;

const PLATE = (slug: string, v?: number) =>
  `https://raw.githubusercontent.com/hexonMD/flock-plates/main/${slug}.png${v ? `?v=${v}` : ""}`;
const PROXY = (url: string) => `/api/img?u=${encodeURIComponent(url)}`;
const FILTERS = ["Unreviewed", "Picked", "Kept current", "None close", "All"] as const;
type Filter = (typeof FILTERS)[number];

function kind(e?: Entry): "none" | "current" | "pick" | "" {
  if (!e?.pick) return "";
  if (e.pick === "none") return "none";
  if (e.pick === "current") return "current";
  return "pick";
}
function matches(f: Filter, e?: Entry) {
  const k = kind(e);
  if (f === "Unreviewed") return !k;
  if (f === "Picked") return k === "pick";
  if (f === "Kept current") return k === "current";
  if (f === "None close") return k === "none";
  return true;
}

export default function PickPage() {
  const [birds, setBirds] = useState<Record<string, Bird>>({});
  const [man, setMan] = useState<Manifest>({ meta: null, species: {} });
  const [state, setState] = useState<State>({});
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Filter>("Unreviewed");
  const [order, setOrder] = useState<string[]>([]);   // snapshot of the filtered list (stable while picking)
  const [idx, setIdx] = useState(0);
  const [who, setWho] = useState("");
  const [photos, setPhotos] = useState<Record<string, Photo[]>>({});
  const [zoom, setZoom] = useState<Zoom>(null);
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const queue = useRef<Promise<void>>(Promise.resolve());
  const requested = useRef<Set<string>>(new Set());
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const advanceT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try { setWho(localStorage.getItem("fb_review_who") || ""); } catch { /* private mode */ }
    Promise.all([
      fetch("/review-birds.json").then((r) => r.json()).catch(() => []),
      fetch("/api/candidates", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ meta: null, species: {} })),
      fetch("/api/review", { cache: "no-store" }).then((r) => r.json()).then((d) => d.state || {}).catch(() => ({})),
    ]).then(([b, m, s]) => {
      const map: Record<string, Bird> = {};
      for (const x of b as Bird[]) map[x.s] = x;
      setBirds(map); setMan(m as Manifest); setState(s as State); setReady(true);
    });
  }, []);

  const all = useMemo(() => Object.keys(man.species || {}).filter((s) => (man.species[s] || []).length > 0), [man]);

  // Rebuild the snapshot when the filter / search changes (not on every pick — keeps ← → stable).
  const rebuild = useCallback((f: Filter, query: string, st: State) => {
    const ql = query.trim().toLowerCase();
    const list = all.filter((s) => {
      if (ql) {
        const b = birds[s];
        if (!s.includes(ql) && !(b?.n || "").toLowerCase().includes(ql) && !(b?.sci || "").toLowerCase().includes(ql)) return false;
      }
      return matches(f, st[s]);
    });
    setOrder(list); setIdx(0);
  }, [all, birds]);
  useEffect(() => { if (ready) rebuild(filter, q, state); }, [ready, filter, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const slug = order[idx];
  const bird: Bird | undefined = slug ? birds[slug] || { s: slug, n: slug.replace(/-/g, " ") } : undefined;
  const cands = slug ? man.species[slug] || [] : [];
  const entry = slug ? state[slug] : undefined;

  useEffect(() => { setNote(entry?.pickNote || ""); }, [slug, entry?.pickNote]);

  // Reference photos for this + the next two species; prefetch the next species' candidates.
  useEffect(() => {
    const look = order.slice(idx, idx + 3).map((s) => birds[s]?.sci).filter((s): s is string => !!s && !requested.current.has(s));
    if (look.length) {
      look.forEach((s) => requested.current.add(s));
      fetch("/api/refphotos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scis: look }) })
        .then((r) => r.json()).then((d) => setPhotos((p) => ({ ...p, ...(d.photos || {}) })))
        .catch(() => look.forEach((s) => requested.current.delete(s)));
    }
    const nx = order[idx + 1];
    if (nx) for (const c of man.species[nx] || []) { const im = new Image(); im.src = c.url; }
  }, [idx, order, birds, man]);

  const setWhoPersist = (v: string) => { setWho(v); try { localStorage.setItem("fb_review_who", v); } catch { /* ignore */ } };

  const save = useCallback((s: string, patch: { pick?: string | null; pickNote?: string }) => {
    setState((prev) => {
      const cur = { ...(prev[s] || {}) };
      if (patch.pick !== undefined) {
        if (!patch.pick) { delete cur.pick; delete cur.pickNote; delete cur.pickBy; delete cur.pickAt; }
        else cur.pick = patch.pick;
      }
      if (patch.pickNote !== undefined) cur.pickNote = patch.pickNote;
      if (cur.pick) { cur.pickBy = who || cur.pickBy; cur.pickAt = Date.now(); }
      return { ...prev, [s]: cur };
    });
    queue.current = queue.current.then(() =>
      fetch("/api/review", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: s, ...patch, by: who }),
      }).then(() => undefined).catch(() => undefined),
    );
  }, [who]);

  const go = useCallback((d: number) => {
    if (advanceT.current) { clearTimeout(advanceT.current); advanceT.current = null; }
    setZoom(null);
    setIdx((i) => Math.max(0, Math.min(order.length - 1, i + d)));
  }, [order.length]);

  const choose = useCallback((value: string) => {
    if (!slug) return;
    const toggleOff = entry?.pick === value && value !== "none";
    save(slug, { pick: toggleOff ? null : value });
    if (value === "none") { setTimeout(() => noteRef.current?.focus(), 30); return; }
    if (!toggleOff && idx < order.length - 1) {
      if (advanceT.current) clearTimeout(advanceT.current);
      advanceT.current = setTimeout(() => { advanceT.current = null; setZoom(null); setIdx((i) => Math.min(order.length - 1, i + 1)); }, 380);
    }
  }, [slug, entry?.pick, save, idx, order.length]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
      if (e.key === "Escape") { if (zoom) setZoom(null); else if (typing) t.blur(); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-9]$/.test(e.key)) {
        const c = cands[Number(e.key) - 1];
        if (c) { e.preventDefault(); choose(c.id); }
        return;
      }
      if (e.key === "k") { e.preventDefault(); choose("current"); }
      else if (e.key === "n") { e.preventDefault(); choose("none"); }
      else if (e.key === "z") {
        e.preventDefault();
        if (zoom) setZoom(null); else if (cands[0]) setZoom({ src: cands[0].url, label: "Candidate 1", cand: 0 });
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const d = e.key === "ArrowRight" ? 1 : -1;
        if (zoom && zoom.cand !== undefined && cands.length) {
          const n = (zoom.cand + d + cands.length) % cands.length;
          setZoom({ src: cands[n].url, label: `Candidate ${n + 1}`, cand: n });
        } else go(d);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cands, choose, go, zoom]);

  const counts = useMemo(() => {
    let p = 0, c = 0, n = 0;
    for (const s of all) { const k = kind(state[s]); if (k === "pick") p++; else if (k === "current") c++; else if (k === "none") n++; }
    return { p, c, n, done: p + c + n, total: all.length };
  }, [all, state]);

  if (!ready) return <div className="pk"><p style={{ padding: 40 }}>Loading candidates…</p><style jsx global>{css}</style></div>;

  const refs = bird?.sci ? photos[bird.sci] : [];
  const k = kind(entry);

  return (
    <div className="pk">
      <header>
        <div className="top">
          <h1>Pick the best plate</h1>
          <a className="back" href="/review">← Review</a>
        </div>
        <div className="bar"><div className="fill" style={{ width: `${(counts.done / Math.max(1, counts.total)) * 100}%` }} /></div>
        <div className="stats">
          {counts.done} / {counts.total} decided · <b className="ok">{counts.p} picked</b> · {counts.c} kept current · <b className="bad">{counts.n} none close</b>
          {man.meta?.model ? <span className="model"> · {man.meta.model}</span> : null}
        </div>
        <div className="controls">
          <input className="who" placeholder="your name" value={who} onChange={(e) => setWhoPersist(e.target.value)} />
          <input className="q" placeholder="search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="filters">
            {FILTERS.map((f) => <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>)}
          </div>
        </div>
        {!who && <div className="warn">Enter your name so your picks are tagged.</div>}
      </header>

      {!bird ? (
        <p className="empty">{all.length === 0 ? "No candidates generated yet." : "Nothing in this filter."}</p>
      ) : (
        <main key={slug}>
          <div className="head">
            <div>
              <div className="name">{bird.n}</div>
              {bird.sci && <div className="sci">{bird.sci}</div>}
            </div>
            <div className="pos">{idx + 1} / {order.length}</div>
          </div>

          <div className="layout">
            <section className="side">
              <figure className="current" onClick={() => setZoom({ src: PLATE(bird.s, bird.v), label: "Current shipped plate" })}>
                <img src={PLATE(bird.s, bird.v)} alt="current plate" onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.15")} />
                <figcaption>current</figcaption>
              </figure>
              <div className="refs">
                {refs === undefined ? <div className="ph">loading photos…</div>
                  : refs.length === 0 ? <div className="ph">no photos</div>
                    : refs.slice(0, 6).map((p, i) => (
                      <figure key={i} onClick={() => setZoom({ src: p.u, label: `${p.a} · ${p.l}` })}>
                        <img src={p.u} alt="reference" referrerPolicy="no-referrer" loading="lazy"
                             onError={(e) => { const im = e.currentTarget; if (!im.dataset.px) { im.dataset.px = "1"; im.src = PROXY(p.u); } else im.closest("figure")!.style.display = "none"; }} />
                      </figure>
                    ))}
              </div>
              <div className="refcap">real photos · tap to enlarge</div>
            </section>

            <section className="cands">
              {cands.map((c, i) => (
                <div key={c.id} className={`cand${entry?.pick === c.id ? " on" : ""}`}>
                  <button className="pickbtn" onClick={() => choose(c.id)} title={`pick candidate ${i + 1} (${c.prompt_variant}, seed ${c.seed})`}>
                    <img src={c.url} alt={`candidate ${i + 1}`} />
                    <span className="num">{i + 1}</span>
                    <span className="var">{c.prompt_variant === "marks" ? "field marks" : "plain"}</span>
                    {entry?.pick === c.id && <span className="chk">✓ picked</span>}
                  </button>
                  <button className="zoombtn" aria-label="enlarge" onClick={() => setZoom({ src: c.url, label: `Candidate ${i + 1}`, cand: i })}>⤢</button>
                </div>
              ))}
            </section>
          </div>

          {k === "none" && (
            <div className="nonebox">
              <textarea ref={noteRef} placeholder="what's wrong with all of them? (saved on blur)" value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onBlur={() => { if ((entry?.pickNote || "") !== note) save(bird.s, { pickNote: note }); }} />
            </div>
          )}

          <div className="actbar">
            <button className="nav" disabled={idx <= 0} onClick={() => go(-1)}>←</button>
            <button className={`act${k === "current" ? " on keep" : ""}`} onClick={() => choose("current")}>Keep current <kbd>k</kbd></button>
            <button className={`act${k === "none" ? " on none" : ""}`} onClick={() => choose("none")}>None close <kbd>n</kbd></button>
            {k && <button className="act clear" onClick={() => save(bird.s, { pick: null })}>Clear</button>}
            <button className="nav" disabled={idx >= order.length - 1} onClick={() => go(1)}>→</button>
          </div>
          <div className="who-line">{entry?.pickBy ? `${k === "pick" ? `picked ${entry.pick}` : k === "current" ? "kept current" : "none close"} · by ${entry.pickBy}` : "1–6 pick · k keep · n none · ← → move · z zoom"}</div>
        </main>
      )}

      {zoom && (
        <div className="lb" onClick={() => setZoom(null)}>
          <div className="lbin" onClick={(e) => e.stopPropagation()}>
            <img src={zoom.src} alt="" referrerPolicy="no-referrer" />
            <div className="lbcap">{zoom.label}</div>
            <div className="lbacts">
              {zoom.cand !== undefined && cands.length > 1 && (
                <button onClick={() => { const n = (zoom.cand! - 1 + cands.length) % cands.length; setZoom({ src: cands[n].url, label: `Candidate ${n + 1}`, cand: n }); }}>←</button>
              )}
              {zoom.cand !== undefined && <button className="pk-it" onClick={() => choose(cands[zoom.cand!].id)}>Pick {zoom.cand + 1}</button>}
              <button onClick={() => setZoom(null)}>Close</button>
              {zoom.cand !== undefined && cands.length > 1 && (
                <button onClick={() => { const n = (zoom.cand! + 1) % cands.length; setZoom({ src: cands[n].url, label: `Candidate ${n + 1}`, cand: n }); }}>→</button>
              )}
            </div>
          </div>
        </div>
      )}
      <style jsx global>{css}</style>
    </div>
  );
}

const css = `
.pk{max-width:1280px;margin:0 auto;padding:16px 16px 96px;color:#2b2a26;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.pk .top{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.pk h1{font-family:Georgia,'Times New Roman',serif;font-size:26px;margin:0 0 6px}
.pk .back{font-size:13px;color:#6b665c;text-decoration:none;white-space:nowrap}
.pk .bar{height:8px;background:#e7e2d6;border-radius:6px;overflow:hidden}
.pk .fill{height:100%;background:#7c9a6a;transition:width .3s}
.pk .stats{font-size:13px;color:#6b665c;margin:6px 0 10px}
.pk .stats .ok{color:#4f7a3f;font-weight:600}.pk .stats .bad{color:#b4462f;font-weight:600}.pk .model{color:#a49d8c}
.pk .controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pk .who{width:130px}.pk .q{flex:1;min-width:140px}
.pk .who,.pk .q{padding:8px 12px;border:1px solid #d6d0c3;border-radius:8px;background:#fff;font-size:14px}
.pk .filters{display:flex;gap:4px;flex-wrap:wrap}
.pk .filters button{padding:7px 11px;border:1px solid #d6d0c3;background:#fff;border-radius:8px;cursor:pointer;font-size:13px}
.pk .filters button.on{background:#2b2a26;color:#fff;border-color:#2b2a26}
.pk .warn{background:#fbf1d9;border:1px solid #e8d8a8;color:#7a5e17;padding:7px 12px;border-radius:8px;margin:10px 0 0;font-size:13px}
.pk .empty{text-align:center;color:#a49d8c;padding:60px 0}
.pk main{margin-top:14px}
.pk .head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:10px}
.pk .name{font-family:Georgia,serif;font-size:24px;font-weight:600;line-height:1.15}
.pk .sci{font-style:italic;color:#8a8474;font-size:14px}
.pk .pos{font-size:13px;color:#8a8474;white-space:nowrap}
.pk .layout{display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px;align-items:start}
.pk .side{display:flex;flex-direction:column;gap:8px;min-width:0}
.pk .current{margin:0;position:relative;cursor:zoom-in;background:#f6f3ea;border:2px dashed #cfc7b4;border-radius:10px}
.pk .current img{width:100%;aspect-ratio:1/1;object-fit:contain;display:block}
.pk .current figcaption{position:absolute;top:6px;left:6px;background:#2b2a26;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:.05em}
.pk .refs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
.pk .refs figure{margin:0;cursor:zoom-in;min-width:0}
.pk .refs img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:6px;background:#f0ece1;display:block}
.pk .refs .ph{grid-column:1/-1;height:70px;display:flex;align-items:center;justify-content:center;background:#f0ece1;border-radius:6px;color:#a49d8c;font-size:12px}
.pk .refcap{font-size:11px;color:#a49d8c}
.pk .cands{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
@media (min-width:821px){.pk .cands{max-width:max(560px,calc((100vh - 400px) * 1.5 + 20px))}}
.pk .cand{position:relative;min-width:0}
.pk .pickbtn{display:block;width:100%;padding:0;border:3px solid #e2ddd0;border-radius:12px;background:#fff;cursor:pointer;overflow:hidden;position:relative;transition:border-color .12s,box-shadow .12s}
.pk .pickbtn:hover{border-color:#b9b09a}
.pk .pickbtn img{width:100%;aspect-ratio:1/1;object-fit:contain;display:block;background:#fff}
.pk .cand.on .pickbtn{border-color:#4f7a3f;box-shadow:0 0 0 3px #cfe3c2}
.pk .num{position:absolute;top:6px;left:6px;width:26px;height:26px;border-radius:50%;background:#2b2a26;color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center}
.pk .var{position:absolute;bottom:6px;left:6px;font-size:10px;color:#8a8474;background:rgba(255,255,255,.85);padding:1px 6px;border-radius:8px}
.pk .chk{position:absolute;bottom:6px;right:6px;font-size:12px;font-weight:700;color:#fff;background:#4f7a3f;padding:2px 8px;border-radius:10px}
.pk .zoombtn{position:absolute;top:6px;right:6px;width:32px;height:32px;border-radius:8px;border:1px solid #d6d0c3;background:rgba(255,255,255,.92);cursor:zoom-in;font-size:16px;line-height:1}
.pk .nonebox textarea{width:100%;min-height:60px;margin-top:12px;border:1px solid #e2a99b;border-radius:8px;padding:8px 10px;font-size:14px;font-family:inherit;background:#fff;box-sizing:border-box}
.pk .actbar{position:sticky;bottom:0;display:flex;gap:8px;justify-content:center;align-items:center;margin-top:14px;padding:10px 0;background:linear-gradient(rgba(253,252,248,0),#fdfcf8 30%)}
.pk .actbar button{padding:11px 16px;border:1px solid #d6d0c3;background:#fff;border-radius:10px;cursor:pointer;font-size:14px}
.pk .actbar .nav{width:52px;font-size:18px}.pk .actbar button:disabled{opacity:.35;cursor:default}
.pk .actbar .on.keep{background:#2b2a26;color:#fff;border-color:#2b2a26}
.pk .actbar .on.none{background:#b4462f;color:#fff;border-color:#b4462f}
.pk .actbar .clear{color:#8a8474}
.pk kbd{font-size:11px;border:1px solid currentColor;border-radius:4px;padding:0 4px;margin-left:4px;opacity:.6;font-family:inherit}
.pk .who-line{text-align:center;font-size:12px;color:#a49d8c}
.pk .lb{position:fixed;inset:0;background:rgba(20,18,14,.86);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px}
.pk .lbin{max-width:min(94vw,900px);display:flex;flex-direction:column;align-items:center;gap:10px}
.pk .lbin img{max-width:100%;max-height:76vh;object-fit:contain;border-radius:10px;background:#fff}
.pk .lbcap{color:#e9e4d8;font-size:13px;text-align:center}
.pk .lbacts{display:flex;gap:8px}
.pk .lbacts button{padding:9px 16px;border:1px solid #6b665c;background:#2b2a26;color:#fff;border-radius:8px;cursor:pointer;font-size:14px}
.pk .lbacts .pk-it{background:#4f7a3f;border-color:#4f7a3f}
@media (max-width:820px){
  .pk{padding:12px 12px 90px}
  .pk h1{font-size:21px}
  .pk .layout{grid-template-columns:1fr;gap:10px}
  .pk .side{display:grid;grid-template-columns:38% minmax(0,1fr);gap:8px;align-items:start}
  .pk .refcap{display:none}
  .pk .refs{grid-template-columns:repeat(3,minmax(0,1fr))}
  .pk .cands{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .pk .name{font-size:20px}
  .pk .actbar{padding:8px 0;gap:6px}
  .pk .actbar button{padding:11px 10px;font-size:13px}
  .pk .actbar .nav{width:44px}
  .pk kbd{display:none}
}
`;
