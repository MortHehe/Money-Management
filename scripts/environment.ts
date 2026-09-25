import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export function scriptDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Isi DATABASE_URL di .env.local terlebih dahulu. Lihat .env.example.",
    );
  }

  return neon(process.env.DATABASE_URL);
}
