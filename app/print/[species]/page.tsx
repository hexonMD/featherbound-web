import { artworksForSpecies, artistBySlug, HOUSE } from "@/lib/data";
import { notFound } from "next/navigation";

export default async function PrintPage({ params }: { params: Promise<{ species: string }> }) {
  const { species } = await params;
  const sci = decodeURIComponent(species);
  const arts = artworksForSpecies(sci);
  if (arts.length === 0) notFound();

  const common = arts[0].speciesCommon;

  return (
    <main className="wrap">
      <div style={{ padding: "18px 0" }}>
        <a href="/#prints" style={{ color: "var(--ink-2)", fontSize: 14 }}>← All prints</a>
      </div>
      <span className="pill">Fine-art print</span>
      <h1 style={{ fontSize: 40, lineHeight: 1.05 }}>{common}</h1>
      <p style={{ fontStyle: "italic", color: "var(--ink-2)", marginTop: 4 }}>{sci}</p>
      <p style={{ color: "var(--ink-2)", maxWidth: 620, marginTop: 14, lineHeight: 1.5 }}>
        {arts.length > 1
          ? `${arts.length} artists have illustrated this bird. Choose your favourite — each is printed to order.`
          : "Printed to order on museum-quality fine-art paper, shipped worldwide."}
      </p>

      <div className="prints" style={{ marginTop: 28, marginBottom: 60 }}>
        {arts.map((a) => {
          const artist = a.artistSlug ? artistBySlug(a.artistSlug) : artistBySlug(HOUSE);
          const showArtist = !!a.artistSlug; // house pieces show no attribution
          return (
            <div key={a.id} className="print">
              <div className="frame">
                <img src={a.image} alt={a.title} />
              </div>
              <div className="meta">
                <div className="name">{a.title}</div>
                {showArtist && artist && (
                  <div className="artist">
                    by <a href={`/artists/${artist.slug}`} style={{ color: "var(--accent)", fontWeight: 700 }}>{artist.name}</a>
                  </div>
                )}
                <div className="price">${a.priceUsd}</div>
                <form action="/api/order" method="post" style={{ marginTop: 12 }}>
                  <input type="hidden" name="artworkId" value={a.id} />
                  <button className="cta" style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "12px 18px" }}>
                    Order print
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
