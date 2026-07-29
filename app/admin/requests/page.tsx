"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

// Bird-request admin dashboard. Ranked demand list of species users photographed but we don't have a
// plate/card for yet (fed by /api/bird-requests, which the app writes to on an off-catalog result).
// Drives the add pipeline: requested -> generating -> in_review -> live. "Generate" is the future
// auto-plate hook (Gemini image + Qwen blurb + eBird range); today it just advances the status so the
// queue is usable immediately.

type RequestStatus = "requested" | "generating" | "in_review" | "live" | "rejected";
type BirdRequest = {
  species_sci: string; common_name: string | null; count: number; status: RequestStatus;
  sample_photo_url: string | null; first_user_id: string | null; last_region: string | null;
  note: string | null; created_at: string; updated_at: string;
};

const STATUSES: RequestStatus[] = ["requested", "generating", "in_review", "live", "rejected"];
const NEXT: Partial<Record<RequestStatus, RequestStatus>> = {
  requested: "generating", generating: "in_review", in_review: "live",
};
const LABEL: Record<RequestStatus, string> = {
  requested: "Requested", generating: "Generating", in_review: "In review", live: "Live", rejected: "Rejected",
};
const TABS = ["open", "requested", "generating", "in_review", "live", "rejected", "all"] as const;
type Tab = (typeof TABS)[number];

const PLATE = (sci: string) =>
  `https://raw.githubusercontent.com/hexonMD/flock-plates/main/${sci.replace(/\s+/g, "-").toLowerCase()}.png`;

function fmt(ts: string) {
  try { return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  catch { return ""; }
}

export default function RequestsAdmin() {
  const [rows, setRows] = useState<BirdRequest[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("open");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/bird-requests", { cache: "no-store" });
      const j = await r.json();
      setConfigured(j.configured !== false);
      setRows(Array.isArray(j.requests) ? j.requests : []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const patch = useCallback(async (sci: string, body: { status?: RequestStatus; note?: string }) => {
    setBusy(sci);
    try {
      await fetch("/api/bird-requests", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ species_sci: sci, ...body }),
      });
      setRows((rs) => rs.map((r) => (r.species_sci === sci ? { ...r, ...body } : r)));
    } finally { setBusy(null); }
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { open: 0, all: rows.length };
    for (const r of rows) {
      c[r.status] = (c[r.status] || 0) + 1;
      if (r.status !== "live" && r.status !== "rejected") c.open++;
    }
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    if (tab === "all") return rows;
    if (tab === "open") return rows.filter((r) => r.status !== "live" && r.status !== "rejected");
    return rows.filter((r) => r.status === tab);
  }, [rows, tab]);

  const totalReq = useMemo(() => rows.reduce((s, r) => s + r.count, 0), [rows]);

  return (
    <main className="wrap">
      <header className="head">
        <div>
          <h1>Bird requests</h1>
          <p className="sub">Species people found that aren’t in the field guide yet — ranked by demand.</p>
        </div>
        <div className="stats">
          <span><b>{rows.length}</b> species</span>
          <span><b>{totalReq}</b> requests</span>
          <span><b>{counts.live || 0}</b> added</span>
        </div>
      </header>

      {!configured && (
        <div className="warn">
          Not connected yet — set <code>SUPABASE_SERVICE_KEY</code> in the runtime env and create the{" "}
          <code>bird_requests</code> table (<code>supabase/bird_requests.sql</code>).
        </div>
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "tab on" : "tab"} onClick={() => setTab(t)}>
            {t === "open" ? "Open" : t === "all" ? "All" : LABEL[t as RequestStatus]}
            <span className="n">{counts[t] ?? 0}</span>
          </button>
        ))}
      </nav>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="muted">Nothing here yet.</p>
      ) : (
        <ul className="list">
          {shown.map((r) => (
            <li key={r.species_sci} className="row">
              <div className="thumb">
                {r.status === "live" ? (
                  <img src={PLATE(r.species_sci)} alt="" loading="lazy" />
                ) : r.sample_photo_url ? (
                  <img src={r.sample_photo_url} alt="" loading="lazy" />
                ) : (
                  <span className="noimg">?</span>
                )}
              </div>
              <div className="main">
                <div className="names">
                  <b className="common">{r.common_name || r.species_sci}</b>
                  <i className="sci">{r.species_sci}</i>
                </div>
                <div className="meta">
                  {r.last_region && <span>📍 {r.last_region}</span>}
                  <span>· requested {fmt(r.updated_at)}</span>
                </div>
                <input
                  className="note" defaultValue={r.note || ""} placeholder="note…"
                  onBlur={(e) => { if (e.target.value !== (r.note || "")) patch(r.species_sci, { note: e.target.value }); }}
                />
              </div>
              <div className="demand"><b>{r.count}</b><span>{r.count === 1 ? "request" : "requests"}</span></div>
              <div className="actions">
                <span className={`pill ${r.status}`}>{LABEL[r.status]}</span>
                <select
                  value={r.status} disabled={busy === r.species_sci}
                  onChange={(e) => patch(r.species_sci, { status: e.target.value as RequestStatus })}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                </select>
                {NEXT[r.status] && (
                  <button className="advance" disabled={busy === r.species_sci}
                    onClick={() => patch(r.species_sci, { status: NEXT[r.status]! })}>
                    {r.status === "requested" ? "Generate →" : r.status === "generating" ? "To review →" : "Publish →"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .wrap { max-width: 1040px; margin: 0 auto; padding: 32px 20px 80px; }
        .head { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap;
          border-bottom: 1px solid var(--hairline); padding-bottom: 16px; margin-bottom: 20px; }
        h1 { font-size: 30px; letter-spacing: .2px; }
        .sub { color: var(--ink-2); margin-top: 4px; font-size: 14px; }
        .stats { display: flex; gap: 18px; font-size: 14px; color: var(--ink-2); }
        .stats b { color: var(--ink); font-size: 18px; }
        .warn { background: #fbeecd; border: 1px solid var(--gold); border-radius: 8px; padding: 12px 14px;
          margin-bottom: 18px; font-size: 14px; }
        .warn code { background: rgba(0,0,0,.06); padding: 1px 5px; border-radius: 4px; }
        .tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
        .tab { border: 1px solid var(--hairline); background: var(--surface); color: var(--ink-2);
          padding: 6px 12px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 13px; }
        .tab.on { background: var(--accent); color: #fff; border-color: var(--accent); }
        .tab .n { margin-left: 6px; opacity: .7; font-size: 12px; }
        .list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .row { display: grid; grid-template-columns: 64px 1fr auto auto; gap: 16px; align-items: center;
          background: var(--surface); border: 1px solid var(--hairline); border-radius: 12px; padding: 12px 16px; }
        .thumb { width: 64px; height: 64px; border-radius: 8px; overflow: hidden; background: var(--surface-hi);
          display: grid; place-items: center; border: 1px solid var(--hairline); }
        .thumb img { width: 100%; height: 100%; object-fit: cover; }
        .noimg { color: var(--ink-2); font-size: 22px; }
        .names { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
        .common { font-size: 17px; }
        .sci { color: var(--ink-2); font-size: 13px; }
        .meta { color: var(--ink-2); font-size: 12.5px; margin-top: 2px; display: flex; gap: 6px; flex-wrap: wrap; }
        .note { margin-top: 8px; width: 100%; max-width: 380px; background: var(--surface-hi);
          border: 1px solid var(--hairline); border-radius: 6px; padding: 5px 8px; font: inherit; font-size: 13px; color: var(--ink); }
        .demand { text-align: center; }
        .demand b { font-size: 22px; color: var(--clay); display: block; }
        .demand span { font-size: 11px; color: var(--ink-2); text-transform: uppercase; letter-spacing: .5px; }
        .actions { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
        .pill { font-size: 11px; padding: 2px 9px; border-radius: 999px; text-transform: uppercase;
          letter-spacing: .5px; font-weight: 600; }
        .pill.requested { background: #f6e6bf; color: #7a5a13; }
        .pill.generating { background: #d6e6dd; color: #24614a; }
        .pill.in_review { background: #e8dcc0; color: #7a5320; }
        .pill.live { background: #cfe8d5; color: #1f6b33; }
        .pill.rejected { background: #e6ded1; color: #7a7161; }
        select { font: inherit; font-size: 13px; padding: 4px 8px; border-radius: 6px;
          border: 1px solid var(--hairline); background: var(--surface-hi); color: var(--ink); }
        .advance { font: inherit; font-size: 13px; padding: 5px 12px; border-radius: 7px; cursor: pointer;
          border: 1px solid var(--accent); background: var(--accent); color: #fff; }
        .advance:disabled { opacity: .5; cursor: default; }
        .muted { color: var(--ink-2); padding: 30px 0; text-align: center; }
        @media (max-width: 640px) {
          .row { grid-template-columns: 48px 1fr; }
          .thumb { width: 48px; height: 48px; }
          .demand, .actions { grid-column: 2; align-items: flex-start; flex-direction: row; }
          .actions { flex-wrap: wrap; }
        }
      `}</style>
    </main>
  );
}
