export const metadata = {
  title: "Terms of Use — FeatherBound",
  description: "The terms for using the FeatherBound app, buying prints, and submitting artwork.",
};

export default function Terms() {
  return (
    <main className="prose">
      <a className="back" href="/">← FeatherBound</a>
      <h1>Terms of Use</h1>
      <p className="updated">Last updated: July 2026</p>

      <p>By using FeatherBound — the app or this website — you agree to these terms.</p>

      <h2>Using the app</h2>
      <p>
        We grant you a personal, non-transferable licence to use FeatherBound for your own
        enjoyment. Don&rsquo;t misuse it: no cheating the collection (e.g. logging birds from
        photos you didn&rsquo;t take), scraping, reverse-engineering, or interfering with other
        players.
      </p>

      <h2>Your content</h2>
      <p>
        Photos and recordings you capture are yours. When you share a catch with friends or a
        league, you grant us a licence to store and display it to those people for that purpose.
      </p>

      <h2>Helping improve identification (optional)</h2>
      <p>
        This part is <strong>completely optional and off by default</strong>. FeatherBound works
        fully whether or not you take part, and you never have to. A future version of the app may
        offer a setting that lets you voluntarily contribute confirmed bird captures to help
        improve our identification models.
      </p>
      <p>
        If — and only if — you choose to turn that setting on, you grant FeatherBound a
        <strong> non-exclusive</strong> licence to use the confirmed bird photos, recordings, and
        their species labels to improve bird identification models. You keep ownership of your
        photos and recordings; we make no claim to them. You can withdraw at any time, which stops
        any further use of newly contributed captures.
      </p>

      <h2>Artist submissions</h2>
      <p>
        If you submit illustrations, <strong>you keep the copyright</strong>. You grant us a
        <strong> non-exclusive</strong> licence to display your art in the app beside the species
        you drew, credited to you, and to sell it as prints — and you remain free to use, license,
        or sell the same work anywhere else, unless we agree otherwise in writing. You earn a
        share of every print sold featuring your work; full contributor terms are shared when your
        submission is accepted. Only submit art you made and have the right to license.
      </p>

      <h2>Prints and purchases</h2>
      <p>
        Prints are made to order and fulfilled by our print partner. Order, shipping, and refund
        details are shown at checkout. Prices are in USD unless noted.
      </p>

      <h2>Disclaimers</h2>
      <p>
        FeatherBound identifies birds automatically and won&rsquo;t always be right — it&rsquo;s
        a game, not a scientific record. Rare-bird and nearby data come from third parties and
        are provided as-is. The app is provided &ldquo;as is&rdquo; without warranties, and our
        liability is limited to the maximum extent permitted by law.
      </p>

      <h2>Changes &amp; contact</h2>
      <p>
        We may update these terms; continued use means you accept the changes. These terms are
        governed by the laws of British Columbia, Canada. Questions? {" "}
        <a href="mailto:support@featherbound.app">support@featherbound.app</a>
      </p>
    </main>
  );
}
