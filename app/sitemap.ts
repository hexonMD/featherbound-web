import type { MetadataRoute } from "next";
import { artworks } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://featherbound.app";
  const now = new Date();
  const species = [...new Set(artworks.map((a) => a.speciesSci))];
  const staticPages = ["", "/privacy", "/terms", "/support"];
  return [
    ...staticPages.map((p) => ({
      url: `${base}${p}`,
      lastModified: now,
      priority: p === "" ? 1 : 0.5,
    })),
    ...species.map((sci) => ({
      url: `${base}/print/${encodeURIComponent(sci)}`,
      lastModified: now,
      priority: 0.7,
    })),
  ];
}
