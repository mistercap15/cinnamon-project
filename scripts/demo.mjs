import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { root, backendEnv, frontendEnv } from "./demo-config.mjs";
import { startDatabase } from "./demo-db.mjs";
if (Number(process.versions.node.split(".")[0]) < 24)
  throw new Error("Use Node 24 LTS (nvm use) for the local demo.");
if (!existsSync(path.join(root, ".demo/store.json")))
  throw new Error("Prepare the database first: npm run demo:setup");
for (const port of [5439, 9000, 3014])
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () =>
      reject(
        new Error(
          `Port ${port} is occupied. Stop the previous demo before starting another.`,
        ),
      ),
    );
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
const env = frontendEnv(),
  pg = await startDatabase(),
  children = [];
let stopping = false;
const stop = async (code = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
  await delay(300);
  await pg.stop();
  process.exit(typeof code === "number" ? code : 0);
};
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
const run = (args, cwd, env) => {
  const child = spawn(process.execPath, args, {
    cwd,
    env,
    stdio: "inherit",
    detached: true,
  });
  children.push(child);
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) {
      console.error(`Demo process stopped (${code}).`);
      stop(code || 1);
    }
  });
  return child;
};
try {
  run(
    ["node_modules/@medusajs/cli/cli.js", "develop", "--host", "127.0.0.1"],
    path.join(root, "backend"),
    backendEnv(),
  );
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      if (
        (
          await fetch("http://127.0.0.1:9000/health", {
            signal: AbortSignal.timeout(1000),
          })
        ).ok
      ) {
        ready = true;
        break;
      }
    } catch {}
    await delay(500);
  }
  if (!ready)
    throw new Error(
      "Medusa did not become ready. Review the backend logs above.",
    );
  run(["scripts/dev.mjs", "--port", "3014"], root, env);
  console.log(
    "Ceylon demo: http://localhost:3014 | Medusa Admin: http://localhost:9000/app",
  );
} catch (error) {
  console.error(error.message);
  await stop(1);
}
