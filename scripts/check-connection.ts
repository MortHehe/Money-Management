import { neon } from "@neondatabase/serverless";
import "./environment";

function connectionError(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? error.code : "";

  if (code === "28P01") {
    return "Autentikasi gagal. Salin ulang connection string dari Neon.";
  }

  if (code === "3D000") {
    return "Database pada connection string tidak ditemukan.";
  }

  if (error instanceof Error && error.name === "TimeoutError") {
    return "Koneksi melewati batas 15 detik. Periksa jaringan dan status database Neon.";
  }

  return "Koneksi gagal. Periksa jaringan, status proyek, dan connection string Neon. Kredensial tidak ditampilkan.";
}

async function checkConnection(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("DATABASE_URL belum diisi di .env.local.");
    process.exitCode = 1;
    return;
  }

  try {
    const parsed = new URL(connectionString);

    if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    console.error(
      "Format DATABASE_URL tidak valid. Gunakan URL postgresql:// lengkap dari Neon, tanpa awalan psql.",
    );
    process.exitCode = 1;
    return;
  }

  try {
    const sql = neon(connectionString, {
      fetchOptions: { signal: AbortSignal.timeout(15_000) },
    });
    const startedAt = Date.now();
    const rows = await sql`
      SELECT
        1 AS connected,
        to_regclass('public.accounts') IS NOT NULL AS accounts,
        to_regclass('public.books') IS NOT NULL AS books,
        to_regclass('public.transactions') IS NOT NULL AS transactions,
        to_regclass('public.sessions') IS NOT NULL AS sessions,
        to_regclass('public.login_limits') IS NOT NULL AS login_limits,
        to_regclass('public.schema_migrations') IS NOT NULL AS schema_migrations,
        to_regprocedure('public.mutate_book(uuid, integer, text, jsonb)') IS NOT NULL AS mutate_book
    `;

    console.log(`Koneksi PostgreSQL berhasil (${Date.now() - startedAt} ms).`);

    const missing = Object.entries(rows[0])
      .filter(([key, value]) => key !== "connected" && value !== true)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.log(`Struktur aplikasi belum lengkap: ${missing.join(", ")}.`);
      console.log("Jalankan npm run db:migrate untuk menyiapkan struktur aplikasi.");
      return;
    }

    const accounts = await sql`SELECT EXISTS (SELECT 1 FROM accounts) AS configured`;
    console.log("Seluruh tabel dan fungsi penyimpanan aplikasi tersedia.");
    console.log(
      accounts[0].configured
        ? "Akun aplikasi sudah tersedia."
        : "Akun aplikasi belum dibuat. Jalankan npm run account:create.",
    );
  } catch (error) {
    console.error(connectionError(error));
    process.exitCode = 1;
  }
}

void checkConnection();
