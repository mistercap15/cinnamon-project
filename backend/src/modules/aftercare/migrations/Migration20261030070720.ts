import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261030070720 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "aftercare_request" drop constraint if exists "aftercare_request_client_key_unique";`,
    );
    this.addSql(
      `alter table if exists "aftercare_request" add column if not exists "client_key" text not null;`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_aftercare_request_client_key_unique" ON "aftercare_request" ("client_key") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `drop index if exists "IDX_aftercare_request_client_key_unique";`,
    );
    this.addSql(
      `alter table if exists "aftercare_request" drop column if exists "client_key";`,
    );
  }
}
