import { featured } from "@/lib/data";

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <span className="hero-badge">A hand-illustrated field guide</span>
        <h1>Collect the birds around you.</h1>
        <p className="sub">
          Feather Bound turns birdwatching into a living collection. Spot a bird, watch it
          bloom into a hand-drawn card, and build your field guide one species at a time.
        </p>
        <div className="cta-row">
          <a className="cta" href="#">Download for iPhone</a>
          <a className="cta ghost" href="#prints">Shop the prints</a>
        </div>
        <div className="hero-art">
          <img src="/robin.png" alt="Feather Bound field-guide robin" />
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <div className="wrap">
          <h2>Birding, illustrated.</h2>
          <p className="lead">
            Point your camera at a bird. On-device AI names it, and it reveals as a
            field-guide plate you keep forever.
          </p>
          <div className="grid3">
            <div className="card">
              <div className="emoji">🔭</div>
              <h3>Spot &amp; reveal</h3>
              <p>Photo or birdsong — identified on-device, then revealed as an illustrated card with a little ceremony.</p>
            </div>
            <div className="card">
              <div className="emoji">📖</div>
              <h3>Your BirdDex</h3>
              <p>Every North-American species, greyed until you find it — then it turns to full colour. Rarity, range and season on every page.</p>
            </div>
            <div className="card">
              <div className="emoji">🪶</div>
              <h3>Streaks &amp; badges</h3>
              <p>Daily quests, rare-bird alerts near you, and collectible badges for the birds you chase.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Prints */}
      <section className="section" id="prints">
        <div className="wrap">
          <h2>Prints of your favourite birds.</h2>
          <p className="lead">
            Museum-quality fine-art prints of the field-guide plates, printed to order and
            shipped worldwide. A share of every sale goes to the illustrator.
          </p>
          <div className="prints">
            {featured.map((a) => (
              <a key={a.id} className="print" href={`/print/${encodeURIComponent(a.speciesSci)}`}>
                <div className="frame">
                  <img src={a.image} alt={a.speciesCommon} />
                </div>
                <div className="meta">
                  <div className="name">{a.speciesCommon}</div>
                  <div className="sci">{a.speciesSci}</div>
                  <div className="price">${a.priceUsd}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
