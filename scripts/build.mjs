/**
 * Workers Builds gyakran `npm run build`-et futtat, majd `npx wrangler deploy`-ot.
 * OpenNexthez teljes bundle kell — ezért WORKERS_CI-n OpenNextet indítunk.
 *
 * Rekurzióvédelem: az OpenNext a belső Next build előtt beállítja
 * NEXT_PRIVATE_STANDALONE=true-t, majd `npm run build`-et hív. Abban az
 * esetben csak `next build` fut (nem újabb OpenNext).
 */
import { spawnSync } from "node:child_process";

const isWorkersCi = process.env.WORKERS_CI === "1";
const isOpenNextInnerNextBuild = process.env.NEXT_PRIVATE_STANDALONE === "true";

const useOpenNext = isWorkersCi && !isOpenNextInnerNextBuild;
const args = useOpenNext
  ? ["opennextjs-cloudflare", "build"]
  : ["next", "build"];

console.log(
  useOpenNext
    ? "[build] Workers CI → opennextjs-cloudflare build"
    : "[build] next build",
);

const result = spawnSync("npx", args, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
