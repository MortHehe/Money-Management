import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { scriptDatabase } from "./environment";

async function migrate() {
  const sql = scriptDatabase();
  const directory = resolve("database");
  const filenames = (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`;

  for (const filename of filenames) {
    const source = await readFile(resolve(directory, filename), "utf8");
    const checksum = createHash("sha256").update(source).digest("hex");
    const existing =
      await sql`SELECT checksum FROM schema_migrations WHERE name = ${filename}`;

    if (existing.length > 0) {
      if (existing[0].checksum !== checksum) {
        throw new Error(
          `Migrasi ${filename} berubah setelah diterapkan. Buat file migrasi baru.`,
        );
      }

      console.log(`Sudah diterapkan: ${filename}`);
      continue;
    }

    const statements = source
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    await sql.transaction([
      ...statements.map((statement) => sql.query(statement)),
      sql`INSERT INTO schema_migrations (name, checksum) VALUES (${filename}, ${checksum})`,
    ]);

    console.log(`Berhasil menerapkan: ${filename}`);
  }

  console.log(
    "Database siap. Jalankan npm run account:create untuk membuat akun keluarga.",
  );
}

migrate().catch(() => {
  console.error(
    "Migrasi gagal. Periksa DATABASE_URL, akses jaringan, dan urutan migrasi. Kredensial tidak ditampilkan.",
  );
  process.exitCode = 1;
});
