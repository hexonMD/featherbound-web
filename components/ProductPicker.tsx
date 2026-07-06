"use client";
import { useState } from "react";
import { AVAILABLE_PRODUCTS, sizesFor, printSizeById } from "@/lib/products";

/// Per-artwork product selector. Only shows products with a confirmed-live Prodigi SKU
/// (AVAILABLE_PRODUCTS) so a buyer can't pay for something fulfilment can't make. Prints and
/// shirts also need a size — print size changes the price (bigger = pricier); shirt size is
/// flat. The chosen product + size posts to /api/order, which starts Stripe Checkout.
export default function ProductPicker({
  artworkId,
  printPriceUsd,
}: {
  artworkId: string;
  printPriceUsd: number;
}) {
  const defaultSize = (id: string) =>
    id === "print" ? "16x24" : sizesFor(id)[0]?.id ?? "";

  const [sel, setSel] = useState("print");
  const [size, setSize] = useState(defaultSize("print"));

  const products = AVAILABLE_PRODUCTS.map((p) =>
    p.id === "print" ? { ...p, priceUsd: printPriceUsd } : p
  );
  const active = products.find((p) => p.id === sel)!;
  const sizes = sizesFor(sel);

  // Print price scales with size off the artwork base; everything else is flat.
  const price =
    sel === "print" ? Math.round(printPriceUsd * printSizeById(size).mult) : active.priceUsd;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {products.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setSel(p.id);
              setSize(defaultSize(p.id));
            }}
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

      {sizes.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>
            {sel === "print" ? "Print size" : "Size"}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
            {sizes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSize(s.id)}
                aria-pressed={size === s.id}
                style={{
                  padding: "6px 11px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  border: size === s.id ? "1px solid var(--accent)" : "1px solid var(--line)",
                  background: size === s.id ? "var(--accent)" : "transparent",
                  color: size === s.id ? "#fff" : "var(--ink)",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <form action="/api/order" method="post" style={{ marginTop: 12 }}>
        <input type="hidden" name="artworkId" value={artworkId} />
        <input type="hidden" name="productType" value={sel} />
        <input type="hidden" name="size" value={size} />
        <button
          className="cta"
          style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "12px 18px" }}
        >
          Order {active.label.toLowerCase()} · ${price}
        </button>
      </form>
    </div>
  );
}
