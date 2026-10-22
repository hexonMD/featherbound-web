import type { Metadata } from "next";

// Unlisted internal tool — keep it out of search results.
export const metadata: Metadata = { title: "Pick plates", robots: { index: false, follow: false } };

export default function PickLayout({ children }: { children: React.ReactNode }) {
  return children;
}
