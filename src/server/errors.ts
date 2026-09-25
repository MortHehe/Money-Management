export function publicError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("UNAUTHENTICATED")) {
    return "Sesi masuk sudah berakhir. Buka halaman masuk dan login kembali.";
  }

  if (message.includes("BOOK_CONFLICT")) {
    return "Data berubah di perangkat lain. Tutup formulir, tekan Muat ulang, lalu coba lagi.";
  }

  if (message.includes("BOOK_FULL")) {
    return "Buku kas mencapai batas 5.000 transaksi. Unduh cadangan sebelum mengarsipkan data.";
  }

  if (message.includes("TRANSACTION_NOT_FOUND")) {
    return "Transaksi tidak ditemukan. Muat ulang untuk melihat data terbaru.";
  }

  if (message.includes("DATABASE_NOT_CONFIGURED")) {
    return "Koneksi database belum dikonfigurasi.";
  }

  return "Data belum dapat diproses. Periksa koneksi dan coba lagi. Isian Anda tetap tersedia.";
}
