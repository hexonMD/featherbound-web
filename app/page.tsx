import { featured } from "@/lib/data";

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <span className="hero-badge">An illustrated field guide</span>
        <h1>Collect the birds around you.</h1>
        <p className="sub">
          Feather Bound turns birdwatching into a living collection. Spot a bird, watch it
          bloom into an illustrated field-guide card, and fill your dex one species at a time.
        </p>
        <div className="cta-row">
          <a href="#" aria-label="Download on the App Store" className="badge">
            <svg width="176" height="58" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
              <rect width="120" height="40" rx="7" fill="#000" />
              <path
                fill="#fff"
                transform="translate(9.5,9) scale(1.15)"
                d="M11.7 8.6c-.01-1.36 1.11-2.01 1.16-2.05-.63-.92-1.62-1.05-1.97-1.06-.84-.09-1.63.49-2.05.49-.42 0-1.08-.48-1.77-.47-.91.01-1.75.53-2.22 1.35-.95 1.64-.24 4.07.68 5.4.45.65.99 1.38 1.69 1.36.68-.03.93-.44 1.75-.44.81 0 1.05.44 1.76.42.72-.01 1.18-.66 1.63-1.32.51-.75.72-1.48.73-1.51-.02-.01-1.4-.54-1.42-2.13zM10.36 4.55c.37-.45.62-1.08.55-1.7-.53.02-1.19.36-1.57.8-.34.4-.65 1.03-.57 1.63.6.05 1.21-.3 1.59-.73z"
              />
              <text x="34" y="16" fill="#fff" fontFamily="Helvetica, Arial, sans-serif" fontSize="6.6">Download on the</text>
              <text x="34" y="31" fill="#fff" fontFamily="Helvetica, Arial, sans-serif" fontSize="15" fontWeight="600">App Store</text>
            </svg>
          </a>
          <a className="cta ghost" href="#prints">Shop the prints</a>
        </div>
        <div className="hero-art">
          <img src="/hero-icon.png" alt="Feather Bound field-guide robin" />
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

      {/* For artists */}
      <section className="section" id="artists">
        <div className="wrap">
          <h2>Help illustrate the guide.</h2>
          <p className="lead">
            The plates you see today are placeholders — we&rsquo;re inviting real illustrators
            to make them their own. Submit your bird art: it appears in the app next to the
            bird you drew, credited to you, and sells as a fine-art print you earn from.
          </p>
          <div className="artist-cta">
            <div className="card">
              <h3>1 · Submit</h3>
              <p>Send us your bird illustrations. Any species in the guide can carry several artists&rsquo; versions.</p>
            </div>
            <div className="card">
              <h3>2 · We feature</h3>
              <p>Approved pieces appear in the app beside your bird and go on sale as museum-quality prints, shipped by Prodigi.</p>
            </div>
            <div className="card">
              <h3>3 · You earn</h3>
              <p>You earn from every print sold, with your own artist profile and portfolio on the site.</p>
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 30 }}>
            <a className="cta" href="mailto:artists@featherbound.app?subject=Feather%20Bound%20artist%20submission">
              Submit your art
            </a>
            <p style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 14, opacity: 0.75 }}>
              Artists keep the majority of each print sale; full contributor terms shared on acceptance.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
