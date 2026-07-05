import { artistBySlug, artworksByArtist } from "@/lib/data";
import { notFound } from "next/navigation";

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artist = artistBySlug(slug);
  if (!artist) notFound();
  const works = artworksByArtist(slug);

  return (
    <main className="wrap">
      <div style={{ padding: "18px 0" }}>
        <a href="/#prints" style={{ color: "var(--ink-2)", fontSize: 14 }}>← Prints</a>
      </div>
      <div className="detail-head">
        <div className="info">
          <span className="pill">Illustrator</span>
          <h1 style={{ fontSize: 40 }}>{artist.name}</h1>
          {artist.location && <p style={{ color: "var(--ink-2)", marginTop: 4 }}>{artist.location}</p>}
          <p style={{ marginTop: 14, lineHeight: 1.55, maxWidth: 560 }}>{artist.bio}</p>
          {artist.links && (
            <div style={{ marginTop: 14, display: "flex", gap: 16 }}>
              {artist.links.map((l) => (
                <a key={l.url} href={l.url} style={{ color: "var(--accent)", fontWeight: 700 }}>{l.label}</a>
              ))}
            </div>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: 26, margin: "34px 0 18px" }}>Their birds</h2>
      <div className="prints" style={{ marginBottom: 60 }}>
        {works.map((a) => (
          <a key={a.id} className="print" href={`/print/${encodeURIComponent(a.speciesSci)}`}>
            <div className="frame"><img src={a.image} alt={a.speciesCommon} /></div>
            <div className="meta">
              <div className="name">{a.speciesCommon}</div>
              <div className="sci">{a.speciesSci}</div>
              <div className="price">${a.priceUsd}</div>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
