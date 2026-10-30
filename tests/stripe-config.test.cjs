const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const url = pathToFileURL(
  path.join(__dirname, "../scripts/demo-config.mjs"),
).href;
const run = (env) =>
  spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import {stripeConfig} from ${JSON.stringify(url)};const c=stripeConfig();console.log(JSON.stringify({provider:c.provider,source:c.source}));`,
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        DEMO_PAYMENT_PROVIDER: "stripe",
        STRIPE_SECRET_KEY: "sk_test_example_not_a_real_key",
        STRIPE_PUBLISHABLE_KEY: "pk_test_example_not_a_real_key",
        ...env,
      },
    },
  );
test("Stripe demo rejects live secret and publishable keys without printing them", () => {
  for (const env of [
    { STRIPE_SECRET_KEY: "sk_live_example_not_a_real_key" },
    { STRIPE_PUBLISHABLE_KEY: "pk_live_example_not_a_real_key" },
  ]) {
    const result = run(env);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Only Stripe TEST/);
    for (const key of Object.values(env))
      assert.ok(!result.stdout.includes(key) && !result.stderr.includes(key));
  }
});
test("Stripe demo does not combine an incomplete credential pair with temporary sandbox keys", () => {
  const result = run({ STRIPE_PUBLISHABLE_KEY: "" });
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /both STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY/,
  );
});
test("Stripe test keys select Stripe while an explicit manual override stays manual", () => {
  for (const provider of ["stripe", "manual"]) {
    const result = run({ DEMO_PAYMENT_PROVIDER: provider });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout.trim()).provider, provider);
    assert.ok(!result.stdout.includes("sk_test_"));
  }
  const restricted = run({
    STRIPE_SECRET_KEY: "rkcs_test_example_not_a_real_key",
  });
  assert.equal(restricted.status, 0, restricted.stderr);
});
