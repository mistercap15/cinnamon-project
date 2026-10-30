import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261030070529 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "aftercare_request" ("id" text not null, "order_id" text not null, "order_number" integer not null, "email" text not null, "items" jsonb not null, "reason" text not null, "note" text not null, "unopened" boolean not null default false, "status" text check ("status" in ('requested', 'approved', 'declined', 'withdrawn')) not null default 'requested', "resolution" text check ("resolution" in ('return', 'refund_only')) null, "native_return_id" text null, "reply" text null, "reviewed_at" timestamptz null, "reviewed_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "aftercare_request_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_aftercare_request_deleted_at" ON "aftercare_request" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "aftercare_request" cascade;`);
  }
}
