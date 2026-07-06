// Product catalogue for print-on-demand. Every bird illustration can be ordered on any of
// these — Prodigi's API is product-agnostic (createProdigiOrder just takes a SKU plus the
// image as the print asset), so the same artwork maps onto a print, tee, mug or tote by
// swapping the SKU. The bird art is the print asset in every case.
//
// `available` gates what's actually buyable: only products whose Prodigi SKU is confirmed
// live in the catalogue are sellable, so no one can pay for something fulfilment can't make.
// print (GLOBAL-FAP-16X24) and shirt (GLOBAL-TEE-GIL-64000) verified 200 OK against Prodigi
// 2026-07-05; mug + tote SKUs returned 404 (wrong codes) — off until the real SKUs are set.
// `priceUsd` is retail; the fine-art print keeps its per-artwork price on the Artwork record
// and overrides the value here.
export type Product = {
  id: string;
  label: string;
  emoji: string;
  prodigiSku: string;
  priceUsd: number;
  blurb: string;
  available: boolean;
};

export const PRODUCTS: Product[] = [
  { id: "print", label: "Fine-art print", emoji: "🖼️", prodigiSku: "GLOBAL-FAP-16X24",     priceUsd: 34, blurb: 'Museum-quality fine-art paper, 16×24"', available: true },
  { id: "shirt", label: "T-shirt",        emoji: "👕", prodigiSku: "GLOBAL-TEE-GIL-64000",  priceUsd: 32, blurb: "Soft cotton unisex tee, front print",     available: true },
  { id: "mug",   label: "Mug",            emoji: "☕", prodigiSku: "GLOBAL-MUG-11OZ",        priceUsd: 18, blurb: "11oz ceramic mug, wrap print",           available: false },
  { id: "tote",  label: "Tote bag",       emoji: "👜", prodigiSku: "GLOBAL-TOTE-CO-16",      priceUsd: 24, blurb: "Cotton canvas tote, single-side print",  available: false },
];

// Only products with a confirmed-live Prodigi SKU — what the store actually offers.
export const AVAILABLE_PRODUCTS: Product[] = PRODUCTS.filter((p) => p.available);

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
