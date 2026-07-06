import type { Metadata } from "next";
import { artworkBySlug } from "@/lib/data";
import ProductPicker from "@/components/ProductPicker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const art = artworkBySlug(decodeURIComponent(slug));
  if (!art) return { title: "Print — FeatherBound" };
  return {
    title: `${art.speciesCommon} fine-art print — FeatherBound`,
    description: `Museum-quality fine-art print of the ${art.speciesCommon} field-guide plate. Printed to order, shipped worldwide. Also on tee, mug and tote.`,
    openGraph: { images: [art.image] },
  };
}

export default async function PrintPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const art = artworkBySlug(decodeURIComponent(slug));

  if (!art) {
    return (
      <main className="wrap">
        <div style={{ padding: "18px 0" }}>
          <a href="/store" style={{ color: "var(--ink-2)", fontSize: 14 }}>← All birds</a>
        </div>
        <span className="pill">Print coming soon</span>
        <h1 style={{ fontSize: 40, lineHeight: 1.05 }}>Bird not found</h1>
        <p style={{ color: "var(--ink-2)", maxWidth: 620, marginTop: 14, lineHeight: 1.5 }}>
          We couldn&apos;t find that one. Browse the full collection instead.
        </p>
        <a className="cta" href="/store" style={{ marginTop: 24 }}>Browse all prints</a>
      </main>
    );
  }

  return (
    <main className="wrap">
      <div style={{ padding: "18px 0" }}>
        <a href="/store" style={{ color: "var(--ink-2)", fontSize: 14 }}>← All birds</a>
      </div>
      <span className="pill">Fine-art print</span>
      <h1 style={{ fontSize: 40, lineHeight: 1.05 }}>{art.speciesCommon}</h1>
      {art.speciesSci && (
        <p style={{ fontStyle: "italic", color: "var(--ink-2)", marginTop: 4 }}>{art.speciesSci}</p>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 32,
          alignItems: "flex-start",
          marginTop: 26,
          marginBottom: 60,
        }}
      >
        <div className="frame" style={{ flex: "1 1 320px", maxWidth: 460 }}>
          <img src={art.image} alt={art.title} style={{ width: "100%", display: "block" }} />
        </div>
        <div style={{ flex: "1 1 300px", maxWidth: 460 }}>
          <p style={{ color: "var(--ink-2)", lineHeight: 1.5 }}>
            Printed to order on museum-quality fine-art paper. Choose a size — or put the same
            plate on a tee, mug or tote. Shipped worldwide.
          </p>
          <ProductPicker artworkId={art.slug} printPriceUsd={art.priceUsd} />
        </div>
      </div>
    </main>
  );
}
