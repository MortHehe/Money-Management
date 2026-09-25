# Catat Uang

Buku kas keluarga berbahasa Indonesia. Tampilan mengutamakan HP; laptop menampilkan tabel seperti Excel. Aplikasi menggunakan **Next.js + TypeScript**, **PostgreSQL di Neon**, dan disiapkan untuk **Vercel**.

## Fitur

- Uang masuk/keluar, kategori, tanggal, keterangan, ubah, dan hapus dengan konfirmasi.
- Saldo awal, saldo keseluruhan, saldo berjalan, dan saldo awal/akhir tiap bulan.
- **Sekilas keuangan** menampilkan saldo, total uang masuk, dan total uang keluar untuk seluruh periode. Pilihan bulan berada pada bagian riwayat/laporan dan tidak mengubah angka ringkasan keseluruhan.
- Pencarian, filter jenis transaksi, pilihan bulan, dan halaman riwayat.
- Tab **Table View**: seluruh transaksi dari semua bulan dan tahun dalam satu tabel, dengan kolom Tanggal, Keterangan, Debit (uang masuk), Kredit (uang keluar), total keseluruhan, serta **Sisa uang** di bawah tabel. Urutan tanggal paling awal; semua baris langsung tersedia dengan menggulir tabel, tanpa filter bulan atau pembagian halaman.
- Laporan enam bulan dan rincian pengeluaran menurut kategori.
- Ekspor CSV yang bisa dibuka di Excel; cadangan JSON dan pemulihan atomik.
- Akun keluarga dengan sesi 30 hari, kata sandi scrypt, pembatasan percobaan masuk, serta pemeriksaan akun pada setiap operasi server.
- Konflik perubahan dari dua perangkat dideteksi sebelum data ditimpa.
- PWA untuk Android, iPhone, dan iPad: ikon Apple, tampilan mandiri, ruang aman untuk notch/home indicator, serta panduan pemasangan Safari di halaman masuk dan Pengaturan. Pencatatan cloud membutuhkan internet; belum ada sinkronisasi offline.
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

Cara langsung dari terminal (tanpa harus menghubungkan repository Git):

```powershell
npx vercel@latest login
npx vercel@latest link
```

Jalankan perintah satu per satu dari folder proyek. Selesaikan login melalui browser, lalu pilih akun pribadi/team yang sesuai dan buat proyek `catat-uang` pada direktori `./`.

Di dashboard proyek Vercel, buka **Settings → Environment Variables**. Tambahkan `DATABASE_URL` untuk **Production** dengan nilai connection string Neon dari `.env.local` (URL saja, tanpa `DATABASE_URL=` dan tanpa tanda kutip). Set `ENABLE_DEMO=false` untuk Production. Jika database yang dipakai sama dengan database lokal yang sudah dimigrasi dan dibuatkan akun, tahap migrasi dan pembuatan akun tidak perlu diulang.

Setelah pengaturan disimpan, jalankan:

```powershell
npx vercel@latest deploy --prod
```

Gunakan preset **Next.js**, build command `npm run build`, dan output directory bawaan. Buka URL production dari hasil deployment, lalu masuk menggunakan akun keluarga yang sudah dibuat. `.vercelignore` mengecualikan file rahasia, cache, browser pengujian, dan hasil build lokal dari unggahan CLI. Untuk memperbarui aplikasi, jalankan perintah deployment yang sama dari folder proyek setelah perubahan selesai.

Alternatif melalui integrasi Git:

1. Simpan proyek di repository Git lalu impor ke Vercel sebagai proyek **Next.js**. Bisa juga memakai Vercel CLI jika sudah tersedia.
2. Tambahkan integrasi Neon dan hubungkan ke proyek. Pastikan environment variable **DATABASE_URL** tersedia untuk lingkungan **Production**.
3. Gunakan database/branch Neon terpisah untuk **Preview** agar percobaan tidak mengubah data asli.
4. Jalankan `npm run db:migrate` dan `npm run account:create` menggunakan koneksi database production dari komputer Anda. Migrasi tidak dijalankan otomatis saat build.
5. Deploy. Build command: `npm run build`; output memakai pengaturan bawaan Next.js.
6. Buka URL HTTPS Vercel dan masuk. Tambahkan halaman ke layar utama melalui menu browser jika diinginkan.

Tidak perlu VPS, komputer yang terus menyala, atau IP publik di rumah. Vercel menjalankan aplikasi; Neon menjalankan database. Periksa ketentuan paket yang dipilih: Vercel Hobby ditujukan untuk penggunaan pribadi/nonkomersial, dan layanan database memiliki kuota terpisah.

Kredensial Neon dan akun Vercel tidak termasuk dalam repository ini. Build lokal bisa dilakukan tanpa kredensial; data cloud hanya bisa diuji setelah koneksi dikonfigurasi.

## 4. Pasang di iPhone / iPad

1. Buka alamat **production HTTPS yang tetap** di Safari (misalnya `nama-project.vercel.app`).
2. Ketuk **Bagikan**; pada sebagian tata letak Safari, buka **Lainnya (…)** dahulu.
3. Pilih **Tambah ke Layar Utama** (Add to Home Screen).
4. Jika tersedia, aktifkan **Buka sebagai App Web**, lalu ketuk **Tambah**.
5. Buka ikon **Catat Uang** di layar utama dan masuk menggunakan akun keluarga.

Panduan yang sama tersedia di halaman masuk dan **Pengaturan → Pasang di iPhone / iPad**. Safari menjalankan pemasangan melalui menunya sendiri. Aplikasi tetap membutuhkan internet untuk membuka dan menyimpan catatan cloud.

Untuk Android, buka alamat yang sama di Chrome lalu pilih menu **Instal dan buat pintasan → Instal** atau **Tambahkan ke layar utama → Instal aplikasi**, sesuai versi browser.

Pembaruan fitur dilakukan dengan deploy ke project dan alamat production yang sama, kemudian muat ulang aplikasi. Pemasangan ulang tidak diperlukan untuk pembaruan fitur. Identitas manifest `/` tetap sama dengan identitas sebelumnya yang mengikuti `start_url`. Ikon dan nama aplikasi mungkin diperbarui dengan mekanisme berbeda oleh browser.

Referensi pemasangan: [petunjuk Apple](https://support.apple.com/id-id/guide/iphone/iphea86e5236/ios). Tampilan memakai [safe area WebKit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) agar konten tidak tertutup bagian fisik layar.

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
    pwa/               Panduan memasang aplikasi di perangkat Apple
    settings/          Saldo awal, cadangan, dan pemulihan
    transactions/      Daftar, Table View, formulir, dan konfirmasi hapus
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
- Table View mengenali transaksi pemasukan berketerangan tepat **Saldo awal** (huruf besar/kecil dan spasi diabaikan). Ringkasan bawah menggabungkannya dengan saldo awal dari Pengaturan dan memisahkan pemasukan lainnya. Transaksi tetap ada di kolom debit, tetapi tidak ditambahkan dua kali: **sisa uang = saldo awal yang ditampilkan + pemasukan lainnya − pengeluaran**. Data asli, total debit, saldo berjalan, dan ringkasan bulanan tidak diubah. Catat dana yang sama melalui Pengaturan atau transaksi, jangan keduanya.
- Buku kosong tetap menampilkan saldo awal; saldo negatif ditampilkan apa adanya. Pilihan bulan di Buku kas dan Laporan tidak membatasi data Table View.
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
npx playwright install chromium webkit
npm run test:e2e
```

Pengujian SQL menggunakan PostgreSQL WASM lokal (PGlite) agar constraint, isolasi akun, konflik revisi, dan rollback bisa diuji tanpa menyentuh Neon. Pengujian browser menggunakan mode contoh pada Chromium desktop/Android serta WebKit dengan ukuran iPhone dan iPad. Pengujian ini memeriksa perhitungan lintas bulan dan tahun, seluruh baris Table View, transaksi, metadata PWA, dan panduan pemasangan. Pemasangan nyata melalui menu Safari serta perilaku notch/home indicator tetap perlu diperiksa di perangkat Apple melalui HTTPS. Pengujian end-to-end koneksi Neon memerlukan database terkonfigurasi.

## Referensi

- [Next.js App Router](https://nextjs.org/docs/app)
- [Driver Neon](https://neon.com/docs/serverless/serverless-driver)
- [Integrasi penyimpanan Vercel](https://vercel.com/docs/marketplace-storage)
