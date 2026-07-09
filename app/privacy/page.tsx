export const metadata = {
  title: "Privacy Policy — FeatherBound",
  description: "How FeatherBound handles your data. Bird identification runs on-device; we collect the minimum needed to run your account, collection, and social features.",
};

export default function Privacy() {
  return (
    <main className="prose">
      <a className="back" href="/">← FeatherBound</a>
      <h1>Privacy Policy</h1>
      <p className="updated">Last updated: July 2026</p>

      <p>
        FeatherBound is a bird-identification and collection game for iPhone. We built it to
        collect as little about you as possible. This policy explains what we handle and why.
      </p>

      <h2>Identification runs on your device</h2>
      <p>
        When you photograph or record a bird, the identification happens <strong>on your
        phone</strong>. Your photos and recordings are not uploaded to us for identification —
        they only ever leave your phone if you choose to share a catch with friends or a league.
        Friends, leagues, and sharing are entirely optional.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Waitlist email</strong> — if you sign up on this site, we store your email address so we can tell you when the app launches. Nothing else.</li>
        <li><strong>Account details</strong> — if you sign in to use friends and leagues, we store your email address and the handle you choose.</li>
        <li><strong>Your collection</strong> — the birds you catch (species, time, and an approximate location) are saved so your collection syncs across your devices. If you use friends or leagues, cards you choose to share — including the photo and audio for those catches — are stored so your friends can see them.</li>
        <li><strong>Approximate location</strong> — used to show birds reported near you and to judge rarity. Exact coordinates are never stored or shared: any location saved on a card is rounded to roughly a kilometre first, and you control location access from iOS Settings at any time.</li>
        <li><strong>Push token</strong> — only if you turn on notifications, so we can send rare-bird and friend alerts.</li>
      </ul>

      <h2>Who processes it</h2>
      <p>
        We use a small set of service providers to run the app: Supabase (database and
        accounts), Cloudflare (media storage and delivery), and Apple (push notifications). We do
        not sell your data, and we do not use it for advertising.
      </p>

      <h2>Reference data</h2>
      <p>
        Identifying a bird runs entirely on your device and does not depend on any outside
        service. Separately, to show rarity, range, seasonality, and maps, the app draws on open
        and publicly available biodiversity data — including GBIF occurrence records, public
        bird-sighting information, and openly licensed map imagery. Your photos and recordings are
        never sent to these sources; they are only used to look up general information about a
        species.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>You can use the app to identify and collect birds without signing in — friends and leagues are optional.</li>
        <li>You control notifications and location access from iOS Settings at any time.</li>
        <li>To delete your account and associated data, email us at <a href="mailto:support@featherbound.app">support@featherbound.app</a>.</li>
      </ul>

      <h2>Children</h2>
      <p>FeatherBound is not directed to children under 13, and we do not knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>If we change this policy we&rsquo;ll update the date above and, for material changes, note it in the app.</p>

      <h2>Contact</h2>
      <p>Questions? <a href="mailto:support@featherbound.app">support@featherbound.app</a></p>
    </main>
  );
}
