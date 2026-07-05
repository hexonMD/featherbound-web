// Product catalogue for print-on-demand. Every bird illustration can be ordered on any of
// these — Prodigi's API is product-agnostic (createProdigiOrder just takes a SKU plus the
// image as the print asset), so the same artwork maps onto a print, tee, mug or tote by
// swapping the SKU. The bird art is the print asset in every case.
//
// NOTE: the SKUs below are Prodigi catalogue identifiers and MUST be verified against the
// live Prodigi catalogue before checkout goes live — fulfilment is still gated on Stripe,
// so nothing is ordered against these yet. `priceUsd` is retail; the fine-art print keeps
// its per-artwork price on the Artwork record and overrides the value here.
export type Product = {
  id: string;
  label: string;
  emoji: string;
  prodigiSku: string;
  priceUsd: number;
  blurb: string;
};

export const PRODUCTS: Product[] = [
  { id: "print", label: "Fine-art print", emoji: "🖼️", prodigiSku: "GLOBAL-FAP-16X24",     priceUsd: 34, blurb: 'Museum-quality fine-art paper, 16×24"' },
  { id: "shirt", label: "T-shirt",        emoji: "👕", prodigiSku: "GLOBAL-TEE-GIL-64000",  priceUsd: 32, blurb: "Soft cotton unisex tee, front print" },
  { id: "mug",   label: "Mug",            emoji: "☕", prodigiSku: "GLOBAL-MUG-11OZ",        priceUsd: 18, blurb: "11oz ceramic mug, wrap print" },
  { id: "tote",  label: "Tote bag",       emoji: "👜", prodigiSku: "GLOBAL-TOTE-CO-16",      priceUsd: 24, blurb: "Cotton canvas tote, single-side print" },
];

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
