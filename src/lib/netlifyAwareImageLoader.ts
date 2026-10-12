import type { ImageLoaderProps } from "next/image";

/**
 * Sanity CMS képek → közvetlenül cdn.sanity.io (Netlify bandwidth nélkül).
 * Helyi / egyéb képek → továbbra is Netlify `/_next/image` (webp/avif).
 *
 * Korábban minden Sanity kép átment a Netlify Image CDN-en: a böngésző
 * a Netlifyről töltötte le a bájtokat → web bandwidth. A Sanity CDN
 * ugyanazt a w/q/auto=format optimalizálást adja, a forgalom viszont
 * nem a Netlify keretből megy.
 */
export default function netlifyAwareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const q = quality ?? 75;

  if (src.startsWith("https://cdn.sanity.io/")) {
    try {
      const url = new URL(src);
      url.searchParams.set("auto", "format");
      url.searchParams.set("fit", "max");
      url.searchParams.set("w", String(width));
      url.searchParams.set("q", String(q));
      return url.href;
    } catch {
      return src;
    }
  }

  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${q}`;
}
