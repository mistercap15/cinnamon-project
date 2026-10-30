import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
export const root = path.resolve(import.meta.dirname, "..");
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
  const c = config();
  return {
    ...process.env,
    DATABASE_URL: `postgres://ceylon:${c.databasePassword}@127.0.0.1:5439/ceylon`,
    JWT_SECRET: c.jwtSecret,
    AFTERCARE_API_SECRET: c.sessionSecret,
    COOKIE_SECRET: c.cookieSecret,
    DEMO_MODE: "true",
    FRONTEND_URL: "http://localhost:3014",
    STORE_CORS: "http://localhost:3014",
    ADMIN_CORS: "http://localhost:9000",
    AUTH_CORS: "http://localhost:3014,http://localhost:9000",
    MEDUSA_TELEMETRY_DISABLED: "true",
  };
}
export function frontendEnv() {
  const c = config();
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
    SHOPIFY_STORE_DOMAIN: "",
  };
}
