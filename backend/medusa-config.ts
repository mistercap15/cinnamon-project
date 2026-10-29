import { loadEnv, defineConfig } from "@medusajs/framework/utils";
loadEnv(process.env.NODE_ENV || "development", process.cwd());
if (!process.env.JWT_SECRET || !process.env.COOKIE_SECRET)
  throw new Error("Set JWT_SECRET and COOKIE_SECRET before starting Medusa.");
module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: { connection: { ssl: false } },
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:3014",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors:
        process.env.AUTH_CORS || "http://localhost:3014,http://localhost:9000",
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  admin: { backendUrl: process.env.BACKEND_URL || "http://localhost:9000" },
  modules: [{ resolve: "./src/modules/journal" }],
});
