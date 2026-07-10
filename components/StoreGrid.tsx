"use client";
import { useState } from "react";

type Item = { slug: string; common: string; image: string; price: number; regions: ("na" | "eu")[] };

/// The browsable storefront: search + a location filter across every bird, click through to its
/// print page. We cap the rendered grid (DOM stays light) and lean on search/filter to reach the
/// long tail — nobody scrolls 10k cards, but everyone can narrow to their region or find "cardinal".
const CAP = 300;

const REGIONS = [
  ["all", "All birds"],
  ["na", "North America"],
  ["eu", "Europe"],
  ["row", "Rest of world"],
] as const;

export default function StoreGrid({ items }: { items: Item[] }) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<"all" | "na" | "eu" | "row">("all");
  const query = q.trim().toLowerCase();
  const byRegion =
    region === "all" ? items
    : region === "row" ? items.filter((i) => i.regions.length === 0)
    : items.filter((i) => i.regions.includes(region));
  const shown = query ? byRegion.filter((i) => i.common.toLowerCase().includes(query)) : byRegion;

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

      {/* Location filter — narrow the ~10k plates to a region so it's browsable, not just searchable. */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {REGIONS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRegion(key)}
            style={{
              padding: "6px 13px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              border: region === key ? "1px solid var(--accent)" : "1px solid var(--line)",
              background: region === key ? "var(--accent)" : "transparent",
              color: region === key ? "#fff" : "var(--ink-2)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${items.length.toLocaleString()} birds…`}
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
