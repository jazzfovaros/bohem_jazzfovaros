/**
 * Cloudflare Workers Builds: WORKERS_CI=1 → OpenNext worker bundle.
 * Egyébként (Netlify / local): sima `next build`.
 */
import { spawnSync } from "node:child_process";

const isWorkersCi = process.env.WORKERS_CI === "1";
const args = isWorkersCi
  ? ["opennextjs-cloudflare", "build"]
  : ["next", "build"];

console.log(
  isWorkersCi
    ? "[build] Workers CI → opennextjs-cloudflare build"
    : "[build] next build",
);

const result = spawnSync("npx", args, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
