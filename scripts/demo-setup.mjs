import { spawn } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { config, root, backendEnv } from "./demo-config.mjs";
import { startDatabase } from "./demo-db.mjs";
if (Number(process.versions.node.split(".")[0]) < 24)
  throw new Error("Use Node 24 LTS (nvm use) for the local demo.");
const c = config();
const pg = await startDatabase();
const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["node_modules/@medusajs/cli/cli.js", ...args],
      { cwd: path.join(root, "backend"), env: backendEnv(), stdio: "inherit" },
    );
    child.on("exit", (code) =>
      code ? reject(Error(`Medusa command failed (${code})`)) : resolve(),
    );
  });
try {
  if (!existsSync(path.join(root, "backend/src/modules/journal/migrations")))
    await run(["db:generate", "journal"]);
  await run(["db:migrate"]);
  await run(["exec", "./src/scripts/seed.ts"]);
  if (!existsSync(path.join(root, ".demo/admin-ready"))) {
    await run(["user", "-e", "admin@ceylon.local", "-p", c.adminPassword]);
    writeFileSync(path.join(root, ".demo/admin-ready"), "ready");
  }
  writeFileSync(
    path.join(root, ".demo/credentials.md"),
    `# Local demo admin\n\nURL: http://localhost:9000/app\nEmail: admin@ceylon.local\nPassword: ${c.adminPassword}\n\nThese local credentials are generated for this machine; never deploy them.\n`,
    { mode: 0o600 },
  );
  console.log(
    "\nDemo prepared. Run npm run demo. Admin credentials: .demo/credentials.md",
  );
} finally {
  await pg.stop();
}
