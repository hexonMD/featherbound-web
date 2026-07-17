"use client";

import { useRef, useState } from "react";

type Result = { sci: string; common: string; pct: number; in_range: boolean };
type IdResponse = { id: string; bird_detected: boolean; model_used: string; region: string | null; results: Result[] };

export default function IdentifyPage() {
  const [lat, setLat] = useState<string>("");
  const [lon, setLon] = useState<string>("");
  const [locLabel, setLocLabel] = useState<string>("");
  const [preview, setPreview] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<IdResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [feedback, setFeedback] = useState<"" | "thanks" | "correcting">("");
  const [correction, setCorrection] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function useMyLocation() {
    setLocLabel("locating…");
    if (!navigator.geolocation) {
      setLocLabel("");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(4));
        setLon(p.coords.longitude.toFixed(4));
        setLocLabel("using your location");
      },
      () => setLocLabel("couldn't get location — enter it below"),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setRes(null);
    setError("");
    setFeedback("");
  }

  async function identify() {
    if (!file) return;
    if (!lat || !lon) {
      setError("Add your location first — it picks the right regional model.");
      return;
    }
    setBusy(true);
    setError("");
    setRes(null);
    setFeedback("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("lat", lat);
      fd.set("lon", lon);
      const r = await fetch("/api/identify", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) setError(j.error ?? "identify failed");
      else setRes(j as IdResponse);
    } catch {
      setError("network error — try again");
    } finally {
      setBusy(false);
    }
  }

  async function sendFeedback(verdict: "correct" | "wrong", correct_sci?: string) {
    if (!res) return;
    setFeedback("thanks");
    try {
      await fetch("/api/identify/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: res.id, verdict, correct_sci }),
      });
    } catch {
      /* fire-and-forget */
    }
  }

  const top = res?.results[0];

  return (
    <main className="wrap" style={{ paddingBottom: 80 }}>
      <section style={{ textAlign: "center", padding: "44px 0 20px" }}>
        <span className="hero-badge">Live model · beta</span>
        <h1 style={{ fontSize: "clamp(34px,6vw,52px)", lineHeight: 1.04 }}>Identify a bird</h1>
        <p style={{ color: "var(--ink-2)", maxWidth: 560, margin: "16px auto 0", fontSize: 18, lineHeight: 1.5 }}>
          Upload a photo and tell us roughly where you are. Our new field-guide model narrows to the birds
          of your region and names it.
        </p>
      </section>

      <div className="id-card">
        {/* Location */}
        <label className="id-label">1 · Where are you?</label>
        <div className="id-loc">
          <button type="button" className="cta ghost" onClick={useMyLocation} style={{ padding: "11px 18px", fontSize: 15 }}>
            📍 Use my location
          </button>
          <input className="id-input" inputMode="decimal" placeholder="latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
          <input className="id-input" inputMode="decimal" placeholder="longitude" value={lon} onChange={(e) => setLon(e.target.value)} />
        </div>
        {locLabel && <div className="id-hint">{locLabel}</div>}

        {/* Photo */}
        <label className="id-label" style={{ marginTop: 22 }}>2 · Your bird photo</label>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPick} hidden />
        <button type="button" className="id-drop" onClick={() => fileRef.current?.click()}>
          {preview ? <img src={preview} alt="your bird" className="id-preview" /> : <span>📷 Tap to take or choose a photo</span>}
        </button>

        <button type="button" className="cta" onClick={identify} disabled={busy || !file} style={{ width: "100%", justifyContent: "center", marginTop: 18, opacity: busy || !file ? 0.6 : 1 }}>
          {busy ? "Identifying…" : "Identify bird"}
        </button>

        <p className="id-consent">Photos may be used to improve our bird models. We keep them clean-licensed — <a href="/responsible-ai">how our models work</a>.</p>
        {error && <div className="id-error">{error}</div>}
      </div>

      {/* Results */}
      {res && top && (
        <div className="id-card id-results">
          {!res.bird_detected && <div className="id-hint" style={{ marginBottom: 12 }}>No clear bird outline found — identified from the whole photo, so this may be less certain.</div>}
          <div className="id-top">
            <div className="id-top-pct">{top.pct}%</div>
            <div>
              <div className="id-top-name">{top.common}</div>
              <div className="id-top-sci">{top.sci}</div>
            </div>
          </div>
          <div className="id-others">
            {res.results.slice(1).map((r) => (
              <div key={r.sci} className="id-row">
                <span className="id-row-pct">{r.pct}%</span>
                <span>{r.common}</span>
                {!r.in_range && <span className="id-tag">rare here</span>}
              </div>
            ))}
          </div>
          <div className="id-model">
            {res.region ? `${res.region} regional model` : "global model"} · location-aware
          </div>

          {/* Feedback loop */}
          {feedback === "thanks" ? (
            <div className="id-thanks">Thanks — that helps the model learn. 🪶</div>
          ) : feedback === "correcting" ? (
            <div className="id-correct">
              <input className="id-input" placeholder="What was it really?" value={correction} onChange={(e) => setCorrection(e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="cta" style={{ padding: "10px 16px", fontSize: 15 }} onClick={() => sendFeedback("wrong", correction.trim() || undefined)}>Send</button>
            </div>
          ) : (
            <div className="id-ask">
              <span>Right?</span>
              <button type="button" className="cta ghost" style={{ padding: "8px 16px", fontSize: 15 }} onClick={() => sendFeedback("correct")}>✓ Yes</button>
              <button type="button" className="cta ghost" style={{ padding: "8px 16px", fontSize: 15 }} onClick={() => setFeedback("correcting")}>✗ No</button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
