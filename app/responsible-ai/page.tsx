export const metadata = {
  title: "Responsible AI — FeatherBound",
  description:
    "How FeatherBound approaches AI responsibly: identification runs on-device, your photos aren't uploaded to identify a bird, model improvement is opt-in, and creators and data licences are respected.",
};

export default function ResponsibleAI() {
  return (
    <main className="prose">
      <a className="back" href="/">← FeatherBound</a>
      <h1>Responsible AI</h1>
      <p className="updated">Last updated: July 2026</p>

      <p>
        FeatherBound uses AI to name the birds you find and turn them into illustrated cards. We
        try to do that in a way we&rsquo;d be comfortable explaining to any birder, artist, or
        parent. Here&rsquo;s how it works, in plain English.
      </p>

      <h2>Identification runs on your device</h2>
      <p>
        When you photograph or record a bird, the AI that names it runs <strong>on your
        phone</strong>. It doesn&rsquo;t need a server, and it doesn&rsquo;t depend on any outside
        identification service.
      </p>

      <h2>Your photos aren&rsquo;t uploaded to identify a bird</h2>
      <p>
        Naming a bird never sends your photo or recording anywhere. They only ever leave your
        phone if <em>you</em> choose to share a catch with friends or a league — and sharing is
        entirely optional.
      </p>

      <h2>Improving the models is optional</h2>
      <p>
        The identification models get better over time, but not at the cost of your privacy. Any
        future ability to contribute your confirmed captures to help improve them is
        <strong> opt-in and off by default</strong> — you can use FeatherBound fully without ever
        taking part, and you can withdraw whenever you like. We never claim ownership of your
        photos or recordings.
      </p>

      <h2>Our identification models are our own</h2>
      <p>
        The models that name your birds are built by us, not rented from a third party. We create
        them by <em>distilling</em> openly-licensed foundation models — a permissively-licensed
        vision model for photos, and a permissively-licensed bird-sound model for calls — down into
        small models that run entirely on your phone. Our photo model is trained{" "}
        <strong>only on images released under public-domain or Creative Commons CC0 / CC-BY
        licences</strong>, which permit commercial use. Our sound model is our own clean-room model
        — we do not use Cornell&rsquo;s BirdNET or any dataset whose terms forbid this use.
      </p>

      <h2>We respect creators and data licences</h2>
      <p>
        Our house field-guide plates are illustrations produced by our own pipeline — they are not
        lifted from photographers or artists. As the print marketplace opens, work by named
        illustrators will be credited to them, and they keep the copyright to their own work.
        Reference information — rarity, range, and seasonality — is built from open, publicly
        available biodiversity data used within its licence. Across the board we build on models
        and data we&rsquo;re permitted to use commercially, and we avoid sources whose terms
        don&rsquo;t allow it.
      </p>

      <h2>No ads, no selling your data</h2>
      <p>
        FeatherBound isn&rsquo;t funded by advertising, and we don&rsquo;t sell your personal data.
        It&rsquo;s a game and a print shop — that&rsquo;s the whole business.
      </p>

      <h2>Questions</h2>
      <p>
        Happy to talk about any of this: <a href="mailto:support@featherbound.app">support@featherbound.app</a>.
        See also our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Use</a>.
      </p>
    </main>
  );
}
