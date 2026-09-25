"use client";

import { BookOpen, RefreshCw } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="status-page">
      <BookOpen size={42} />
      <h1>Buku kas belum dapat dibuka.</h1>
      <p>
        Periksa koneksi internet, lalu coba kembali. Jika ini pemasangan pertama, pastikan
        konfigurasi Neon dan migrasi sudah selesai.
      </p>
      <button className="button button-primary" onClick={reset}>
        <RefreshCw size={18} />
        Coba lagi
      </button>
      <a href="/login">Kembali ke halaman masuk</a>
    </main>
  );
}
