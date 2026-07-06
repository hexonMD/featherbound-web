"use client";
import { useState } from "react";
import { AVAILABLE_PRODUCTS } from "@/lib/products";

/// Per-artwork product selector. Only shows products with a confirmed-live Prodigi SKU
/// (AVAILABLE_PRODUCTS) so a buyer can't pay for something fulfilment can't make. The "print"
/// option uses the artwork's own price; everything else comes from the product catalogue.
/// Posts the chosen product to /api/order, which starts Stripe Checkout.
export default function ProductPicker({
  artworkId,
  printPriceUsd,
}: {
  artworkId: string;
  printPriceUsd: number;
}) {
  const [sel, setSel] = useState("print");
  const products = AVAILABLE_PRODUCTS.map((p) =>
    p.id === "print" ? { ...p, priceUsd: printPriceUsd } : p
  );
  const active = products.find((p) => p.id === sel)!;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {products.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSel(p.id)}
            aria-pressed={sel === p.id}
            style={{
              flex: "1 1 45%",
              padding: "7px 8px",
              borderRadius: 9,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              border: sel === p.id ? "1px solid var(--accent)" : "1px solid var(--line)",
              background: sel === p.id ? "var(--accent)" : "transparent",
              color: sel === p.id ? "#fff" : "var(--ink)",
            }}
          >
            {p.emoji} {p.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)", minHeight: 17, lineHeight: 1.35 }}>
        {active.blurb}
      </div>
      <form action="/api/order" method="post" style={{ marginTop: 10 }}>
        <input type="hidden" name="artworkId" value={artworkId} />
        <input type="hidden" name="productType" value={sel} />
        <button
          className="cta"
          style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "12px 18px" }}
        >
          Order {active.label.toLowerCase()} · ${active.priceUsd}
        </button>
      </form>
    </div>
  );
}
