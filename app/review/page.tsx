"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";

// Hidden plate-review gallery: every bird's illustration next to a real photo, with a shared
// Checked / Failed status + notes per bird (stored server-side via /api/review). Not linked anywhere.

type Bird = { s: string; n: string; sci?: string; t?: string; c?: number; d?: number };
type Status = "checked" | "failed";
type Entry = { status?: Status; note?: string; by?: string; at?: number };
type State = Record<string, Entry>;

const PLATE = (slug: string) =>
  `https://raw.githubusercontent.com/hexonMD/flock-plates/main/${slug}.png`;
const PAGE = 48;
const TABS = ["In-App", "Suspicious", "Unchecked", "Checked", "Failed", "All"] as const;
type Tab = (typeof TABS)[number];

// iNat reference photo, fetched client-side by scientific name and cached in localStorage.
function useRefPhoto(sci?: string) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (!sci) { setUrl(null); return; }
    const ck = `fbph_${sci}`;
    const hit = typeof localStorage !== "undefined" ? localStorage.getItem(ck) : null;
    if (hit !== null) { setUrl(hit || null); return; }
    let alive = true;
    fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(sci)}&rank=species&per_page=1`)
      .then((r) => r.json())
      .then((d) => {
        const p = d?.results?.[0]?.default_photo;
        const u = p?.medium_url || p?.url || "";
        if (!alive) return;
        try { localStorage.setItem(ck, u); } catch {}
        setUrl(u || null);
      })
      .catch(() => alive && setUrl(null));
    return () => { alive = false; };
  }, [sci]);
  return url;
}

function Card({ bird, entry, who, onSet }: {
  bird: Bird; entry: Entry | undefined; who: string;
  onSet: (slug: string, patch: { status?: Status | null; note?: string }) => void;
}) {
  const photo = useRefPhoto(bird.sci);
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
      <div className="imgs">
        <figure>
          <img src={PLATE(bird.s)} alt="plate" loading="lazy"
               onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.15")} />
          <figcaption>illustration</figcaption>
        </figure>
        <figure>
          {photo === undefined ? <div className="ph">loading…</div>
            : photo ? <img src={photo} alt="real" loading="lazy" />
              : <div className="ph">no photo</div>}
          <figcaption>real photo</figcaption>
        </figure>
      </div>
      <div className="meta">
        <div className="name">{bird.n}</div>
        {bird.sci && <div className="sci">{bird.sci}</div>}
        {bird.t && <div className="hint">AI may have drawn a {bird.t} ({Math.round((bird.c || 0) * 100)}%)</div>}
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
  const [state, setState] = useState<State>({});
  const [tab, setTab] = useState<Tab>("In-App");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [who, setWho] = useState("");
  const [ready, setReady] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    setWho(localStorage.getItem("fb_review_who") || "");
    Promise.all([
      fetch("/review-birds.json").then((r) => r.json()),
      fetch("/api/review").then((r) => r.json()).then((d) => d.state || {}).catch(() => ({})),
    ]).then(([b, s]) => { setBirds(b); setState(s); setReady(true); });
  }, []);

  const setWhoPersist = (v: string) => { setWho(v); localStorage.setItem("fb_review_who", v); };

  // Serialize writes (single shared JSON blob) so rapid clicks don't clobber each other.
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

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return birds.filter((b) => {
      const st = state[b.s]?.status;
      if (tab === "In-App" && !b.d) return false;
      if (tab === "Suspicious" && !(b.t && st !== "checked")) return false;
      if (tab === "Unchecked" && st) return false;
      if (tab === "Checked" && st !== "checked") return false;
      if (tab === "Failed" && st !== "failed") return false;
      if (ql && !b.n.toLowerCase().includes(ql) && !(b.sci || "").toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [birds, state, tab, q]);

  useEffect(() => { setPage(0); }, [tab, q]);

  const counts = useMemo(() => {
    let c = 0, f = 0;
    for (const b of birds) { const s = state[b.s]?.status; if (s === "checked") c++; else if (s === "failed") f++; }
    return { c, f, total: birds.length, done: c + f };
  }, [birds, state]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const slice = filtered.slice(page * PAGE, page * PAGE + PAGE);

  if (!ready) return <div className="wrap"><p style={{ padding: 40 }}>Loading birds…</p><style jsx global>{css}</style></div>;

  return (
    <div className="wrap">
      <header>
        <h1>Plate Review</h1>
        <p className="sub">Every bird’s illustration next to a real photo. Mark each Correct or Failed, add notes. Shared — you, Winnie & Owen see the same.</p>
        <div className="bar">
          <div className="fill" style={{ width: `${(counts.done / Math.max(1, counts.total)) * 100}%` }} />
        </div>
        <div className="stats">{counts.done.toLocaleString()} / {counts.total.toLocaleString()} reviewed · <span className="ok">{counts.c.toLocaleString()} correct</span> · <span className="bad">{counts.f.toLocaleString()} failed</span></div>
        <div className="controls">
          <input className="who-in" placeholder="your name" value={who} onChange={(e) => setWhoPersist(e.target.value)} />
          <input className="search" placeholder="search a bird…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="tabs">
            {TABS.map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}
          </div>
        </div>
      </header>
      {!who && <div className="warn">Enter your name above so your reviews are tagged.</div>}
      <div className="grid">
        {slice.map((b) => <Card key={b.s} bird={b} entry={state[b.s]} who={who} onSet={onSet} />)}
      </div>
      {filtered.length === 0 && <p className="empty">Nothing here.</p>}
      <div className="pager">
        <button disabled={page <= 0} onClick={() => { setPage((p) => p - 1); scrollTo(0, 0); }}>← Prev</button>
        <span>Page {page + 1} / {pages} · {filtered.length.toLocaleString()} birds</span>
        <button disabled={page >= pages - 1} onClick={() => { setPage((p) => p + 1); scrollTo(0, 0); }}>Next →</button>
      </div>
      <style jsx global>{css}</style>
    </div>
  );
}

const css = `
.wrap{max-width:1200px;margin:0 auto;padding:24px 16px 80px;color:#2b2a26;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.wrap h1{font-family:Georgia,'Times New Roman',serif;font-size:30px;margin:0 0 4px}
.sub{color:#6b665c;margin:0 0 14px;font-size:14px}
.bar{height:10px;background:#e7e2d6;border-radius:6px;overflow:hidden}
.fill{height:100%;background:#7c9a6a;transition:width .3s}
.stats{font-size:13px;color:#6b665c;margin:6px 0 14px}
.stats .ok{color:#4f7a3f}.stats .bad{color:#b4462f}
.controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.controls input{padding:8px 12px;border:1px solid #d6d0c3;border-radius:8px;background:#fff;font-size:14px}
.who-in{width:140px}.search{flex:1;min-width:180px}
.tabs{display:flex;gap:4px;flex-wrap:wrap}
.tabs button,.pager button{padding:8px 12px;border:1px solid #d6d0c3;background:#fff;border-radius:8px;cursor:pointer;font-size:13px}
.tabs button.on{background:#2b2a26;color:#fff;border-color:#2b2a26}
.warn{background:#fbf1d9;border:1px solid #e8d8a8;color:#7a5e17;padding:8px 12px;border-radius:8px;margin:12px 0;font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:16px}
.card{border:1px solid #e2ddd0;border-radius:12px;background:#fdfcf8;padding:10px;display:flex;flex-direction:column;gap:8px}
.card.checked{border-color:#9bbf88;background:#f4f8ef}
.card.failed{border-color:#e2a99b;background:#fbf1ee}
.imgs{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.imgs figure{margin:0;text-align:center}
.imgs img{width:100%;height:150px;object-fit:contain;background:#f6f3ea;border-radius:8px}
.imgs .ph{width:100%;height:150px;display:flex;align-items:center;justify-content:center;background:#f0ece1;border-radius:8px;color:#a49d8c;font-size:12px}
.imgs figcaption{font-size:10px;color:#a49d8c;margin-top:2px;text-transform:uppercase;letter-spacing:.05em}
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
`;
