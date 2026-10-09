import { NextRequest, NextResponse } from "next/server";
import { getBuildLocale } from "@/lib/buildLocale";
import { SITE_URL_HU, siteUrlForLocale } from "@/lib/seo";
import {
  isEnPathname,
  isJazzCapitalHost,
  isYearArchiveHost,
  normalizeSiteUrl,
  SITE_LOCALE_HEADER,
  SITE_PATHNAME_HEADER,
  shouldUsePathPrefixLocale,
  stripEnPathPrefix,
} from "@/lib/localeMode";
import { logEdgeRequest } from "@/lib/usage/edgeLog";

const BUILD_LOCALE = getBuildLocale();

/**
 * Netlify Durable CDN cache a dinamikusan renderelt HTML/RSC válaszokra.
 *
 * A Next.js `Cache-Control: private,no-store`-t küld minden dinamikus route-ra,
 * ezért a Netlify CDN korábban MINDEN oldalletöltést az origin függvényhez
 * továbbított (= 1 Function Invocation / kérés). A `Netlify-CDN-Cache-Control`
 * csak a Netlify CDN-re vonatkozik (a böngésző cache-ére nem), így a tartalom
 * frissessége a `s-maxage` ablakon belül marad, de egy URL-t percenként
 * legfeljebb egyszer kell újrarenderelni.
 *
 * A locale-t kizárólag az URL határozza meg (`/en/...` vs `/...`), és a válasz
 * nem tartalmaz `Set-Cookie`-t, ezért az URL teljes értékű cache-kulcs.
 */
const CDN_CACHE_CONTROL =
  "public, s-maxage=60, stale-while-revalidate=240, durable";

/** Draft/preview kérés — ilyenkor soha nem cache-elünk. */
function isDraftRequest(request: NextRequest): boolean {
  return (
    request.cookies.has("__prerender_bypass") ||
    request.cookies.has("__next_preview_data")
  );
}

function applyCdnCache(response: NextResponse, request: NextRequest): NextResponse {
  if (request.method !== "GET" && request.method !== "HEAD") return response;
  if (isDraftRequest(request)) {
    response.headers.set("Netlify-CDN-Cache-Control", "no-store");
    response.headers.set("CDN-Cache-Control", "no-store");
    return response;
  }
  /* Netlify Durable CDN + Cloudflare CDN (átállás alatt mindkettő) */
  response.headers.set("Netlify-CDN-Cache-Control", CDN_CACHE_CONTROL);
  response.headers.set("CDN-Cache-Control", CDN_CACHE_CONTROL);
  return response;
}

/** Defensive redirect ha jazzcapital.hu eléri a Netlify appot (elsődleges: DNS/provider szintű 301). */
function jazzCapitalRedirectTarget(): string {
  const hu = process.env.NEXT_PUBLIC_SITE_URL_HU?.trim();
  const base = hu ? normalizeSiteUrl(hu) : normalizeSiteUrl(SITE_URL_HU);
  return `${base}/en/`;
}

/**
 * Másodlagos védelem a matcher mellett: ha a matcher bármiért átengedne egy
 * asset-kérést, itt akkor is azonnal kilépünk (a matcher a valódi szűrő,
 * mert csak az akadályozza meg az Edge Function elindulását).
 */
function isBypassedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/studio") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

function attachLocaleHeaders(
  request: NextRequest,
  locale: "hu" | "en",
): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SITE_LOCALE_HEADER, locale);
  requestHeaders.set(SITE_PATHNAME_HEADER, request.nextUrl.pathname);
  return requestHeaders;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.nextUrl.hostname;
  const method = request.method;

  if (isBypassedPath(pathname)) {
    return NextResponse.next();
  }

  const log = (outcome: "next" | "redirect" | "rewrite", status?: number) =>
    logEdgeRequest({
      pathname,
      method,
      headers: request.headers,
      outcome,
      status,
    });

  /* Archív éves subdomain — ne módosítsuk (2024.jazzfovaros.hu stb. régi hostingon marad). */
  if (isYearArchiveHost(hostname)) {
    return NextResponse.next();
  }

  /* jazzcapital.hu → jazzfovaros.hu/en/ (ha egyáltalán eléri az appot). */
  if (isJazzCapitalHost(hostname)) {
    log("redirect", 308);
    return applyCdnCache(
      NextResponse.redirect(jazzCapitalRedirectTarget(), 308),
      request,
    );
  }

  if (isEnPathname(pathname)) {
    const targetPath = stripEnPathPrefix(pathname);

    if (BUILD_LOCALE === "en") {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = targetPath;
      log("redirect", 308);
      return applyCdnCache(NextResponse.redirect(nextUrl, 308), request);
    }

    if (!shouldUsePathPrefixLocale(hostname)) {
      const enSite = siteUrlForLocale("en");
      const redirectUrl = new URL(targetPath, enSite);
      log("redirect", 308);
      return applyCdnCache(NextResponse.redirect(redirectUrl, 308), request);
    }

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = targetPath;
    const requestHeaders = attachLocaleHeaders(request, "en");
    const response = NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });
    log("rewrite");
    return applyCdnCache(response, request);
  }

  if (pathname === "/tabor" || pathname === "/tabor/") {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = "/jazztabor";
    log("redirect", 308);
    return applyCdnCache(NextResponse.redirect(nextUrl, 308), request);
  }

  if (pathname === "/oldal" || pathname === "/oldal/" || pathname.startsWith("/oldal/")) {
    const stripped = pathname.replace(/^\/oldal/, "") || "/";
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = stripped === "" ? "/" : stripped;
    log("redirect", 308);
    return applyCdnCache(NextResponse.redirect(nextUrl, 308), request);
  }

  if (shouldUsePathPrefixLocale(hostname)) {
    const requestHeaders = attachLocaleHeaders(request, "hu");
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    log("next");
    return applyCdnCache(response, request);
  }

  /* Két-domain módban a locale a buildből jön, de az eredeti path-t így is
     továbbadjuk — ebből tudja a szerveroldali használati számláló, hogy ez egy
     valódi futásidejű kérés (és nem build-time render). */
  const passthroughHeaders = new Headers(request.headers);
  passthroughHeaders.set(SITE_PATHNAME_HEADER, request.nextUrl.pathname);
  log("next");
  return applyCdnCache(
    NextResponse.next({ request: { headers: passthroughHeaders } }),
    request,
  );
}

/**
 * Csak azok az útvonalak, ahol a locale-logika valóban kell.
 *
 * KRITIKUS a költség szempontjából: a Netlify minden matcher-illeszkedést
 * külön Edge Function executionként számláz — akkor is, ha a kód azonnal
 * `NextResponse.next()`-tel kilép. A korábbi `/((?!.*\.).*)` matcher
 * ráfutott a `/_next/image/` kérésekre is (a pathname nem tartalmaz pontot),
 * így minden optimalizált kép egy extra edge executiont jelentett.
 *
 * Kizárva: _next/* (static, image, data), api/*, studio/* (a Studio saját
 * SPA-router-e sok URL-váltást csinál), public asset könyvtárak, és minden
 * kiterjesztéses fájlnév.
 *
 * FIGYELEM — két buktató, ezért néz ki így a minta:
 *  1. A pontot `[.]` karakterosztállyal írjuk, NEM `\.`-tal. A matcher egy
 *     sima JS string literal, amelyben a `"\."` már a JS-parser szintjén
 *     puszta `.`-tá egyszerűsödik (bármit illeszt), így a
 *     `.*\.[^/]+$` kizárásból `.*.[^/]+$` lesz — ami minden záró perjel
 *     nélküli útvonalat kizár, tehát a middleware a `/` kivételével sehol
 *     nem futna le.
 *  2. A Next a záró perjelet levágja az illesztés előtt (`trailingSlash: true`
 *     ellenére is), ezért `studio$` és `api$` alak is kell a `studio/` mellé.
 */
export const config = {
  matcher: [
    "/((?!_next/|api$|api/|studio$|studio/|images/|documents/|.*[.][a-zA-Z0-9]+$).*)",
  ],
};
