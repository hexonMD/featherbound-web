import { artworks } from "@/lib/data";
import StoreGrid from "@/components/StoreGrid";

export const metadata = {
  title: "Bird print store — FeatherBound",
  description:
    "Museum-quality fine-art prints of 1,682 birds — the full field-guide plate collection. Also on tees, mugs and totes. Printed to order, shipped worldwide.",
};

export default function StorePage() {
  // Slim payload for the client grid — just what a card + search needs.
  const items = artworks.map((a) => ({
    slug: a.slug,
    common: a.speciesCommon,
    image: a.image,
    price: a.priceUsd,
  }));

  return (
    <main className="wrap">
      <div style={{ padding: "18px 0" }}>
        <a href="/" style={{ color: "var(--ink-2)", fontSize: 14 }}>← Home</a>
      </div>
      <span className="pill">The print store</span>
      <h1 style={{ fontSize: 40, lineHeight: 1.05 }}>Every bird, as a print</h1>
      <p style={{ color: "var(--ink-2)", maxWidth: 640, margin: "14px 0 26px", lineHeight: 1.5 }}>
        Museum-quality fine-art prints of all {items.length.toLocaleString()} field-guide plates —
        also on tees, mugs and totes. Each is printed to order and shipped worldwide.
      </p>
      <StoreGrid items={items} />
      <div style={{ height: 60 }} />
    </main>
  );
}
