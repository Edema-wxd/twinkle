import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
  // activity_logs exists in the production database but isn't part of this app's
  // schema (it was created by hand). Without this, every `drizzle-kit push` offers
  // to DROP it. Add any other hand-made tables here the same way.
  // drizzle-kit can't filter sequences, so if that table has an auto-numbered id a
  // push may still list `DROP SEQUENCE "public"."activity_logs_id_seq"`. Postgres
  // refuses that while the table uses it (no data is lost), but answer No anyway.
  tablesFilter: ['!activity_logs'],
  verbose: true,
  strict: true,
})
