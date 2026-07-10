// FeatherBound marketplace data model.
//
// A bird species can have MANY artworks (different artists may each submit their own take
// on the same bird). Each artwork is by one artist and is sold as a print via Prodigi.
// The default plates shipped in the app are "house" pieces (no external artist yet) — those
// show no artist attribution in-app, per product rules. The full 1,682-bird catalogue is
// generated from the flock-plates set (lib/birds.ts); real illustrators' artworks land in
// Postgres once the marketplace opens.

import { BIRDS, plateUrl, type Bird, type Region } from "./birds";

export type Artist = {
  slug: string;
  name: string;
  bio: string;
  avatar?: string;
  location?: string;
  links?: { label: string; url: string }[];
};

export type Artwork = {
  id: string;           // = plate slug (unique, URL-safe)
  speciesSci: string;   // scientific name — the key shared with the app's dex ("" for a few)
  speciesCommon: string;
  slug: string;
  artistSlug: string | null;   // null = house / AI plate, no attribution
  image: string;        // print asset (jsDelivr CDN of the flock-plates repo)
  title: string;
  prodigiSku: string;   // default print SKU; size ladder in lib/products.ts overrides per size
  priceUsd: number;     // base (16×24) price; size multipliers scale it
  regions: Region[];    // "na" | "eu" for the store's location filter (empty = rest of world)
};

// House artist marker — used for the app's own plates until real artists submit.
export const HOUSE = "house";
// Single-plate 16×24 base, all-in (we absorb Prodigi shipping — no shipping line at checkout).
// $34 barely cleared shipping (≈$3 net to Canada); $39 lifts US margin to ~40% and keeps
// Canada positive, while staying under the collage's $44 so the collection print stays the
// premium buy. Sizes scale off this via PRINT_SIZES.mult.
const BASE_PRINT_PRICE = 39;

export const artists: Artist[] = [
  {
    slug: HOUSE,
    name: "FeatherBound Studio",
    bio: "The house field-guide plates that ship with the app.",
    location: "Brentwood Bay, BC",
  },
  // Real illustrators land here as the marketplace opens.
];

// The whole dex, as house-plate artworks — one per bird with a flock-plate (1,682).
export const artworks: Artwork[] = BIRDS.map((b: Bird) => ({
  id: b.slug,
  speciesSci: b.sci,
  speciesCommon: b.common,
  slug: b.slug,
  artistSlug: null,
  image: plateUrl(b.slug),
  title: `${b.common} — Field Plate`,
  prodigiSku: "GLOBAL-FAP-16X24",
  priceUsd: BASE_PRINT_PRICE,
  regions: b.regions,
}));

const bySlug = new Map(artworks.map((a) => [a.slug, a]));
const bySci = new Map(
  artworks.filter((a) => a.speciesSci).map((a) => [a.speciesSci.toLowerCase(), a])
);
export function artworkBySlug(slug: string): Artwork | undefined {
  return bySlug.get(slug);
}

// Resolve a /print/<x> path param that may be a slug (new /store links) OR a scientific name
// (the in-app "Buy this bird as a print" link sends the sci) OR a common name. Keeps existing
// shipped-app links working without an app update.
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
export function resolveArtwork(param: string): Artwork | undefined {
  const p = decodeURIComponent(param);
  return bySlug.get(p) ?? bySci.get(p.toLowerCase()) ?? bySlug.get(slugify(p));
}

export function artworksForSpecies(sci: string): Artwork[] {
  return sci ? artworks.filter((a) => a.speciesSci.toLowerCase() === sci.toLowerCase()) : [];
}

export function artworksByArtist(slug: string): Artwork[] {
  return artworks.filter((a) => (a.artistSlug ?? HOUSE) === slug);
}

export function artistBySlug(slug: string): Artist | undefined {
  return artists.find((a) => a.slug === slug);
}

// A curated handful of recognizable birds for the landing hero; the store shows all of them.
const FEATURED_SLUGS = [
  "american-robin", "northern-cardinal", "blue-jay", "american-goldfinch",
  "black-capped-chickadee", "baltimore-oriole", "eastern-bluebird", "cedar-waxwing",
  "european-robin", "barn-owl", "belted-kingfisher", "painted-bunting",
];
export const featured: Artwork[] =
  FEATURED_SLUGS.map((s) => bySlug.get(s)).filter((a): a is Artwork => !!a);
