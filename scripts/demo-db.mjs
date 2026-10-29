import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";
import { config, root } from "./demo-config.mjs";
export async function startDatabase() {
  const c = config();
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(root, ".demo/postgres"),
    user: "ceylon",
    password: c.databasePassword,
    port: 5439,
    persistent: true,
    authMethod: "scram-sha-256",
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: () => {},
    onError: (message) => {
      if (String(message).includes("FATAL")) console.error(message);
    },
  });
  if (!existsSync(path.join(root, ".demo/postgres/PG_VERSION")))
    await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase("ceylon");
  } catch (error) {
    if (!String(error).includes("already exists")) throw error;
  }
  return pg;
}
if (process.argv[1] === import.meta.filename) {
  const pg = await startDatabase();
  console.log("Demo PostgreSQL ready on 127.0.0.1:5439");
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, async () => {
      await pg.stop();
      process.exit();
    });
  await new Promise(() => {});
}
