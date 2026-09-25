import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const firstAccount = "10000000-0000-4000-8000-000000000001";
const secondAccount = "10000000-0000-4000-8000-000000000002";
const transaction = {
  id: "20000000-0000-4000-8000-000000000001",
  kind: "income",
  amount: 500_000,
  category: "Gaji",
  description: "Gaji keluarga",
  date: "2026-01-01",
  createdAt: "2026-01-01T12:00:00.000Z",
};

let database: PGlite;

before(async () => {
  database = new PGlite();
  await database.exec(await readFile("database/001_initial.sql", "utf8"));
});

beforeEach(async () => {
  await database.exec("TRUNCATE accounts CASCADE");
  await database.query(
    "INSERT INTO accounts (id, email, password_hash) VALUES ($1, 'satu@example.test', 'hash'), ($2, 'dua@example.test', 'hash')",
    [firstAccount, secondAccount],
  );
  await database.query(
    "INSERT INTO books (account_id, name, opening_balance) VALUES ($1, 'Buku satu', 100000), ($2, 'Buku dua', 200000)",
    [firstAccount, secondAccount],
  );
});

after(async () => {
  await database.close();
});

async function mutate(
  account: string,
  revision: number,
  action: string,
  payload: unknown,
) {
  return database.query(
    "SELECT mutate_book($1::uuid, $2::integer, $3::text, $4::jsonb)",
    [account, revision, action, JSON.stringify(payload)],
  );
}

test("database menolak revisi lama dan mempertahankan perubahan perangkat pertama", async () => {
  await mutate(firstAccount, 0, "create", transaction);
  await assert.rejects(
    mutate(firstAccount, 0, "settings", { name: "Tertimpa", openingBalance: 0 }),
    /BOOK_CONFLICT/,
  );
  const result = await database.query<{ name: string; revision: number }>(
    "SELECT name, revision FROM books WHERE account_id = $1",
    [firstAccount],
  );
  assert.equal(result.rows[0].name, "Buku satu");
  assert.equal(result.rows[0].revision, 1);
});

test("pengulangan permintaan setelah respons hilang tidak membuat transaksi ganda", async () => {
  await mutate(firstAccount, 0, "create", transaction);
  await mutate(firstAccount, 0, "create", transaction);
  const result = await database.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM transactions",
  );
  assert.equal(result.rows[0].count, 1);
});

test("akun lain tidak dapat mengubah atau menghapus transaksi pemilik pertama", async () => {
  await mutate(firstAccount, 0, "create", transaction);
  await assert.rejects(
    mutate(secondAccount, 0, "update", { ...transaction, amount: 1 }),
    /TRANSACTION_NOT_FOUND/,
  );
  await mutate(secondAccount, 0, "delete", { id: transaction.id });
  const result = await database.query<{ amount: number }>(
    "SELECT amount::int FROM transactions WHERE account_id = $1",
    [firstAccount],
  );
  assert.equal(result.rows[0].amount, 500_000);
});

test("pemulihan gagal di tengah proses mengembalikan seluruh data sebelumnya", async () => {
  await mutate(firstAccount, 0, "create", transaction);
  await assert.rejects(
    mutate(firstAccount, 1, "restore", {
      settings: { name: "Cadangan", openingBalance: 0 },
      transactions: [
        transaction,
        { ...transaction, id: "20000000-0000-4000-8000-000000000002", amount: -1 },
      ],
    }),
  );
  const result = await database.query<{ amount: number; revision: number }>(
    "SELECT t.amount::int, b.revision FROM transactions t JOIN books b USING (account_id) WHERE t.account_id = $1",
    [firstAccount],
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].amount, 500_000);
  assert.equal(result.rows[0].revision, 1);
});

test("pemulihan valid mengganti saldo awal dan transaksi hanya untuk akun yang dipilih", async () => {
  await mutate(secondAccount, 0, "create", transaction);
  await mutate(firstAccount, 0, "restore", {
    settings: { name: "Pulih", openingBalance: 750_000 },
    transactions: [transaction],
  });
  const books = await database.query<{ name: string; opening_balance: number }>(
    "SELECT name, opening_balance::int FROM books ORDER BY account_id",
  );
  assert.deepEqual(books.rows, [
    { name: "Pulih", opening_balance: 750_000 },
    { name: "Buku dua", opening_balance: 200_000 },
  ]);
  const transactions = await database.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM transactions",
  );
  assert.equal(transactions.rows[0].count, 2);
});

test("constraint database menolak jumlah nol dan kategori yang tidak cocok", async () => {
  await assert.rejects(mutate(firstAccount, 0, "create", { ...transaction, amount: 0 }));
  await assert.rejects(
    mutate(firstAccount, 0, "create", { ...transaction, category: "Belanja" }),
  );
  const result = await database.query<{ revision: number }>(
    "SELECT revision FROM books WHERE account_id = $1",
    [firstAccount],
  );
  assert.equal(result.rows[0].revision, 0);
});
