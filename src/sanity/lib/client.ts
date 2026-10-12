import { createClient } from "next-sanity";

function normalizeProjectId(raw?: string): string {
  const value = raw?.trim() || "";
  return /^[a-z0-9-]+$/.test(value) ? value : "";
}

/** Publikus Sanity ID — ugyanaz, mint a netlify.toml / CLOUDFLARE.md (nem secret). */
const DEFAULT_SANITY_PROJECT_ID = "ajkz39i8";

export const sanityProjectId = normalizeProjectId(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || DEFAULT_SANITY_PROJECT_ID,
);
export const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
export const sanityApiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-01-01";
export const sanityReadToken = process.env.SANITY_API_READ_TOKEN;

if (!sanityProjectId) {
  throw new Error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID");
}

/**
 * A Sanity CDN (`apicdn.sanity.io`) publikáláskor ürül, tehát a publikált
 * tartalom frissessége gyakorlatilag nem romlik tőle — viszont a lekérés
 * gyorsabb, és nem terheli az API kvótát. Ez rövidebb függvényfutásidőt
 * jelent minden szerveroldali renderen.
 *
 * Kivétel: ha van read token, az privilegizált olvasást jelent (privát
 * dataset vagy draft/preview tartalom) — ott maradunk az originnél, mert a
 * CDN tokenenként cache-el, és a draftoknál a frissesség kritikus. A projekt
 * jelenleg nem használ draft/preview módot, így ez az ág inaktív, de a
 * kapcsoló automatikusan visszavált, ha valaki bevezeti.
 */
const useSanityCdn = !sanityReadToken;

export const sanityClient = createClient({
  projectId: sanityProjectId,
  dataset: sanityDataset,
  apiVersion: sanityApiVersion,
  useCdn: useSanityCdn,
  token: sanityReadToken,
});

export function isSanityConfigured(): boolean {
  return Boolean(sanityProjectId && sanityDataset && sanityApiVersion);
}
