import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FeatherBound — the illustrated bird-identification game",
  description:
    "FeatherBound is a bird identification app that plays like a game: point your camera at a bird, identify it on-device, and collect its illustrated field-guide plate. Fill your BirdDex, compete with friends, and order fine-art prints.",
  metadataBase: new URL("https://featherbound.app"),
  keywords: [
    "bird identification app", "birding game", "bird watching app", "illustrated field guide",
    "bird collection game", "identify birds", "birdwatching",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "FeatherBound — the illustrated birding game",
    description:
      "Point your camera at a bird, identify it on-device, and collect its illustrated field-guide plate. Fill your BirdDex, compete with friends.",
    type: "website",
    url: "https://featherbound.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "FeatherBound — the illustrated birding game",
    description: "Identify birds and collect their illustrated field-guide plates.",
  },
};

const appLd = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: "FeatherBound",
  applicationCategory: "GameApplication",
  operatingSystem: "iOS",
  description:
    "A bird identification game: identify birds on-device and collect their illustrated field-guide plates.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  url: "https://featherbound.app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
        <header>
          <nav className="nav">
            <a className="brand" href="/">
              <img src="/robin.png" alt="FeatherBound" />
              FeatherBound
            </a>
            <div className="navlinks">
              <a href="/#features">The app</a>
              <a href="/#prints">Prints</a>
              <a href="/#artists">For artists</a>
            </div>
          </nav>
        </header>
        {children}
        <footer className="footer">
          <div className="wrap footer-grid">
            <div>
              <strong>FeatherBound</strong>
              <br />The illustrated birding game.
              <br />Brentwood Bay, BC
            </div>
            <div>
              <a href="/#features">The app</a>
              <br /><a href="/#prints">Prints</a>
              <br /><a href="/#artists">For artists</a>
            </div>
            <div>
              <a href="/privacy">Privacy</a>
              <br /><a href="/terms">Terms</a>
              <br /><a href="/support">Support</a>
            </div>
            <div>
              <a href="https://discord.gg/D6v2JD46g9" target="_blank" rel="noopener noreferrer">Discord community</a>
              <br /><a href="mailto:support@featherbound.app">Contact</a>
            </div>
          </div>
          <div className="wrap footer-legal">
            © 2026 FeatherBound · Prints fulfilled by Prodigi · Every plate © its artist
          </div>
        </footer>
      </body>
    </html>
  );
}
