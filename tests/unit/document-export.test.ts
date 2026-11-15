import assert from "node:assert/strict";
import { test } from "node:test";
import { createBookDocument } from "../../src/lib/document-export";
import { MAX_AMOUNT, MAX_TRANSACTIONS } from "../../src/lib/constants";
import { formatMoney, formatNumber } from "../../src/lib/format";
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

async function exportBook(data: BookData) {
  const document = await createBookDocument(data);
  assert.equal(
    document.type,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  return readDocx(new Uint8Array(await document.arrayBuffer()));
}

test("Word memuat empat kolom dan semua periode dalam urutan Table View tanpa mengubah data", async () => {
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
    ["31/12/2025", "Catatan 1", "200.000", "—"],
    ["01/02/2026", "Catatan 2", "1.000", "—"],
    ["01/02/2026", "Catatan 3", "—", "75.000"],
    ["01/01/2027", "Catatan 4", "500.000", "—"],
    ["Total keseluruhan", "701.000", "75.000"],
  ]);
  assert.ok(document.paragraphs.includes("Buku keluarga"));
  assert.ok(document.paragraphs.includes("4 transaksi · Semua periode"));
  assert.ok(document.paragraphs.includes("Saldo awal buku kas: Rp 100.000"));
  assert.ok(document.paragraphs.includes("Sisa uang: Rp 726.000"));
  assert.match(document.xml, /<w:tblHeader\b/);
  assert.deepEqual(data, before);
});

test("Word menampilkan buku kosong beserta saldo awal dan total nol", async () => {
  const document = await exportBook(book());
  assert.deepEqual(document.rows, [
    ["Tanggal", "Keterangan", "Debit", "Kredit"],
    ["Belum ada transaksi dalam buku kas."],
    ["Total keseluruhan", "0", "0"],
  ]);
  assert.ok(document.paragraphs.includes("0 transaksi · Semua periode"));
  assert.ok(document.paragraphs.includes("Sisa uang: Rp 100.000"));
});

test("saldo awal dari Pengaturan dan debit dihitung sekali dalam dokumen Word", async () => {
  const document = await exportBook(
    book([
      transaction(1, { description: "  SALDO   Awal  ", amount: 500_000 }),
      transaction(2, { amount: 25_000 }),
      transaction(3, { kind: "expense", amount: 75_000 }),
    ]),
  );
  assert.deepEqual(document.rows.at(-1), ["Total keseluruhan", "525.000", "75.000"]);
  assert.ok(document.paragraphs.includes("Saldo awal buku kas: Rp 600.000"));
  assert.ok(document.paragraphs.includes("Uang masuk lainnya: Rp 25.000"));
  assert.ok(document.paragraphs.includes("Sisa uang: Rp 550.000"));
  assert.ok(
    document.paragraphs.some((text) =>
      text.includes("Rp 100.000 dari Pengaturan dan Rp 500.000 dari transaksi"),
    ),
  );
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
    document.paragraphs.includes(`Sisa uang: ${formatMoney(100_000 - MAX_AMOUNT)}`),
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
    "Total keseluruhan",
    formatNumber(MAX_AMOUNT * MAX_TRANSACTIONS),
    "0",
  ]);
});
