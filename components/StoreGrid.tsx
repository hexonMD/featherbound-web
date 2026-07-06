"use client";
import { useState } from "react";

type Item = { slug: string; common: string; image: string; price: number };

/// The browsable storefront: search across every bird, click through to its print page.
/// We cap the rendered grid (DOM stays light) and lean on search to reach the long tail —
/// nobody scrolls 1,682 cards, but everyone can find "cardinal" instantly.
const CAP = 300;

export default function StoreGrid({ items }: { items: Item[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = query ? items.filter((i) => i.common.toLowerCase().includes(query)) : items;

  return (
    <>
      {/* Field-guide plates (the app's own) vs artist prints — kept visibly separate so
          buyers know which is which. Artist prints open as illustrators submit. */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <span
          style={{
            padding: "7px 15px",
            borderRadius: 20,
            fontSize: 13.5,
            fontWeight: 700,
            background: "var(--accent)",
            color: "#fff",
          }}
        >
          Field-guide plates
        </span>
        <span
          title="Prints by named illustrators — opening soon"
          style={{
            padding: "7px 15px",
            borderRadius: 20,
            fontSize: 13.5,
            fontWeight: 700,
            border: "1px dashed var(--line)",
            background: "transparent",
            color: "var(--ink-2)",
            opacity: 0.55,
            cursor: "default",
          }}
        >
          Artist prints · soon
        </span>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search 1,682 birds…"
        aria-label="Search birds"
        style={{
          width: "100%",
          maxWidth: 440,
          padding: "12px 16px",
          borderRadius: 12,
          border: "1px solid var(--line)",
          fontSize: 16,
          fontFamily: "inherit",
          background: "var(--surface, #fff)",
          color: "var(--ink)",
        }}
      />
      <div style={{ color: "var(--ink-2)", fontSize: 13, margin: "8px 0 20px" }}>
        {shown.length.toLocaleString()} {shown.length === 1 ? "bird" : "birds"}
      </div>

      <div className="prints">
        {shown.slice(0, CAP).map((i) => (
          <a key={i.slug} className="print" href={`/print/${i.slug}`}>
            <div className="frame">
              <img src={i.image} alt={i.common} loading="lazy" />
            </div>
            <div className="meta">
              <div className="name">{i.common}</div>
              <div className="price">from ${i.price}</div>
            </div>
          </a>
        ))}
      </div>

      {shown.length > CAP && (
        <p style={{ color: "var(--ink-2)", fontSize: 13, marginTop: 22, textAlign: "center" }}>
          Showing {CAP} of {shown.length.toLocaleString()} — search to find a specific bird.
        </p>
      )}
      {shown.length === 0 && (
        <p style={{ color: "var(--ink-2)", fontSize: 14, marginTop: 22 }}>
          No bird matches “{q}”. Try a different name.
        </p>
      )}
    </>
  );
}
