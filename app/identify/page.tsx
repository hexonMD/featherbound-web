"use client";

import { useEffect, useRef, useState } from "react";

type Result = { sci: string; common: string; pct: number; in_range: boolean };
type SexAge = { label: string; pct: number };
type IdResponse = { id: string; bird_detected: boolean; model_used: string; region: string | null; sex_age: SexAge | null; results: Result[] };

// Phone photos are often 10-40 MB. The model only ever sees a small crop, so downscale to a max edge
// client-side (also applies EXIF orientation so the bird isn't sideways) — fast upload, no size errors.
async function downscale(file: File, maxEdge = 1600): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

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
  const [slugMap, setSlugMap] = useState<Record<string, string>>({});
  const [place, setPlace] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function reverseGeocode(la: string, lo: string) {
    try {
      const r = await fetch(`/api/geocode?mode=reverse&lat=${la}&lon=${lo}`);
      const j = await r.json();
      if (j.place) setPlace(j.place);
    } catch {
      /* keep coords silently */
    }
  }

  async function forwardGeocode() {
    const q = place.trim();
    if (!q) return;
    setLocLabel("finding place…");
    try {
      const r = await fetch(`/api/geocode?mode=forward&q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (r.ok && Number.isFinite(j.lat) && Number.isFinite(j.lon)) {
        setLat(j.lat.toFixed(4));
        setLon(j.lon.toFixed(4));
        setPlace(j.place || q);
        setLocLabel("");
      } else {
        setLocLabel("couldn't find that place — try 'City, Country'");
      }
    } catch {
      setLocLabel("couldn't reach the map service");
    }
  }

  // Map scientific name -> plate slug so we can show our own clean field-guide illustration for each
  // result (never iNat/other photos on the public page — clean-licensed art only).
  useEffect(() => {
    fetch("/review-birds.json")
      .then((r) => r.json())
      .then((d: { s: string; sci?: string }[]) => {
        const m: Record<string, string> = {};
        for (const b of d) if (b.sci) m[b.sci] = b.s;
        setSlugMap(m);
      })
      .catch(() => {});
  }, []);

  const plateUrl = (r: Result) => {
    const slug = slugMap[r.sci] ?? r.common.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `https://raw.githubusercontent.com/hexonMD/flock-plates/main/${slug}.png`;
  };

  function useMyLocation() {
    setLocLabel("locating…");
    if (!navigator.geolocation) {
      setLocLabel("");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const la = p.coords.latitude.toFixed(4);
        const lo = p.coords.longitude.toFixed(4);
        setLat(la);
        setLon(lo);
        setLocLabel("");
        reverseGeocode(la, lo);
      },
      () => setLocLabel("couldn't get location — type it below"),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setRes(null);
    setError("");
    setFeedback("");
    // Pull GPS straight off the photo's EXIF (before downscaling strips it) so the user usually
    // doesn't have to enter a location at all. Silent no-op if the photo has no geotag.
    try {
      const exifr = (await import("exifr")).default;
      const gps = await exifr.gps(f);
      if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
        const la = gps.latitude.toFixed(4);
        const lo = gps.longitude.toFixed(4);
        setLat(la);
        setLon(lo);
        setLocLabel("📷 location read from your photo");
        reverseGeocode(la, lo);
      }
    } catch {
      /* no EXIF / unreadable — fall back to manual or "Use my location" */
    }
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
      const blob = await downscale(file);
      const fd = new FormData();
      fd.set("file", blob, "photo.jpg");
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

  function reset() {
    setFile(null);
    setPreview("");
    setRes(null);
    setError("");
    setFeedback("");
    setCorrection("");
    if (fileRef.current) fileRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const top = res?.results[0];

  return (
    <main className="wrap" style={{ paddingBottom: 80 }}>
      <section style={{ textAlign: "center", padding: "44px 0 20px" }}>
        <span className="hero-badge">Live model · beta</span>
        <h1 style={{ fontSize: "clamp(34px,6vw,52px)", lineHeight: 1.04 }}>Identify a bird</h1>
        <p style={{ color: "var(--ink-2)", maxWidth: 560, margin: "16px auto 0", fontSize: 18, lineHeight: 1.5 }}>
          Upload a bird photo — we read the location right off it when it's geotagged (or set it yourself),
          then our new field-guide model narrows to the birds of your region and names it.
        </p>
      </section>

      <div className="id-card">
        {/* Location */}
        <label className="id-label">1 · Where are you?</label>
        <div className="id-loc">
          <button type="button" className="cta ghost" onClick={useMyLocation} style={{ padding: "11px 18px", fontSize: 15 }}>
            📍 Use my location
          </button>
          <input className="id-input" placeholder="or type a place — e.g. Victoria, Canada" value={place}
                 onChange={(e) => setPlace(e.target.value)} onBlur={forwardGeocode}
                 onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                 style={{ flexBasis: "100%" }} />
        </div>
        {lat && lon && place && !locLabel && <div className="id-hint">📍 {place}</div>}
        {locLabel && <div className="id-hint">{locLabel}</div>}

        {/* Photo */}
        <label className="id-label" style={{ marginTop: 22 }}>2 · Your bird photo</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPick} hidden />
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
        <div className="id-results">
          {!res.bird_detected && <div className="id-hint" style={{ margin: "0 auto 14px" }}>No clear bird outline found — identified from the whole photo, so this may be less certain.</div>}

          <div className="id-hero">
            <div className="id-hero-badge">{top.pct}%</div>
            <img className="id-hero-plate" src={plateUrl(top)} alt={`${top.common} field-guide plate`}
                 onError={(e) => ((e.currentTarget.style.display = "none"))} />
            <div className="id-hero-name">{top.common}</div>
            <div className="id-hero-sci">{top.sci}</div>
            {res.sex_age && <div className="id-sexage">likely {res.sex_age.label} · {res.sex_age.pct}%</div>}
            {!top.in_range && <div className="id-tag" style={{ marginTop: 10 }}>rare in your area</div>}
          </div>

          {(() => {
            const alts = res.results.slice(1).filter((r) => r.pct >= 1);
            if (!alts.length)
              return <div className="id-confident">High confidence — no close alternatives.</div>;
            return (
              <>
                <div className="id-alt-label">Other possibilities</div>
                <div className="id-grid">
                  {alts.map((r) => (
                    <div key={r.sci} className="id-mini">
                      <img className="id-mini-plate" src={plateUrl(r)} alt="" loading="lazy"
                           onError={(e) => ((e.currentTarget.style.visibility = "hidden"))} />
                      <div className="id-mini-name">{r.common}</div>
                      <div className="id-mini-pct">{r.pct}%{!r.in_range && <span className="id-tag id-tag-sm">rare</span>}</div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          <div className="id-model">
            {res.region ? `${res.region} regional model` : "global model"} · location-aware · reference art is our field-guide plates
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

          <button type="button" className="cta ghost" onClick={reset} style={{ width: "100%", justifyContent: "center", marginTop: 18 }}>
            📷 Identify another bird
          </button>
        </div>
      )}
    </main>
  );
}
