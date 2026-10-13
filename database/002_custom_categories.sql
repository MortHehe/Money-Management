-- Migrasi 001 tetap utuh karena checksum-nya sudah tersimpan di database.
-- Ganti hanya batasan daftar kategori; jenis, nominal, tanggal, dan akun tetap divalidasi.
ALTER TABLE transactions
  DROP CONSTRAINT transactions_check,
  ADD CONSTRAINT transactions_category_check CHECK (
    char_length(category) BETWEEN 1 AND 40
    AND category ~ '[^[:space:]]'
  );
