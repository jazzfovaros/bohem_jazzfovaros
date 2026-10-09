import type { MetadataRoute } from "next";
import { getBuildLocale } from "@/lib/buildLocale";
import { siteUrlForLocale } from "@/lib/seo";
import { isStagingOrLocalHost } from "@/lib/localeMode";

export const dynamic = "force-static";

/**
 * Botok elől zárt útvonalak.
 *
 * Nem a legitim keresőket tiltjuk (a publikus oldalak továbbra is
 * indexelhetők), hanem azokat a végpontokat, amelyeknek semmi keresési
 * értékük nincs, viszont crawlolva Netlify Function / Edge Function
 * hívásokat generálnak:
 *  - /studio  — Sanity Studio admin SPA
 *  - /api     — belső, token-védett végpontok
 *  - /oldal/  — legacy redirect-prefix (308-cal a kanonikus URL-re megy)
 */
const DISALLOWED = ["/studio", "/studio/", "/api/", "/oldal/"];

/** Agresszív SEO-crawlerek: nincs belőlük forgalom, viszont drágák. */
const BLOCKED_BOTS = [
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "PetalBot",
  "DataForSeoBot",
  "Bytespider",
];

/**
 * Staging host (*.netlify.app / *.workers.dev) felismerése.
 *
 * A `CONTEXT` önmagában nem elég: ha ugyanabból a repóból egy második Netlify
 * site is fut (pl. bohemjazz.netlify.app), annak a deployja is
 * `CONTEXT=production`, tehát `Allow: /`-t kapna. A site saját URL-je
 * elárulja, hogy nem az éles domainen vagyunk. Cloudflare Workers preview
 * ugyanez: *.workers.dev.
 */
function isStagingDeployHost(): boolean {
  const deployUrl = (
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.CF_PAGES_URL ||
    ""
  ).trim();
  if (!deployUrl) return false;
  try {
    return isStagingOrLocalHost(new URL(deployUrl).hostname);
  } catch {
    return false;
  }
}

export default function robots(): MetadataRoute.Robots {
  const context = process.env.CONTEXT?.toLowerCase();
  const isPreviewDeploy =
    context === "deploy-preview" || context === "branch-deploy" || context === "dev";
  const isProduction =
    (context === "production" ||
      (!isPreviewDeploy && !context && process.env.NODE_ENV === "production")) &&
    !isStagingDeployHost();
  const locale = getBuildLocale();
  const siteUrl = siteUrlForLocale(locale);

  if (!isProduction) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      sitemap: `${siteUrl}/sitemap.xml`,
    };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOWED },
      { userAgent: BLOCKED_BOTS, disallow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
