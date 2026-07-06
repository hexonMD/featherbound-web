export const metadata = {
  title: "Support — FeatherBound",
  description: "Get help with FeatherBound — the bird-identification and collection game.",
};

export default function Support() {
  return (
    <main className="prose">
      <a className="back" href="/">← FeatherBound</a>
      <h1>Support</h1>
      <p className="updated">We&rsquo;re a two-person team and we read every message.</p>

      <p>
        Need a hand, found a bug, or want a bird added to the guide? Email us at{" "}
        <a href="mailto:support@featherbound.app">support@featherbound.app</a> and we&rsquo;ll
        get back to you.
      </p>

      <h2>Common questions</h2>

      <h2>Does identification really run on my phone?</h2>
      <p>Yes. Photos and recordings are identified on-device — they aren&rsquo;t uploaded to us to name a bird.</p>

      <h2>Is it free?</h2>
      <p>FeatherBound is free to download and play.</p>

      <h2>How do I delete my account?</h2>
      <p>Email <a href="mailto:support@featherbound.app">support@featherbound.app</a> from your account address and we&rsquo;ll remove your account and its data.</p>

      <h2>A print question or order issue?</h2>
      <p>Email us with your order details and we&rsquo;ll sort it out.</p>

      <h2>I&rsquo;m an illustrator — how do I contribute?</h2>
      <p>See <a href="/#artists">Help illustrate the guide</a>, or email <a href="mailto:artists@featherbound.app">artists@featherbound.app</a>.</p>
    </main>
  );
}
