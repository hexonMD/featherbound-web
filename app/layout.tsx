import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FeatherBound — Collect the birds around you",
  description:
    "An illustrated field guide that turns birdwatching into a collection. Spot birds, reveal field-guide cards, and order fine-art prints of your favourites.",
  metadataBase: new URL("https://featherbound.app"),
  openGraph: {
    title: "FeatherBound",
    description: "Collect the birds around you. An illustrated birding game.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
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
          <div className="wrap">
            FeatherBound · an illustrated field guide · Brentwood Bay, BC
            <br />
            Prints fulfilled by Prodigi. Artwork © its illustrators.
          </div>
        </footer>
      </body>
    </html>
  );
}
