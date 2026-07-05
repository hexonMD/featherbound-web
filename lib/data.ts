// Feather Bound marketplace data model.
//
// A bird species can have MANY artworks (different artists may each submit their own take
// on the same bird). Each artwork is by one artist and is sold as a print via Prodigi.
// The default plates shipped in the app are "house" pieces (no external artist yet) — those
// show no artist attribution in-app, per product rules. Seeded here now; moves to Postgres
// once the marketplace opens to real illustrators.

export type Artist = {
  slug: string;
  name: string;
  bio: string;
  avatar?: string;
  location?: string;
  links?: { label: string; url: string }[];
};

export type Artwork = {
  id: string;
  speciesSci: string;   // scientific name — the key shared with the app's dex
  speciesCommon: string;
  artistSlug: string | null;   // null = house / AI plate, no attribution
  image: string;        // print-resolution art
  title: string;
  prodigiSku: string;   // Prodigi product SKU for fulfilment
  priceUsd: number;
};

// House artist marker — used for the app's own plates until real artists submit.
export const HOUSE = "house";

export const artists: Artist[] = [
  {
    slug: HOUSE,
    name: "Feather Bound Studio",
    bio: "The house field-guide plates that ship with the app.",
    location: "Brentwood Bay, BC",
  },
  // Real illustrators land here as the marketplace opens.
];

export const artworks: Artwork[] = [
  {
    id: "robin-house",
    speciesSci: "Turdus migratorius",
    speciesCommon: "American Robin",
    artistSlug: null,
    image: "/plate-robin.png",
    title: "American Robin — Field Plate",
    prodigiSku: "GLOBAL-FAP-16X24",
    priceUsd: 34,
  },
  {
    id: "chickadee-house",
    speciesSci: "Poecile atricapillus",
    speciesCommon: "Black-capped Chickadee",
    artistSlug: null,
    image: "/plate-chickadee.png",
    title: "Black-capped Chickadee — Field Plate",
    prodigiSku: "GLOBAL-FAP-16X24",
    priceUsd: 34,
  },
  {
    id: "goldfinch-house",
    speciesSci: "Spinus tristis",
    speciesCommon: "American Goldfinch",
    artistSlug: null,
    image: "/plate-goldfinch.png",
    title: "American Goldfinch — Field Plate",
    prodigiSku: "GLOBAL-FAP-16X24",
    priceUsd: 34,
  },
];

export function artworksForSpecies(sci: string): Artwork[] {
  return artworks.filter((a) => a.speciesSci.toLowerCase() === sci.toLowerCase());
}

export function artworksByArtist(slug: string): Artwork[] {
  return artworks.filter((a) => (a.artistSlug ?? HOUSE) === slug);
}

export function artistBySlug(slug: string): Artist | undefined {
  return artists.find((a) => a.slug === slug);
}

// A few showcase species for the landing/store grid.
export const featured = artworks;
