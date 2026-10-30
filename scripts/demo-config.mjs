import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
export const root = path.resolve(import.meta.dirname, "..");
if (existsSync(path.join(root, ".env.local")))
  process.loadEnvFile(path.join(root, ".env.local"));
export function config() {
  mkdirSync(path.join(root, ".demo"), { recursive: true });
  const file = path.join(root, ".demo/config.json");
  if (!existsSync(file))
    writeFileSync(
      file,
      JSON.stringify(
        {
          databasePassword: randomBytes(20).toString("hex"),
          jwtSecret: randomBytes(32).toString("hex"),
          cookieSecret: randomBytes(32).toString("hex"),
          sessionSecret: randomBytes(32).toString("hex"),
          adminPassword: randomBytes(12).toString("base64url"),
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
  return JSON.parse(readFileSync(file, "utf8"));
}
export function backendEnv() {
  const c = config(),
    stripe = stripeConfig();
  return {
    ...process.env,
    DATABASE_URL: `postgres://ceylon:${c.databasePassword}@127.0.0.1:5439/ceylon`,
    JWT_SECRET: c.jwtSecret,
    AFTERCARE_API_SECRET: c.sessionSecret,
    COOKIE_SECRET: c.cookieSecret,
    DEMO_MODE: "true",
    DEMO_PAYMENT_PROVIDER: stripe.provider,
    STRIPE_SECRET_KEY: stripe.secretKey || "",
    STRIPE_PUBLISHABLE_KEY: stripe.publishableKey || "",
    STRIPE_WEBHOOK_SECRET: stripe.webhookSecret || "",
    FRONTEND_URL: "http://localhost:3014",
    STORE_CORS: "http://localhost:3014",
    ADMIN_CORS: "http://localhost:9000",
    AUTH_CORS: "http://localhost:3014,http://localhost:9000",
    MEDUSA_TELEMETRY_DISABLED: "true",
  };
}
export function frontendEnv() {
  const c = config(),
    stripe = stripeConfig();
  const store = JSON.parse(
    readFileSync(path.join(root, ".demo/store.json"), "utf8"),
  );
  return {
    ...process.env,
    COMMERCE_PROVIDER: "medusa",
    MEDUSA_BACKEND_URL: "http://127.0.0.1:9000",
    MEDUSA_PUBLISHABLE_KEY: store.key,
    MEDUSA_REGION_ID: store.region,
    ACCOUNT_SESSION_SECRET: c.sessionSecret,
    SITE_URL: "http://localhost:3014",
    DEMO_MODE: "true",
    DEMO_PAYMENT_PROVIDER: stripe.provider,
    STRIPE_SECRET_KEY: stripe.secretKey || "",
    STRIPE_PUBLISHABLE_KEY: stripe.publishableKey || "",
    STRIPE_WEBHOOK_SECRET: stripe.webhookSecret || "",
    SHOPIFY_STORE_DOMAIN: "",
  };
}

// Read only local project configuration; never print credentials.
export function stripeConfig() {
  const hasOwnKeys = Boolean(
    process.env.STRIPE_SECRET_KEY || process.env.STRIPE_PUBLISHABLE_KEY,
  );
  const file = path.join(root, ".demo/stripe-sandbox.json");
  const sandbox =
    !hasOwnKeys && existsSync(file)
      ? JSON.parse(readFileSync(file, "utf8"))
      : {};
  const secretKey = hasOwnKeys
    ? process.env.STRIPE_SECRET_KEY
    : sandbox.secretKey;
  const publishableKey = hasOwnKeys
    ? process.env.STRIPE_PUBLISHABLE_KEY
    : sandbox.publishableKey;
  const provider =
    process.env.DEMO_PAYMENT_PROVIDER ||
    (secretKey || publishableKey ? "stripe" : "manual");
  if (!["manual", "stripe"].includes(provider))
    throw new Error("DEMO_PAYMENT_PROVIDER must be stripe or manual.");
  if (secretKey && !/^(?:sk|rk|rkcs)_test_/.test(secretKey))
    throw new Error(
      "Only Stripe TEST secret keys are allowed in this showcase.",
    );
  if (publishableKey && !publishableKey.startsWith("pk_test_"))
    throw new Error(
      "Only Stripe TEST publishable keys are allowed in this showcase.",
    );
  if (provider === "stripe" && (!secretKey || !publishableKey))
    throw new Error(
      "Add both STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to .env.local.",
    );
  if (
    provider === "stripe" &&
    !hasOwnKeys &&
    sandbox.expiresAt &&
    Date.now() > new Date(sandbox.expiresAt).getTime()
  )
    throw new Error(
      "The temporary Stripe sandbox expired. Add your own test credentials to .env.local.",
    );
  return {
    provider,
    secretKey,
    publishableKey,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    source: hasOwnKeys ? "env" : "temporary",
  };
}
