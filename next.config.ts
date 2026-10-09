import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { getBuildLocale } from "./src/lib/buildLocale";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_LOCALE: getBuildLocale(),
  },
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: true,
  images: {
    formats: ["image/avif", "image/webp"],
    /**
     * Szűkített srcset-készlet (alapból 8 + 8 = 16 méret képenként).
     *
     * A főoldal ~70 képet tartalmaz; a teljes alapértelmezett készlettel ez
     * ~800 srcset URL, ami önmagában ~240 KB-ot tett ki a 288 KB-os HTML-ből —
     * és minden generált méret külön Netlify Image CDN kérés (= extra
     * edge execution + rosszabb cache-találati arány). A 4 + 4 méret lefedi a
     * valós eszközsávokat (a böngésző mindig a következő nagyobbat választja),
     * vizuális különbség nélkül.
     *
     * 2560 azért maradt bent, mert a `sizes="100vw"` képek (pl. a
     * fesztiváltérkép) retina laptopon 2x DPR-rel ~2600 px-t kérnének — 1920
     * felső korláttal ott látható lágyulás lenne. A 3840 kimaradt: 4K + 2x
     * DPR ritka, és a forrásképek úgysem érik el azt a méretet (a Next és a
     * Netlify Image CDN sosem nagyít a forrás fölé).
     */
    deviceSizes: [640, 828, 1200, 1920, 2560],
    imageSizes: [64, 128, 256, 384],
    /** Hosszabb élettartamú optimalizált variánsok (Netlify / Cloudflare Images). */
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" },
    ],
  },
  /** Windows-on a webpack pack cache néha ENOENT / hiányzó chunk hibát okoz dev módban */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;

// Locális Wrangler / OpenNext preview támogatás (dev only mellékhatás nélkül buildkor)
void initOpenNextCloudflareForDev();
