# Catat Uang

Buku kas keluarga berbahasa Indonesia. Tampilan mengutamakan HP; laptop menampilkan tabel seperti Excel. Aplikasi menggunakan **Next.js + TypeScript**, **PostgreSQL di Neon**, dan disiapkan untuk **Vercel**.

## Fitur

- Uang masuk/keluar, kategori, tanggal, keterangan, ubah, dan hapus dengan konfirmasi.
- Saldo awal, saldo keseluruhan, saldo berjalan, dan saldo awal/akhir tiap bulan.
- Pencarian, filter jenis transaksi, pilihan bulan, dan halaman riwayat.
- Laporan enam bulan dan rincian pengeluaran menurut kategori.
- Ekspor CSV yang bisa dibuka di Excel; cadangan JSON dan pemulihan atomik.
- Akun keluarga dengan sesi 30 hari, kata sandi scrypt, pembatasan percobaan masuk, serta pemeriksaan akun pada setiap operasi server.
- Konflik perubahan dari dua perangkat dideteksi sebelum data ditimpa.
- Manifest dan ikon untuk ditambahkan ke layar utama HP. Pencatatan cloud membutuhkan internet; belum ada sinkronisasi offline.
- Mode contoh `/demo` terpisah; data contoh hanya berada di browser.

## 1. Coba tampilan tanpa database

Gunakan Node.js **22 LTS atau lebih baru**.

```powershell
npm install
npm run dev
```

Buka **http://localhost:3000/demo**. Saat pengembangan, mode ini otomatis tersedia. Data contoh tidak pernah dikirim ke Neon. Pada production, `/demo` dinonaktifkan kecuali `ENABLE_DEMO=true`.

Untuk mencoba dari HP pada Wi-Fi yang sama, isi `DEV_ALLOWED_ORIGINS` di `.env.local` dengan IP LAN komputer (contoh `192.168.1.5`), mulai ulang server, lalu buka `http://IP-LOKAL-KOMPUTER:3000`. Server development sudah mendengarkan di `0.0.0.0`. Jika diminta Windows, izinkan Node.js hanya pada jaringan privat. IP publik tidak diperlukan. Pemasangan ke layar utama paling baik diuji pada deployment HTTPS.

## 2. Hubungkan Neon

1. Buat database melalui [Neon](https://neon.com/) atau [Neon di Vercel Marketplace](https://vercel.com/marketplace/neon).
2. Pilih wilayah database yang dekat dengan wilayah fungsi Vercel.
3. Salin file `.env.example` menjadi `.env.local`.
4. Isi `DATABASE_URL` dengan connection string PostgreSQL dari Neon. Umumnya bentuknya `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require`.
5. Jangan memakai awalan `NEXT_PUBLIC_` untuk kredensial database. Jangan commit `.env.local`.

```powershell
Copy-Item .env.example .env.local
npm run db:migrate
npm run account:create
npm run dev
```

`account:create` menanyakan email, nama buku, dan kata sandi minimal 12 karakter. Kata sandi tidak ditampilkan saat diketik dan disimpan sebagai hash. Tidak ada akun/kata sandi bawaan atau pendaftaran publik.

Buka **http://localhost:3000**, masuk, lalu atur **Pengaturan → Saldo awal**. Gunakan akun yang sama pada HP dan laptop untuk buku keluarga yang sama. Akun berbeda memiliki buku kas terpisah.

Jika lupa kata sandi, jalankan `npm run account:create` dengan email yang sama. Script meminta konfirmasi, mengganti kata sandi, dan mencabut seluruh sesi sebelumnya.

## 3. Deploy ke Vercel

1. Simpan proyek di repository Git lalu impor ke Vercel sebagai proyek **Next.js**. Bisa juga memakai Vercel CLI jika sudah tersedia.
2. Tambahkan integrasi Neon dan hubungkan ke proyek. Pastikan environment variable **DATABASE_URL** tersedia untuk lingkungan **Production**.
3. Gunakan database/branch Neon terpisah untuk **Preview** agar percobaan tidak mengubah data asli.
4. Jalankan `npm run db:migrate` dan `npm run account:create` menggunakan koneksi database production dari komputer Anda. Migrasi tidak dijalankan otomatis saat build.
5. Deploy. Build command: `npm run build`; output memakai pengaturan bawaan Next.js.
6. Buka URL HTTPS Vercel dan masuk. Tambahkan halaman ke layar utama melalui menu browser jika diinginkan.

Tidak perlu VPS, komputer yang terus menyala, atau IP publik di rumah. Vercel menjalankan aplikasi; Neon menjalankan database. Periksa ketentuan paket yang dipilih: Vercel Hobby ditujukan untuk penggunaan pribadi/nonkomersial, dan layanan database memiliki kuota terpisah.

Kredensial Neon dan akun Vercel tidak termasuk dalam repository ini. Build lokal bisa dilakukan tanpa kredensial; data cloud hanya bisa diuji setelah koneksi dikonfigurasi.

## Struktur kode

```text
src/
  app/                 Halaman Next.js, layout, manifest, dan CSS
    actions/           Pintu masuk operasi server; selalu memeriksa akun
    demo/              Contoh yang tidak menggunakan database
    login/             Halaman masuk
  components/
    auth/              Form masuk dan tampilan awal
    dashboard/         Ringkasan, laporan, pilihan bulan, pengatur halaman
    layout/            Sidebar, navigasi HP, dan bingkai aplikasi
    settings/          Saldo awal, cadangan, dan pemulihan
    transactions/      Daftar, formulir, dan konfirmasi hapus
    ui/                Komponen umum seperti modal dan input nominal
  hooks/               Pengelolaan data di browser dan status koneksi
  lib/                 Tipe, validasi, perhitungan, format, dan cadangan
  server/              Koneksi Neon, sesi, penyimpanan, dan pesan kesalahan
database/              Migrasi SQL berurutan
scripts/               Migrasi dan pembuatan/pemulihan akun
tests/                 Pengujian perhitungan, SQL, serta alur pengguna
```

Mulai membaca dari `src/lib/types.ts`, lalu `src/lib/ledger.ts`, lalu `src/components/dashboard/dashboard.tsx`. Alur simpan: formulir → `use-book.ts` → server action → `server/books.ts` → fungsi SQL `mutate_book`.

Fungsi dipisahkan dengan baris kosong. Nama fungsi menjelaskan tugasnya; komentar Indonesia menjelaskan keputusan yang tidak langsung terlihat dari kode. Prettier menjaga format, ESLint memeriksa kode dan jarak antar deklarasi fungsi.

## Aturan perhitungan dan penyimpanan

- Nominal disimpan sebagai **integer rupiah** di kolom PostgreSQL `bigint`; tidak menggunakan pecahan floating point untuk uang.
- Nominal per transaksi maksimal Rp999.999.999.999; versi awal dibatasi 5.000 transaksi per akun. Batas ini menjaga keseluruhan perhitungan tetap berada dalam rentang integer aman JavaScript dan menjaga beban pengambilan data. Untuk kebutuhan lebih besar, tambahkan pagination/aggregasi di server dan strategi angka besar sebelum menaikkan batas.
- Saldo awal adalah uang sebelum transaksi pertama yang dicatat. Saldo awal bulan = saldo awal buku + semua transaksi sebelum bulan tersebut.
- Urutan saldo berjalan: tanggal, waktu pembuatan, lalu ID. Riwayat menampilkan transaksi terbaru terlebih dahulu. Pencarian/filter tidak mengubah nilai saldo historis.
- Waktu default menggunakan **WIB (Asia/Jakarta)**. Tanggal transaksi disimpan sebagai `date` agar tidak bergeser antarperangkat.
- Penulisan mengunci satu buku kas dan memeriksa `revision` di dalam transaksi PostgreSQL. Jika perangkat lain sudah mengubah data, pengguna diminta memuat ulang.
- ID transaksi dipertahankan saat mencoba simpan ulang setelah kegagalan koneksi. Permintaan yang sama tidak menggandakan catatan.
- Pemulihan memvalidasi format, ID unik, nominal, kategori, dan ukuran file. Semua data diganti dalam satu transaksi: jika satu entri gagal, seluruh perubahan dibatalkan.
- Backup JSON berisi catatan pribadi. Simpan di tempat pribadi. Ekspor CSV adalah laporan yang bisa dibuka di Excel, bukan file `.xlsx`.
- Sesi disimpan sebagai token acak di cookie HttpOnly, Secure pada production, SameSite=Lax. Database menyimpan hash token, bukan token mentah. Setiap akses buku menggunakan ID akun dari sesi server, bukan dari browser.
- Server Actions Next.js memberi pemeriksaan origin untuk mutasi. Pembatasan login tersimpan di database (10 percobaan per email setiap 15 menit).
- Data pribadi tidak disimpan oleh service worker. Mode cloud tidak memberi tanda berhasil sebelum respons server diterima; formulir tetap terbuka ketika gagal.

## Pengujian dan format

```powershell
npm run format
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Pengujian SQL menggunakan PostgreSQL WASM lokal (PGlite) agar constraint, isolasi akun, konflik revisi, dan rollback bisa diuji tanpa menyentuh Neon. Pengujian browser menggunakan mode contoh dan memeriksa alur yang sama di desktop/HP. Pengujian end-to-end koneksi Neon memerlukan database terkonfigurasi.

## Referensi

- [Next.js App Router](https://nextjs.org/docs/app)
- [Driver Neon](https://neon.com/docs/serverless/serverless-driver)
- [Integrasi penyimpanan Vercel](https://vercel.com/docs/marketplace-storage)
