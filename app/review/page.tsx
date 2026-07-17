"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";

// Hidden plate-review gallery: every bird's illustration next to MULTIPLE real reference photos
// (our clean, attributed pull where we have it, else iNaturalist — with credits either way), so a
// reviewer can confirm the illustration depicts the right species. Scoped to the current app
// offering. Shared Correct/Failed status + notes per bird (server-side via /api/review).

type Bird = { s: string; n: string; sci?: string; t?: string; c?: number; d?: number; v?: number };
type Status = "checked" | "failed";
type Entry = { status?: Status; note?: string; by?: string; at?: number };
type State = Record<string, Entry>;
type Photo = { u: string; a: string; l: string; s?: string; st?: string };
type PhotoMap = Record<string, Photo[]>;      // sci -> photos (missing key = not yet fetched)

const PLATE = (b: Bird) =>
  `https://raw.githubusercontent.com/hexonMD/flock-plates/main/${b.s}.png${b.v ? `?v=${b.v}` : ""}`;
const PAGE = 36;
const TABS = ["Suspicious", "Unchecked", "Checked", "Failed", "All"] as const;
type Tab = (typeof TABS)[number];

function Card({ bird, photos, entry, who, onSet, onZoom }: {
  bird: Bird; photos: Photo[] | undefined; entry: Entry | undefined; who: string;
  onSet: (slug: string, patch: { status?: Status | null; note?: string }) => void;
  onZoom: (p: Photo) => void;
}) {
  const [note, setNote] = useState(entry?.note || "");
  const [saved, setSaved] = useState(false);
  useEffect(() => { setNote(entry?.note || ""); }, [entry?.note]);
  const status = entry?.status;
  const saveNote = () => {
    if ((entry?.note || "") === note) return;
    onSet(bird.s, { note });
    setSaved(true); setTimeout(() => setSaved(false), 1200);
  };
  return (
    <div className={`card ${status || ""}`}>
      <figure className="plate">
        <img src={PLATE(bird)} alt="plate" loading="lazy"
             onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.15")} />
        <figcaption>illustration — what the app shows</figcaption>
      </figure>

      <div className="refhead">Real photos{photos?.length ? ` (${photos.length})` : ""} — is the illustration this bird?</div>
      <div className="refs">
        {photos === undefined ? <div className="ph">loading…</div>
          : photos.length === 0 ? <div className="ph">no photo</div>
            : photos.map((p, i) => (
              <figure key={i} className="ref" onClick={() => onZoom(p)}>
                <img src={p.u} alt="reference" loading="lazy"
                     onError={(e) => ((e.target as HTMLImageElement).closest("figure")!.style.display = "none")} />
                <figcaption>
                  {p.st ? <span className="st">{p.st}</span> : null}
                  <span className="cred">{p.a} · {p.l}</span>
                </figcaption>
              </figure>
            ))}
      </div>

      <div className="meta">
        <div className="name">{bird.n}</div>
        {bird.sci && <div className="sci">{bird.sci}</div>}
        {bird.t && <div className="hint">Model thinks the plate may actually be a {bird.t} ({Math.round((bird.c || 0) * 100)}%)</div>}
      </div>
      <div className="acts">
        <button className={!status ? "on" : ""} onClick={() => onSet(bird.s, { status: null })}>Unchecked</button>
        <button className={status === "checked" ? "on ok" : ""} onClick={() => onSet(bird.s, { status: "checked" })}>✓ Correct</button>
        <button className={status === "failed" ? "on bad" : ""} onClick={() => onSet(bird.s, { status: "failed" })}>✗ Failed</button>
      </div>
      <textarea className="note" placeholder="notes / what's wrong…" value={note}
                onChange={(e) => setNote(e.target.value)} onBlur={saveNote} />
      <div className="who">{saved ? "saved" : entry?.by ? `by ${entry.by}` : ""}</div>
    </div>
  );
}

export default function ReviewPage() {
  const [birds, setBirds] = useState<Bird[]>([]);
  const [appScope, setAppScope] = useState<Set<string> | null>(null);
  const [photoMap, setPhotoMap] = useState<PhotoMap>({});
  const [state, setState] = useState<State>({});
  const [tab, setTab] = useState<Tab>("Suspicious");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [who, setWho] = useState("");
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState<Photo | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const requested = useRef<Set<string>>(new Set());

  useEffect(() => {
    setWho(localStorage.getItem("fb_review_who") || "");
    Promise.all([
      fetch("/review-birds.json").then((r) => r.json()),
      fetch("/app-species.json").then((r) => r.json()).catch(() => []),
      fetch("/api/review").then((r) => r.json()).then((d) => d.state || {}).catch(() => ({})),
    ]).then(([b, app, s]) => {
      setBirds(b);
      setAppScope(new Set(app as string[]));
      setState(s);
      setReady(true);
    });
  }, []);

  const setWhoPersist = (v: string) => { setWho(v); localStorage.setItem("fb_review_who", v); };

  const onSet = useCallback((slug: string, patch: { status?: Status | null; note?: string }) => {
    setState((prev) => {
      const cur = prev[slug] || {};
      const next: Entry = { ...cur, by: who || cur.by, at: Date.now() };
      if (patch.status !== undefined) { if (patch.status === null) delete next.status; else next.status = patch.status; }
      if (patch.note !== undefined) next.note = patch.note;
      return { ...prev, [slug]: next };
    });
    queue.current = queue.current.then(() =>
      fetch("/api/review", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, ...patch, by: who }),
      }).then(() => undefined).catch(() => undefined),
    );
  }, [who]);

  // Scope to the current app offering: only species the shipped model actually classifies.
  const scoped = useMemo(
    () => (appScope && appScope.size ? birds.filter((b) => b.sci && appScope.has(b.sci)) : birds),
    [birds, appScope],
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return scoped.filter((b) => {
      const st = state[b.s]?.status;
      if (flaggedOnly && !b.d) return false;
      if (tab === "Suspicious" && !(b.t && st !== "checked")) return false;
      if (tab === "Unchecked" && st) return false;
      if (tab === "Checked" && st !== "checked") return false;
      if (tab === "Failed" && st !== "failed") return false;
      if (ql && !b.n.toLowerCase().includes(ql) && !(b.sci || "").toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [scoped, state, tab, q, flaggedOnly]);

  useEffect(() => { setPage(0); }, [tab, q, flaggedOnly]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const slice = useMemo(() => filtered.slice(page * PAGE, page * PAGE + PAGE), [filtered, page]);

  // Fetch reference photos for the visible slice (server merges clean manifest + iNat, cached).
  useEffect(() => {
    const need = slice.map((b) => b.sci).filter((s): s is string => !!s && !requested.current.has(s));
    if (need.length === 0) return;
    need.forEach((s) => requested.current.add(s));
    let alive = true;
    fetch("/api/refphotos", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ scis: need }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setPhotoMap((prev) => ({ ...prev, ...(d.photos || {}) }));
      })
      .catch(() => { need.forEach((s) => requested.current.delete(s)); });
    return () => { alive = false; };
  }, [slice]);

  const counts = useMemo(() => {
    let c = 0, f = 0;
    const total = scoped.length;
    for (const b of scoped) {
      const s = state[b.s]?.status; if (s === "checked") c++; else if (s === "failed") f++;
    }
    return { c, f, total, done: c + f };
  }, [scoped, state]);

  if (!ready) return <div className="wrap"><p style={{ padding: 40 }}>Loading birds…</p><style jsx global>{css}</style></div>;

  return (
    <div className="wrap">
      <header>
        <h1>Plate Review</h1>
        <p className="sub">Each bird’s illustration next to real reference photos — confirm the plate depicts the right species. {counts.total.toLocaleString()} species in the current app. Shared with Winnie &amp; Owen.</p>
        <div className="bar">
          <div className="fill" style={{ width: `${(counts.done / Math.max(1, counts.total)) * 100}%` }} />
        </div>
        <div className="stats">{counts.done.toLocaleString()} / {counts.total.toLocaleString()} reviewed · <span className="ok">{counts.c.toLocaleString()} correct</span> · <span className="bad">{counts.f.toLocaleString()} failed</span></div>
        <div className="controls">
          <input className="who-in" placeholder="your name" value={who} onChange={(e) => setWhoPersist(e.target.value)} />
          <input className="search" placeholder="search a bird…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="inapp"><input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} /> Flagged only</label>
          <div className="tabs">
            {TABS.map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}
          </div>
        </div>
      </header>
      {!who && <div className="warn">Enter your name above so your reviews are tagged.</div>}
      <div className="grid">
        {slice.map((b) => (
          <Card key={b.s} bird={b} photos={b.sci ? photoMap[b.sci] : []}
                entry={state[b.s]} who={who} onSet={onSet} onZoom={setZoom} />
        ))}
      </div>
      {filtered.length === 0 && <p className="empty">Nothing here.</p>}
      <div className="pager">
        <button disabled={page <= 0} onClick={() => { setPage((p) => p - 1); scrollTo(0, 0); }}>← Prev</button>
        <span>Page {page + 1} / {pages} · {filtered.length.toLocaleString()} birds</span>
        <button disabled={page >= pages - 1} onClick={() => { setPage((p) => p + 1); scrollTo(0, 0); }}>Next →</button>
      </div>

      {zoom && (
        <div className="lb" onClick={() => setZoom(null)}>
          <div className="lbinner" onClick={(e) => e.stopPropagation()}>
            <img src={zoom.u} alt="reference" />
            <div className="lbcred">{zoom.a} · {zoom.l}{zoom.st ? ` · ${zoom.st}` : ""}</div>
            <button className="lbclose" onClick={() => setZoom(null)}>Close</button>
          </div>
        </div>
      )}
      <style jsx global>{css}</style>
    </div>
  );
}

const css = `
.wrap{max-width:1240px;margin:0 auto;padding:24px 16px 80px;color:#2b2a26;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.wrap h1{font-family:Georgia,'Times New Roman',serif;font-size:30px;margin:0 0 4px}
.sub{color:#6b665c;margin:0 0 14px;font-size:14px}
.bar{height:10px;background:#e7e2d6;border-radius:6px;overflow:hidden}
.fill{height:100%;background:#7c9a6a;transition:width .3s}
.stats{font-size:13px;color:#6b665c;margin:6px 0 14px}
.stats .ok{color:#4f7a3f}.stats .bad{color:#b4462f}
.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.who-in{width:140px;padding:8px 12px;border:1px solid #d6d0c3;border-radius:8px;background:#fff;font-size:14px}
.search{flex:1;min-width:180px;padding:8px 12px;border:1px solid #d6d0c3;border-radius:8px;background:#fff;font-size:14px}
.inapp{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#4a463c;padding:7px 10px;border:1px solid #d6d0c3;border-radius:8px;background:#fff;cursor:pointer;user-select:none}
.inapp input{cursor:pointer}
.tabs{display:flex;gap:4px;flex-wrap:wrap}
.tabs button,.pager button{padding:8px 12px;border:1px solid #d6d0c3;background:#fff;border-radius:8px;cursor:pointer;font-size:13px}
.tabs button.on{background:#2b2a26;color:#fff;border-color:#2b2a26}
.warn{background:#fbf1d9;border:1px solid #e8d8a8;color:#7a5e17;padding:8px 12px;border-radius:8px;margin:12px 0;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;margin-top:16px}
.card{border:1px solid #e2ddd0;border-radius:12px;background:#fdfcf8;padding:12px;display:flex;flex-direction:column;gap:8px}
.card.checked{border-color:#9bbf88;background:#f4f8ef}
.card.failed{border-color:#e2a99b;background:#fbf1ee}
.plate{margin:0;text-align:center}
.plate img{width:100%;height:190px;object-fit:contain;background:#f6f3ea;border-radius:8px}
.plate figcaption{font-size:10px;color:#a49d8c;margin-top:3px;text-transform:uppercase;letter-spacing:.05em}
.refhead{font-size:12px;color:#6b665c;font-weight:600}
.refs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.ref{margin:0;cursor:zoom-in;display:flex;flex-direction:column}
.ref img{width:100%;height:84px;object-fit:cover;background:#f0ece1;border-radius:6px;display:block}
.ref figcaption{font-size:9px;color:#8a8474;margin-top:2px;line-height:1.25;display:flex;flex-direction:column;gap:1px}
.ref .st{display:inline-block;text-transform:uppercase;letter-spacing:.04em;color:#4f7a3f;font-weight:700}
.ref .cred{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.refs .ph{grid-column:1/-1;height:84px;display:flex;align-items:center;justify-content:center;background:#f0ece1;border-radius:6px;color:#a49d8c;font-size:12px}
.meta .name{font-weight:600;font-size:15px}
.meta .sci{font-style:italic;color:#8a8474;font-size:12px}
.meta .hint{margin-top:4px;font-size:12px;color:#b4462f;background:#fbeee9;padding:3px 6px;border-radius:6px;display:inline-block}
.acts{display:flex;gap:4px}
.acts button{flex:1;padding:6px 4px;border:1px solid #d6d0c3;background:#fff;border-radius:7px;cursor:pointer;font-size:12px}
.acts button.on{background:#2b2a26;color:#fff;border-color:#2b2a26}
.acts button.on.ok{background:#4f7a3f;border-color:#4f7a3f}
.acts button.on.bad{background:#b4462f;border-color:#b4462f}
.note{width:100%;min-height:38px;resize:vertical;border:1px solid #e2ddd0;border-radius:7px;padding:6px 8px;font-size:12px;font-family:inherit;background:#fff}
.who{font-size:11px;color:#a49d8c;height:14px}
.empty{text-align:center;color:#a49d8c;padding:40px}
.pager{display:flex;justify-content:center;align-items:center;gap:16px;margin-top:24px;font-size:13px;color:#6b665c}
.pager button:disabled{opacity:.4;cursor:default}
.lb{position:fixed;inset:0;background:rgba(20,18,14,.82);display:flex;align-items:center;justify-content:center;z-index:50;padding:20px}
.lbinner{max-width:min(92vw,720px);display:flex;flex-direction:column;align-items:center;gap:10px}
.lbinner img{max-width:100%;max-height:78vh;object-fit:contain;border-radius:10px;background:#000}
.lbcred{color:#e9e4d8;font-size:13px}
.lbclose{padding:8px 18px;border:1px solid #6b665c;background:#2b2a26;color:#fff;border-radius:8px;cursor:pointer;font-size:13px}
`;
