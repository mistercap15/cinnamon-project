const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const directory = mkdtempSync(path.join(os.tmpdir(), "ceylon runtime "));
const bootstrapNode =
  process.env.CEYLON_TEST_BOOTSTRAP_NODE || process.execPath;
const launcher = path.resolve(__dirname, "../scripts/run-with-node.mjs");
const probe = path.join(directory, "runtime probe.mjs");
writeFileSync(
  probe,
  `import {execFileSync} from 'node:child_process';console.log(JSON.stringify({version:process.version,child:execFileSync('node',['--version'],{encoding:'utf8'}).trim(),argument:process.argv[2]}));`,
);
after(() => rmSync(directory, { recursive: true, force: true }));
function run(script = probe, args = [], env = {}) {
  return spawnSync(bootstrapNode, [launcher, script, ...args], {
    encoding: "utf8",
    timeout: 10000,
    env: { ...process.env, CEYLON_NODE_BINARY: "", ...env },
  });
}
test("bootstrap finds modern Node and also supplies it to child commands", () => {
  const result = run(probe, ["an argument with spaces"]);
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout.trim().split("\n").pop());
  assert.ok(Number(data.version.slice(1).split(".")[0]) >= 24);
  assert.equal(data.child, data.version);
  assert.equal(data.argument, "an argument with spaces");
});
test("bootstrap gives actionable instructions for an invalid runtime override without starting the script", () => {
  const result = run(probe, [], {
    CEYLON_NODE_BINARY: path.join(directory, "not-installed"),
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Install Node 24 LTS/);
  assert.match(result.stderr, /No nvm installation is required/);
  assert.doesNotMatch(result.stdout, /"argument"/);
});
test("bootstrap preserves the application exit status", () => {
  const script = path.join(directory, "exit.mjs");
  writeFileSync(script, "process.exit(42);");
  const result = run(script);
  assert.equal(result.status, 42, result.stderr);
});
test(
  "bootstrap forwards shutdown signals so the demo can clean up",
  { timeout: 10000 },
  async () => {
    const script = path.join(directory, "shutdown.mjs");
    writeFileSync(
      script,
      `process.on('SIGTERM',()=>{console.log('CLEAN_SHUTDOWN');process.exit(0)});console.log('READY');setInterval(()=>{},1000);`,
    );
    const child = spawn(bootstrapNode, [launcher, script], {
      env: { ...process.env, CEYLON_NODE_BINARY: "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "",
      errors = "",
      sent = false;
    child.stdout.on("data", (data) => {
      output += data;
      if (!sent && output.includes("READY")) {
        sent = true;
        child.kill("SIGTERM");
      }
    });
    child.stderr.on("data", (data) => (errors += data));
    const code = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("exit", resolve);
    });
    assert.equal(code, 0, errors);
    assert.match(output, /CLEAN_SHUTDOWN/);
  },
);
