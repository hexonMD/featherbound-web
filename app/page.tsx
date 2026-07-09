import { featured } from "@/lib/data";
import WaitlistForm from "@/components/WaitlistForm";

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <span className="hero-badge">An illustrated field guide</span>
        <h1>Collect the birds around you.</h1>
        <p className="sub">
          FeatherBound turns birdwatching into a living collection. Spot a bird, watch it
          bloom into an illustrated field-guide card, and fill your dex one species at a time.
        </p>
        <WaitlistForm />
        <p className="hero-note">
          Launching on iPhone soon — free to play. Launch updates only: one email when it
          lands, unsubscribe anytime, no spam.
          {" "}<a href="#prints" style={{ color: "var(--accent)", fontWeight: 700 }}>Or shop the prints →</a>
        </p>
        <div className="hero-art">
          <img src="/hero-icon.png" alt="FeatherBound field-guide robin" />
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <div className="wrap">
          <h2>Birding, illustrated.</h2>
          <p className="lead">
            Point your camera at a bird. On-device AI names it — your photos and recordings
            never leave your phone to be identified — and it reveals as a field-guide plate
            you keep forever.
          </p>
          <div className="grid3 shots">
            <div className="card shot">
              <div className="phone"><img src="/screen-match.png" alt="FeatherBound naming a photographed bird — a 97% match to a Steller's Jay" /></div>
              <h3>Spot &amp; reveal</h3>
              <p>Photo or birdsong — identified on-device, then revealed as an illustrated card with a little ceremony.</p>
            </div>
            <div className="card shot">
              <div className="phone"><img src="/screen-dex.png" alt="The BirdDex — every species, greyed until you find it" /></div>
              <h3>Your BirdDex</h3>
              <p>Every species, greyed until you find it — then it turns to full colour. Rarity, range and season on every page.</p>
            </div>
            <div className="card shot">
              <div className="phone"><img src="/screen-badges.png" alt="A FeatherBound friends' league — monthly leaderboard standings and a feed of friends' latest finds" /></div>
              <h3>Friends &amp; streaks</h3>
              <p>See what your friends have found, climb the leaderboards, keep a daily streak, and earn badges for the birds you chase.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Photo -> illustration transition */}
      <section className="section" id="transition">
        <div className="wrap">
          <h2>From your photo to a plate worth keeping.</h2>
          <p className="lead">
            Any honest sighting — even a blurry one — earns the full illustrated plate: the
            version of that bird worth framing.
          </p>
          <div className="transition">
            <figure className="tcard">
              <img src="/transition-photo.png" alt="A photo of a blue jay" />
              <figcaption>Your photo</figcaption>
            </figure>
            <div className="tarrow" aria-hidden="true">&rarr;</div>
            <figure className="tcard">
              <img src="/transition-plate.png?v=4" alt="The same blue jay as a illustrated field-guide plate" />
              <figcaption>Your card</figcaption>
            </figure>
          </div>
          <p className="tcredit">Photo: public domain</p>
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
              <a key={a.id} className="print" href={`/print/${a.slug}`}>
                <div className="frame">
                  <img src={a.image} alt={a.speciesCommon} loading="lazy" />
                </div>
                <div className="meta">
                  <div className="name">{a.speciesCommon}</div>
                  <div className="sci">{a.speciesSci}</div>
                  <div className="price">from ${a.priceUsd}</div>
                </div>
              </a>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 34 }}>
            <a className="cta" href="/store" style={{ display: "inline-flex" }}>
              Shop all 1,682 birds →
            </a>
          </div>
        </div>
      </section>

      {/* For artists */}
      <section className="section" id="artists">
        <div className="wrap">
          <h2>Help illustrate the guide.</h2>
          <p className="lead">
            Every plate in FeatherBound is an open commission. Illustrators are claiming species
            one by one — your art appears in the app beside the bird you drew, credited to you,
            and sells as a fine-art print you earn from.
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
          <div style={{ marginTop: 40 }}>
            <h3 style={{ textAlign: "center", fontSize: 24, marginBottom: 8 }}>What we look for</h3>
            <p style={{ textAlign: "center", color: "var(--ink-2)", maxWidth: 620, margin: "0 auto 24px", lineHeight: 1.5 }}>
              Art that&rsquo;s a joy in the app and holds up as a print. In short:
            </p>
            <ul className="look-for">
              <li><b>True to the bird.</b> Field-guide accurate — the right plumage, proportions and the key marks a birder identifies it by.</li>
              <li><b>One bird, clean plate.</b> A single species on a transparent or simple background, so it reads as a guide plate and drops cleanly onto a tee or mug.</li>
              <li><b>Print-ready.</b> High resolution — 300 DPI, longest edge at least 3000px — as a PNG or layered file.</li>
              <li><b>Your own work.</b> Original art you hold the rights to license — you keep the copyright and can keep using it anywhere else. A distinctive style is a plus; personality beats photorealism.</li>
              <li><b>Species that fill gaps.</b> Common North American and European birds help most first — that&rsquo;s most of what players are catching.</li>
              <li><b>A range, if you can.</b> Male/female or seasonal plumages of the same species are especially welcome.</li>
            </ul>
          </div>
          <div style={{ textAlign: "center", marginTop: 34 }}>
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
