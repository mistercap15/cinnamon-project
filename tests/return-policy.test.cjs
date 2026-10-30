const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const code = ts.transpileModule(
  fs.readFileSync(
    path.join(__dirname, "../backend/src/lib/return-policy.ts"),
    "utf8",
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const exportsObject = {};
new Function("exports", code)(exportsObject);
const { returnPolicy, inReturnWindow } = exportsObject;
test("demo policy is configurable and invalid windows fall back to 14 days", () => {
  assert.equal(returnPolicy("30").windowDays, 30);
  for (const value of ["0", "-2", "abc", "1.5", "1000", ""])
    assert.equal(returnPolicy(value).windowDays, 14);
  assert.match(returnPolicy().summary, /Product issues.*not restricted/);
});
test("change-of-mind window uses delivery time and never accepts future or missing delivery dates", () => {
  const start = Date.UTC(2026, 9, 1);
  assert.equal(inReturnWindow(start, 14, start + 14 * 86400000), true);
  assert.equal(inReturnWindow(start, 14, start + 14 * 86400000 + 1), false);
  assert.equal(inReturnWindow(null, 14, start), false);
  assert.equal(inReturnWindow(start + 1, 14, start), false);
});
