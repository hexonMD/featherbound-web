import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Feather Bound — Collect the birds around you",
  description:
    "A hand-illustrated field guide that turns birdwatching into a collection. Spot birds, reveal illustrated cards, and order fine-art prints of your favourites.",
  metadataBase: new URL("https://featherbound.app"),
  openGraph: {
    title: "Feather Bound",
    description: "Collect the birds around you. A hand-illustrated birding game.",
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
              <img src="/robin.png" alt="Feather Bound" />
              Feather Bound
            </a>
            <div className="navlinks">
              <a href="/#features">The app</a>
              <a href="/#prints">Prints</a>
              <a href="/artists/house">Artists</a>
            </div>
          </nav>
        </header>
        {children}
        <footer className="footer">
          <div className="wrap">
            Feather Bound · a hand-illustrated field guide · Brentwood Bay, BC
            <br />
            Prints fulfilled by Prodigi. Artwork © its illustrators.
          </div>
        </footer>
      </body>
    </html>
  );
}
