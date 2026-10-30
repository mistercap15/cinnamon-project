// Keep this bootstrap compatible with Node 20. Import the application only in
// the selected runtime: Medusa and the embedded database require newer Node.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir, constants } from "node:os";
import path from "node:path";

const minimum = 24;
const executable = process.platform === "win32" ? "node.exe" : "node";
const home = homedir();
function managedNodes(directory) {
  try {
    return readdirSync(directory)
      .filter((version) => /^v?\d+\./.test(version))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map((version) => path.join(directory, version, "bin", executable));
  } catch {
    return [];
  }
}
function version(binary) {
  if (!existsSync(binary)) return null;
  const result = spawnSync(binary, ["--version"], {
    encoding: "utf8",
    timeout: 5000,
    windowsHide: true,
  });
  const match = result.status === 0 && result.stdout.trim().match(/^v(\d+)\./);
  return match && Number(match[1]) >= minimum ? result.stdout.trim() : null;
}
const override = process.env.CEYLON_NODE_BINARY;
const candidates = override
  ? [path.resolve(override)]
  : [
      process.execPath,
      ...(process.env.PATH || "")
        .split(path.delimiter)
        .filter(Boolean)
        .map((dir) => path.join(dir, executable)),
      "/opt/homebrew/opt/node@24/bin/node",
      "/usr/local/opt/node@24/bin/node",
      ...managedNodes(
        path.join(
          process.env.NVM_DIR || path.join(home, ".nvm"),
          "versions",
          "node",
        ),
      ),
      ...managedNodes(path.join(home, ".volta", "tools", "image", "node")),
      path.join(
        home,
        ".cache",
        "codex-runtimes",
        "codex-primary-runtime",
        "dependencies",
        "node",
        "bin",
        executable,
      ),
    ];
let runtime;
for (const candidate of new Set(candidates)) {
  const release = version(candidate);
  if (release) {
    runtime = { binary: candidate, version: release };
    break;
  }
}
if (!runtime) {
  console.error(
    `Ceylon needs Node ${minimum} or newer. Your current version is ${process.version}.\n` +
      (override
        ? `CEYLON_NODE_BINARY does not point to a compatible Node executable: ${override}\n`
        : "") +
      "Install Node 24 LTS from https://nodejs.org and reopen your terminal,\n" +
      "or set CEYLON_NODE_BINARY to an existing Node 24 executable. No nvm installation is required.",
  );
  process.exit(1);
}
const [entry, ...args] = process.argv.slice(2);
if (!entry) {
  console.error("Usage: node scripts/run-with-node.mjs <script> [arguments]");
  process.exit(1);
}
if (path.resolve(runtime.binary) !== path.resolve(process.execPath)) {
  console.log(
    `Ceylon: using Node ${runtime.version} (default is ${process.version}).`,
  );
}
const child = spawn(runtime.binary, [entry, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    PATH: `${path.dirname(runtime.binary)}${path.delimiter}${process.env.PATH || ""}`,
    npm_node_execpath: runtime.binary,
  },
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error(`Unable to launch Ceylon: ${error.message}`);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 128 + (constants.signals[signal] || 1) : 1));
});
