# Cloudflare Workers (OpenNext) — Jazzfőváros

A site **Next.js 15 + @opennextjs/cloudflare** adapterrel megy Workersre.
A Sanity CMS változatlan. Netlify egyelőre megmaradhat fallbacknek.

**Worker URL:** https://bohem-jazzfovaros.jazzfovaros-web.workers.dev  
**Worker name:** `bohem-jazzfovaros`  
**Cloudflare account:** `jazzfovaros-web` (workers.dev subdomain)

> Locális `wrangler` jelenleg a `bzalan` accountba deployol →  
> `https://bohem-jazzfovaros.bzalan.workers.dev`.  
> A cél URL-hez: `wrangler logout` → `wrangler login` a **jazzfovaros-web**
> accounttal, majd `npm run deploy` — vagy GitHub → Workers Builds azon az accounton.

## Parancsok

| Cél | Parancs |
|-----|---------|
| Locális Next (régi) | `npm run dev` |
| CF build | `npm run cf:build` (= `opennextjs-cloudflare build`) |
| CF preview (local Workers) | `npm run preview` |
| CF production deploy | `npm run deploy` |
| Csak wrangler feltöltés (build után) | `npx wrangler deploy` |

## GitHub → Cloudflare auto-deploy

Workers / Pages project Settings → Builds:

| Mező | Érték |
|------|--------|
| **Build command** | `npx opennextjs-cloudflare build` |
| **Deploy command** | `npx wrangler deploy` |
| **Root directory** | `/` (repo root) |
| **Node version** | **20** (ne 24) |

**Ne** hagyd `npm run build`-et egyedül — az csak Next build, Workers worker nélkül.

## Environment variables (Cloudflare dashboard)

Ugyanazok, mint Netlifyen:

- `NEXT_PUBLIC_SANITY_PROJECT_ID` = `ajkz39i8`
- `NEXT_PUBLIC_SANITY_DATASET` = `production`
- `NEXT_PUBLIC_SANITY_API_VERSION` = `2026-01-01`
- `NEXT_PUBLIC_SITE_URL_HU` = `https://jazzfovaros.hu`
- `NEXT_PUBLIC_SITE_URL_EN` = `https://jazzfovaros.hu`
- `NEXT_PUBLIC_LOCALE` = `hu`
- `NEXT_PUBLIC_GA4_ID` = (opcionális)
- `SANITY_API_READ_TOKEN` = **Secret**

## Cache (KV)

Az ISR incremental cache **Cloudflare KV**-n van (`NEXT_INC_CACHE_KV`).
A namespace létrehozva: namespace `JAZZFOVAROS_NEXT_CACHE` → wrangler.jsonc.

Opcionális későbbi upgrade: R2 + DO queue (előbb kapcsold be az R2-t a
Cloudflare Dashboard → R2-ben), majd cseréld az `open-next.config.ts`-t
és a `wrangler.jsonc` bindingeket.

## Domain

1. Cloudflare Worker → Custom Domains → `jazzfovaros.hu` + `www`
2. DNS a Cloudflare zónában (vagy CNAME a workers.dev-re, ha DNS máshol van)
3. Netlifyről vedd le a custom domainokat, ha átálltál
4. Archív `2024.` / `2025.jazzfovaros.hu` — ne nyúlj hozzájuk
5. `jazzcapital.hu` → külső 301 → `https://jazzfovaros.hu/en/`

## Sanity CORS

Add hozzá az új Workers URL-t is:

- `https://jazzfovaros.<account>.workers.dev` (vagy a custom domain)
- `https://jazzfovaros.hu`

## Windows megjegyzés

OpenNext Windowsön figyelmeztet; CI (Cloudflare Linux build) a megbízható út. Lokális preview: WSL ajánlott.

## Netlify Blobs / usage API

`@netlify/blobs` Cloudflareen nem elérhető — a usage metrics csendben no-op (`getStoreSafe` → null). A `/api/usage/` route CF-en korlátozott lehet; ez nem blokkolja a site-ot.
