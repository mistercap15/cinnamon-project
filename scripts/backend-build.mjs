import { spawnSync } from "node:child_process";
import path from "node:path";
import { root, backendEnv } from "./demo-config.mjs";
const result = spawnSync(
  process.execPath,
  ["node_modules/@medusajs/cli/cli.js", "build"],
  { cwd: path.join(root, "backend"), env: backendEnv(), stdio: "inherit" },
);
process.exit(result.status ?? 1);
