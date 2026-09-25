import "server-only";

import { neon } from "@neondatabase/serverless";

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Dibuat saat dibutuhkan, sehingga build Vercel tidak memerlukan koneksi database. */
export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  return neon(connectionString, { fetchOptions: { cache: "no-store" } });
}
