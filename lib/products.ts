// Product catalogue for print-on-demand. Every bird illustration can be ordered on any of
// these — Prodigi's API is product-agnostic (createProdigiOrder just takes a SKU plus the
// image as the print asset), so the same artwork maps onto a print, tee, mug or tote by
// swapping the SKU. The bird art is the print asset in every case.
//
// `available` gates what's actually buyable: only products whose Prodigi SKU is confirmed
// live in the catalogue are sellable, so no one can pay for something fulfilment can't make.
// All four SKUs verified 200 OK against the live Prodigi product API 2026-07-05:
//   print GLOBAL-FAP-16X24 · shirt GLOBAL-TEE-GIL-64000 · mug GLOBAL-MUG-W · tote H-BAG-CTB.
// (Tote is H-… = UK-fulfilled — no global variant exists; it still ships worldwide, from UK.)
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
  { id: "print", label: "Fine-art print", emoji: "🖼️", prodigiSku: "GLOBAL-FAP-16X24",     priceUsd: 34, blurb: 'Museum-quality fine-art paper', available: true },
  // Apparel/drinkware verified + fulfil-ready, but hidden for launch — prints only for now.
  { id: "shirt", label: "T-shirt",        emoji: "👕", prodigiSku: "GLOBAL-TEE-GIL-64000",  priceUsd: 32, blurb: "Soft cotton unisex tee, front print",     available: false },
  { id: "mug",   label: "Mug",            emoji: "☕", prodigiSku: "GLOBAL-MUG-W",           priceUsd: 18, blurb: "11oz white ceramic mug, full wrap print",  available: false },
  { id: "tote",  label: "Tote bag",       emoji: "👜", prodigiSku: "H-BAG-CTB",              priceUsd: 24, blurb: 'Canvas tote, 14×18.5", single-side print', available: false },
];

// Only products with a confirmed-live Prodigi SKU — what the store actually offers.
export const AVAILABLE_PRODUCTS: Product[] = PRODUCTS.filter((p) => p.available);

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

// ── Sizes ────────────────────────────────────────────────────────────────────
// Prints and shirts need a size; mug + tote don't. They work differently in Prodigi:
//   • Print size = a DIFFERENT SKU per size (GLOBAL-FAP-<size>), all verified 200 OK.
//     Price scales off the artwork's own base price via `mult` (base = 16×24 = 1.0).
//   • Shirt size = the SAME SKU + a `size` attribute on the order (plus a `color`), so we
//     pass those through to Prodigi. Sizes are Prodigi's lowercase codes (s, m, l, …).

export type PrintSize = { id: string; label: string; sku: string; mult: number };
export const PRINT_SIZES: PrintSize[] = [
  { id: "8x10",  label: '8 × 10"',  sku: "GLOBAL-FAP-8X10",  mult: 0.60 },
  { id: "11x14", label: '11 × 14"', sku: "GLOBAL-FAP-11X14", mult: 0.78 },
  { id: "12x16", label: '12 × 16"', sku: "GLOBAL-FAP-12X16", mult: 0.88 },
  { id: "16x24", label: '16 × 24"', sku: "GLOBAL-FAP-16X24", mult: 1.0 },
  { id: "18x24", label: '18 × 24"', sku: "GLOBAL-FAP-18X24", mult: 1.15 },
  { id: "24x36", label: '24 × 36"', sku: "GLOBAL-FAP-24X36", mult: 1.55 },
];
export const DEFAULT_PRINT_SIZE = "16x24";
export function printSizeById(id: string): PrintSize {
  return PRINT_SIZES.find((s) => s.id === id) ?? PRINT_SIZES.find((s) => s.id === DEFAULT_PRINT_SIZE)!;
}

export type ShirtSize = { id: string; label: string };
export const SHIRT_SIZES: ShirtSize[] = [
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
  { id: "xl", label: "XL" },
  { id: "2xl", label: "2XL" },
];
// The bird art reads best on a light base; offer colour choice later if wanted.
export const SHIRT_COLOR = "white";

/// Sizes to show for a product (empty = no size picker). Print uses PRINT_SIZES; shirt SHIRT_SIZES.
export function sizesFor(productId: string): { id: string; label: string }[] {
  if (productId === "print") return PRINT_SIZES.map((s) => ({ id: s.id, label: s.label }));
  if (productId === "shirt") return SHIRT_SIZES;
  return [];
}
