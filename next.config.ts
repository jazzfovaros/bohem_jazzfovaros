import type { NextConfig } from "next";
import { getBuildLocale } from "./src/lib/buildLocale";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_LOCALE: getBuildLocale(),
  },
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: true,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/netlifyAwareImageLoader.ts",
    formats: ["image/avif", "image/webp"],
    /**
     * Szűkített srcset — kevesebb variáns = kisebb HTML + kevesebb unique URL.
     * Sanity képek a custom loaderrel a Sanity CDN-re mennek (nem Netlify BW).
     */
    deviceSizes: [640, 1080, 1920],
    imageSizes: [64, 128, 256, 384],
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
