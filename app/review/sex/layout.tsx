import type { Metadata } from "next";

// Unlisted internal tool — keep it out of search results.
export const metadata: Metadata = { title: "M/F labels", robots: { index: false, follow: false } };

export default function SexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
