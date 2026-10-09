# Átállás: új GitHub + új Netlify fiók

Cél repo: `https://github.com/jazzfovaros/bohem_jazzfovaros.git`  
Cél: ugyanaz a működés (Next.js + Sanity + Netlify, `jazzfovaros.hu` + `/en/`).

**Build fix (2026-10):** `netlify.toml` tartalmazza a nyilvános Sanity env-eket (`NEXT_PUBLIC_SANITY_PROJECT_ID` stb.), hogy a Netlify build ne essen el. A `SANITY_API_READ_TOKEN`-t továbbra is csak a Netlify dashboardon állítsd (secret).

---

## A) GitHub — kód átvitele

### 1. Hozd létre a repót (ha még nincs)

1. Lépj be a **jazzfovaros** GitHub org/fiókba.
2. New repository → név: `jazzfovaros`
3. **Ne** töltsd fel README / .gitignore / license-t (üres repo kell).
4. Private vagy Public — ahogy kell.

### 2. Push a gépedről (ebben a projektmappában)

```powershell
cd e:\villa\ceg\EV\bzalan-ev-system\client-projects\jazz

# Ha a remote még nincs:
git remote add jazzfovaros https://github.com/jazzfovaros/jazzfovaros.git

# Vagy ha már van, de rossz:
# git remote set-url jazzfovaros https://github.com/jazzfovaros/jazzfovaros.git

# Teljes history + main
git push -u jazzfovaros main --tags
```

Ha `Repository not found` / auth hiba:

- GitHubon a **jazzfovaros** fiókkal vagy org tagként kell bejelentkezni.
- Windows Credential Manager / `gh auth login` — a megfelelő fiók.
- Org repo: ellenőrizd, hogy a fiókodnak van **write** joga.

### 3. (Opcionális) origin cseréje az új repóra

```powershell
git remote rename origin old-n4r3
git remote rename jazzfovaros origin
git push -u origin main
```

A régi `N4R3/bohem_jazzfovaros` megmaradhat archive-ként, vagy törölhető később.

### 4. Ne commitold

- `.env.local`
- Sanity write tokeneket
- bármilyen titkot

---

## B) Netlify — új fiók, ugyanaz a működés

### 1. Új site létrehozása

1. Lépj be az **új Netlify fiókba**.
2. **Add new site** → **Import an existing project** → GitHub.
3. Engedélyezd a Netlify appot a **jazzfovaros** org/repo-ra.
4. Válaszd: `jazzfovaros/jazzfovaros`, branch: `main`.

### 2. Build beállítások (általában automatikus a `netlify.toml`-ból)

| Mező | Érték |
|------|--------|
| Build command | `npm run build` |
| Publish directory | *(üresen hagyd — Next.js plugin kezeli)* |
| Node | **20** (`netlify.toml` már beállítja) |
| Plugin | `@netlify/plugin-nextjs` (a toml-ból jön) |

Ne állíts be manuális „publish = dist/out” — ez Next.js SSR site.

### 3. Environment variables (Site settings → Environment variables)

Másold át a **régi** Netlify site-ról (Environment variables → show values / export), majd állítsd be az **új** site-on.

**Kötelező / ajánlott:**

| Változó | Érték (éles) | Megjegyzés |
|---------|--------------|------------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | *(ugyanaz, mint eddig)* | Sanity projekt nem változik |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` | |
| `NEXT_PUBLIC_SANITY_API_VERSION` | pl. `2026-01-01` | |
| `SANITY_API_READ_TOKEN` | *(ha van a régiben)* | Secret |
| `NEXT_PUBLIC_SITE_URL_HU` | `https://jazzfovaros.hu` | Canonical / sitemap |
| `NEXT_PUBLIC_SITE_URL_EN` | `https://jazzfovaros.hu` | Ugyanaz a host, EN = `/en/` |
| `NEXT_PUBLIC_LOCALE` | `hu` | |
| `NEXT_PUBLIC_GA4_ID` | `G-Y9BMR7XZK6` (vagy aktuális) | opcionális |
| `USAGE_STATS_TOKEN` | *(ha használtátok)* | Secret, újra generálható |

**Ne tedd ki / ne commitold:** `SANITY_API_WRITE_TOKEN` (csak lokális seed/migrációhoz kell).

A `netlify.toml` már tartalmazza a production SITE_URL-eket és a GA4-et; a dashboard env **felülírhatja** a toml-t — legyenek konzisztensek.

### 4. Első deploy

1. Trigger deploy (auto az első connect után, vagy **Deploy site**).
2. Várd meg a zöld buildet.
3. Nyisd meg a Netlify ideiglenes URL-t (`*.netlify.app`):
   - `/` → HU
   - `/en/` → EN
   - nyelvváltó same-origin
   - `/studio` → Sanity Studio (ha a project ID env be van állítva)

### 5. Domain átkötés (éles `jazzfovaros.hu`)

**Fontos sorrend — ne legyen downtime:**

1. Az **új** Netlify site-on: **Domain management** → Add domain `jazzfovaros.hu` + `www.jazzfovaros.hu`.
2. Netlify megadja a DNS rekordokat (A / CNAME / ALIAS) — **ezeket** állítsd a domain szolgáltatónál.
3. Ajánlott: `www` → apex redirect a Netlify UI-ban.
4. HTTPS: Netlify Let’s Encrypt — várd meg, amíg aktív.
5. A **régi** Netlify site-ról vedd le a custom domainokat (vagy állítsd le a site-ot), hogy ne legyen konfliktus.

**Ne módosítsd** az archív subdomaineket: `2024.jazzfovaros.hu`, `2025.jazzfovaros.hu` stb. (régi hosting).

**jazzcapital.hu:** továbbra is **külső** 301/308 → `https://jazzfovaros.hu/en/` (domain szolgáltatónál), **ne** Netlify custom domain.

### 6. Sanity CORS (ha új Netlify URL-t is használsz)

Sanity Manage → API → CORS origins — tartsd / add hozzá:

- `https://jazzfovaros.hu`
- `https://www.jazzfovaros.hu`
- az **új** `https://xxx.netlify.app` staging URL
- `http://localhost:3000`

A Sanity **project** ugyanaz marad (ugyanaz a project ID) — csak a site host változik.

### 7. GitHub ↔ Netlify kapcsolat ellenőrzés

- Netlify → Site configuration → Build & deploy → Continuous Deployment  
  → repo = `jazzfovaros/jazzfovaros`, branch = `main`
- Push a `main`-re → automatikus deploy
- (Opcionális) Deploy previews PR-ekhez

### 8. Régi Netlify site

Miután az új site él és a DNS OK:

1. Régi site: remove custom domains
2. Opcionális: disable auto publishing / delete site
3. Régi GitHub (`N4R3/bohem_jazzfovaros`): archive vagy disconnect a régi Netlify-ról

---

## C) Gyors QA az új site után

- [ ] `https://<uj>.netlify.app/` HU
- [ ] `https://<uj>.netlify.app/en/` EN
- [ ] Nyelvváltó HU↔EN
- [ ] Program, lineup, info, jegyek
- [ ] Sanity Studio `/studio`
- [ ] DNS után: `https://jazzfovaros.hu/` és `/en/`
- [ ] Canonical nem mutat régi staging domainre
- [ ] Archív `2025.jazzfovaros.hu` érintetlen

---

## D) Gyakori hibák

| Tünet | Ok / javítás |
|-------|----------------|
| Build fail: missing Sanity project ID | Env vars nincsenek az új site-on |
| Studio üres / CORS hiba | Új netlify.app origin hiányzik a Sanity CORS-ból |
| Canonical staging URL | `NEXT_PUBLIC_SITE_URL_*` rossz / hiányzik |
| Domain nem kapcsolódik | DNS még a régi Netlify-ra mutat, vagy mindkét site-on ugyanaz a domain |
| Push: Repository not found | Repo nincs létrehozva, vagy rossz GitHub fiók / jog |

---

## E) Összefoglaló checklist

1. [ ] `jazzfovaros/jazzfovaros` GitHub repo létrehozva  
2. [ ] `git push` az új remote-ra sikeres  
3. [ ] Új Netlify site ← új GitHub repo  
4. [ ] Env változók átmásolva  
5. [ ] Zöld deploy + staging QA  
6. [ ] Domain DNS az új Netlify-ra  
7. [ ] Sanity CORS frissítve  
8. [ ] Régi Netlify domain eltávolítva  
9. [ ] Éles QA  

**Sanity CMS-t nem kell újraprojectelni** — ugyanaz a project ID + dataset megy tovább.
