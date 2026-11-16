import assert from "node:assert/strict";
import { test } from "node:test";
import { createBookDocument } from "../../src/lib/document-export";
import { MAX_AMOUNT, MAX_TRANSACTIONS } from "../../src/lib/constants";
import { formatMoney, formatNumber } from "../../src/lib/format";
import { createCsv } from "../../src/lib/backup";
import { getExportFilename } from "../../src/lib/export";
import type { BookData, Transaction } from "../../src/lib/types";
import { readDocx } from "../helpers/docx";

function transaction(index: number, changes: Partial<Transaction> = {}): Transaction {
  return {
    id: `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    date: "2026-02-01",
    createdAt: "2026-02-01T08:00:00.000Z",
    kind: "income",
    amount: 1_000,
    category: "Gaji",
    description: `Catatan ${index}`,
    ...changes,
  };
}

function book(transactions: Transaction[] = []): BookData {
  return {
    settings: { name: "Buku keluarga", openingBalance: 100_000 },
    transactions,
    revision: 0,
  };
}

async function exportBook(data: BookData, month = "2026-02", category = "") {
  const document = await createBookDocument(data, month, category);
  assert.equal(
    document.type,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  return readDocx(new Uint8Array(await document.arrayBuffer()));
}

test("Word hanya memuat bulan pilihan dalam urutan Table View dan membawa saldo sebelumnya", async () => {
  const data = book([
    transaction(4, { date: "2027-01-01", amount: 500_000 }),
    transaction(3, { kind: "expense", amount: 75_000 }),
    transaction(2),
    transaction(1, { date: "2025-12-31", amount: 200_000 }),
  ]);
  const before = structuredClone(data);
  const document = await exportBook(data);
  assert.deepEqual(document.rows, [
    ["Tanggal", "Keterangan", "Debit", "Kredit"],
    ["01/02/2026", "Catatan 2", "1.000", "—"],
    ["01/02/2026", "Catatan 3", "—", "75.000"],
    ["Total bulan ini", "1.000", "75.000"],
  ]);
  assert.ok(document.paragraphs.includes("Buku keluarga"));
  assert.ok(document.paragraphs.includes("2 transaksi · Februari 2026 · Semua kategori"));
  assert.ok(document.paragraphs.includes("Saldo awal bulan: Rp 300.000"));
  assert.ok(document.paragraphs.includes("Saldo akhir bulan: Rp 226.000"));
  assert.match(document.xml, /<w:tblHeader\b/);
  assert.deepEqual(data, before);
});

test("Word menampilkan buku kosong beserta saldo awal dan total nol", async () => {
  const document = await exportBook(book());
  assert.deepEqual(document.rows, [
    ["Tanggal", "Keterangan", "Debit", "Kredit"],
    ["Belum ada transaksi untuk pilihan ini."],
    ["Total bulan ini", "0", "0"],
  ]);
  assert.ok(document.paragraphs.includes("0 transaksi · Februari 2026 · Semua kategori"));
  assert.ok(document.paragraphs.includes("Saldo akhir bulan: Rp 100.000"));
});

test("saldo awal dari Pengaturan dan debit dihitung sekali dalam dokumen Word", async () => {
  const document = await exportBook(
    book([
      transaction(1, { description: "  SALDO   Awal  ", amount: 500_000 }),
      transaction(2, { amount: 25_000 }),
      transaction(3, { kind: "expense", amount: 75_000 }),
    ]),
  );
  assert.deepEqual(document.rows.at(-1), ["Total bulan ini", "525.000", "75.000"]);
  assert.ok(document.paragraphs.includes("Saldo awal bulan: Rp 100.000"));
  assert.ok(document.paragraphs.includes("Uang masuk: Rp 525.000"));
  assert.ok(document.paragraphs.includes("Saldo akhir bulan: Rp 550.000"));
});

test("karakter XML, Unicode, keterangan panjang, dan baris baru tetap utuh di Word", async () => {
  const description = 'Belanja <sayur> & "buah" 🥦\nCatatan panjang '.repeat(5).trim();
  const data = book([
    transaction(1, { description, kind: "expense", amount: MAX_AMOUNT }),
  ]);
  data.settings.name = "Buku <keluarga> & tabungan";
  const document = await exportBook(data);
  assert.equal(document.rows[1][1], description);
  assert.ok(document.paragraphs.includes(data.settings.name));
  assert.ok(
    document.paragraphs.includes(
      `Saldo akhir bulan: ${formatMoney(100_000 - MAX_AMOUNT)}`,
    ),
  );
});

test("ekspor Word tidak memotong buku dengan batas maksimum 5000 transaksi", async () => {
  const data = book(
    Array.from({ length: MAX_TRANSACTIONS }, (_, index) =>
      transaction(index, { amount: MAX_AMOUNT }),
    ).reverse(),
  );
  const document = await exportBook(data);
  assert.equal(document.rows.length, MAX_TRANSACTIONS + 2);
  assert.equal(document.rows[1][1], "Catatan 0");
  assert.equal(document.rows.at(-2)?.[1], "Catatan 4999");
  assert.deepEqual(document.rows.at(-1), [
    "Total bulan ini",
    formatNumber(MAX_AMOUNT * MAX_TRANSACTIONS),
    "0",
  ]);
});

test("kategori membatasi Word dan CSV pada bulan yang dipilih untuk kedua jenis transaksi", async () => {
  const data = book([
    transaction(1, { date: "2025-02-01", amount: 200_000 }),
    transaction(2, { amount: 25_000 }),
    transaction(3, { kind: "expense", amount: 10_000 }),
    transaction(4, { category: "Gaji tambahan", amount: 900_000 }),
    transaction(5, { date: "2026-03-01", amount: 500_000 }),
  ]);
  const document = await exportBook(data, "2026-02", "Gaji");
  assert.deepEqual(document.rows, [
    ["Tanggal", "Keterangan", "Debit", "Kredit"],
    ["01/02/2026", "Catatan 2", "25.000", "—"],
    ["01/02/2026", "Catatan 3", "—", "10.000"],
    ["Total kategori", "25.000", "10.000"],
  ]);
  assert.ok(document.paragraphs.includes("2 transaksi · Februari 2026 · Gaji"));
  assert.ok(document.paragraphs.includes("Selisih kategori: Rp 15.000"));
  assert.ok(!document.paragraphs.some((text) => text.startsWith("Saldo awal")));
  const csv = createCsv(data, "2026-02", "Gaji");
  assert.equal(csv.split("\r\n").length, 3);
  assert.ok(csv.includes('"Catatan 2";"Gaji";"25000";"0";"325000"'));
  assert.ok(csv.includes('"Catatan 3";"Gaji";"0";"10000";"315000"'));
});

test("bulan atau kategori tanpa kecocokan menghasilkan file kosong tanpa memperluas pilihan", async () => {
  const data = book([
    transaction(1, { date: "2026-01-01", amount: 200_000 }),
    transaction(2, { amount: 25_000 }),
  ]);
  const category = "Bahan / atap & renovasi";
  const emptyCategory = await exportBook(data, "2026-02", category);
  assert.deepEqual(emptyCategory.rows.at(-1), ["Total kategori", "0", "0"]);
  assert.ok(emptyCategory.paragraphs.includes("Selisih kategori: Rp 0"));
  assert.ok(emptyCategory.paragraphs.includes(`Februari 2026 · ${category}`));
  assert.equal(createCsv(data, "2026-02", category).split("\r\n").length, 1);
  const emptyMonth = await exportBook(data, "2026-03");
  assert.equal(emptyMonth.rows.length, 3);
  assert.ok(emptyMonth.paragraphs.includes("Saldo awal bulan: Rp 325.000"));
  assert.ok(emptyMonth.paragraphs.includes("Saldo akhir bulan: Rp 325.000"));
});

test("nama file menyebut bulan dan kategori dengan karakter yang aman", () => {
  assert.equal(getExportFilename("2026-02", "", "docx"), "catat-uang-2026-02.docx");
  assert.equal(
    getExportFilename("2026-02", 'Bahan / atap: "utama"?', "docx"),
    "catat-uang-2026-02-Bahan-atap-utama.docx",
  );
  assert.equal(
    getExportFilename("2026-03", "Gaji", "csv"),
    "catat-uang-2026-03-Gaji.csv",
  );
});
