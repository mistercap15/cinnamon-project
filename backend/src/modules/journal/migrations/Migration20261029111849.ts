import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261029111849 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "journal_post" drop constraint if exists "journal_post_handle_unique";`,
    );
    this.addSql(
      `alter table if exists "email_verification" drop constraint if exists "email_verification_customer_id_unique";`,
    );
    this.addSql(
      `create table if not exists "email_verification" ("id" text not null, "customer_id" text not null, "email" text not null, "code_hash" text not null, "expires_at" timestamptz not null, "attempts" integer not null default 0, "verified_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "email_verification_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_email_verification_customer_id_unique" ON "email_verification" ("customer_id") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_verification_deleted_at" ON "email_verification" ("deleted_at") WHERE deleted_at IS NULL;`,
    );

    this.addSql(
      `create table if not exists "journal_post" ("id" text not null, "handle" text not null, "title" text not null, "excerpt" text not null, "content_html" text not null, "image" text null, "category" text not null, "author" text not null default 'The Ceylon journal', "published" boolean not null default false, "published_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "journal_post_pkey" primary key ("id"));`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_journal_post_handle_unique" ON "journal_post" ("handle") WHERE deleted_at IS NULL;`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_journal_post_deleted_at" ON "journal_post" ("deleted_at") WHERE deleted_at IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "email_verification" cascade;`);

    this.addSql(`drop table if exists "journal_post" cascade;`);
  }
}
