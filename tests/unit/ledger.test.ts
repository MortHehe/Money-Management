import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyDemoMutation,
  buildLedger,
  currentBalance,
  summarizeMonth,
} from "../../src/lib/ledger";
import { backupSchema, transactionInputSchema } from "../../src/lib/validation";
import { createBackup, createCsv, parseBackup } from "../../src/lib/backup";
import type { BookData, Transaction } from "../../src/lib/types";

const income: Transaction = {
  id: "10000000-0000-4000-8000-000000000001",
  kind: "income",
  amount: 500_000,
  date: "2026-01-31",
  category: "Gaji",
  description: "Gaji Januari",
  createdAt: "2026-01-31T12:00:00.000Z",
};

const expense: Transaction = {
  ...income,
  id: "10000000-0000-4000-8000-000000000002",
  kind: "expense",
  amount: 75_000,
  date: "2026-02-02",
  category: "Belanja",
  description: "Belanja sayur",
};

function fixture(): BookData {
  return {
    settings: { name: "Buku keluarga", openingBalance: 100_000 },
    transactions: [expense, income],
    revision: 0,
  };
}

test("saldo bulan berikutnya membawa saldo lama, meski array transaksi tidak berurutan", () => {
  const summary = summarizeMonth(fixture(), "2026-02");
  assert.deepEqual(summary, {
    opening: 600_000,
    income: 0,
    expense: 75_000,
    closing: 525_000,
    count: 1,
  });
  assert.equal(currentBalance(fixture()), 525_000);
  assert.deepEqual(
    buildLedger(fixture()).map((row) => row.balance),
    [600_000, 525_000],
  );
});

test("mengubah transaksi lama menghitung ulang semua saldo sesudahnya", () => {
  const changed = applyDemoMutation(fixture(), {
    type: "update",
    transaction: { ...income, amount: 800_000 },
  });
  assert.equal(summarizeMonth(changed, "2026-02").opening, 900_000);
  assert.equal(buildLedger(changed).at(-1)?.balance, 825_000);
});

test("menghapus transaksi tidak meninggalkan saldo yang disimpan terpisah", () => {
  const changed = applyDemoMutation(fixture(), { type: "delete", id: income.id });
  assert.equal(currentBalance(changed), 25_000);
});

test("saldo negatif diperbolehkan dan tidak disembunyikan", () => {
  const data = fixture();
  data.transactions = [{ ...expense, amount: 150_000 }];
  assert.equal(currentBalance(data), -50_000);
  assert.ok(createCsv(data, "2026-02").includes('"-50000"'));
});

test("permintaan simpan ulang dengan ID sama tidak menggandakan transaksi", () => {
  const data = fixture();
  const changed = applyDemoMutation(data, { type: "create", transaction: income });
  assert.equal(changed.transactions.length, 2);
  assert.equal(changed.revision, data.revision);
});

test("validasi menolak pecahan, nominal negatif, tanggal palsu, dan kategori silang", () => {
  assert.equal(
    transactionInputSchema.safeParse({ ...income, amount: 1.5 }).success,
    false,
  );
  assert.equal(
    transactionInputSchema.safeParse({ ...income, amount: -5 }).success,
    false,
  );
  assert.equal(
    transactionInputSchema.safeParse({ ...income, date: "2026-02-30" }).success,
    false,
  );
  assert.equal(
    transactionInputSchema.safeParse({ ...income, category: "Belanja" }).success,
    false,
  );
});

test("pemulihan mengembalikan saldo awal dan seluruh transaksi", () => {
  const backup = parseBackup(JSON.stringify(createBackup(fixture())));
  const empty: BookData = {
    settings: { name: "Buku kosong", openingBalance: 0 },
    transactions: [],
    revision: 0,
  };
  const restored = applyDemoMutation(empty, { type: "restore", backup });
  assert.equal(currentBalance(restored), 525_000);
  assert.equal(restored.settings.name, "Buku keluarga");
});

test("cadangan rusak dan ID ganda ditolak sebelum mengganti catatan", () => {
  const backup = createBackup(fixture());
  assert.equal(
    backupSchema.safeParse({ ...backup, transactions: [income, income] }).success,
    false,
  );
  assert.throws(() => parseBackup("{}"));
  assert.throws(() => parseBackup("not json"));
});

test("ekspor CSV mempertahankan saldo lintas bulan dan menetralkan formula Excel", () => {
  const data = fixture();
  data.transactions[0] = { ...expense, description: '=HYPERLINK("https://example.com")' };
  const csv = createCsv(data, "2026-02");
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("'="));
  assert.ok(csv.includes('"525000"'));
  assert.ok(!csv.includes("Gaji Januari"));
});

test("urutan tanggal sama tetap deterministik", () => {
  const data = fixture();
  data.transactions = [{ ...expense, date: income.date }, income];
  assert.deepEqual(
    buildLedger(data).map((item) => item.id),
    [income.id, expense.id],
  );
});
