import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
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
let migrations: { name: string; source: string }[];

before(async () => {
  const filenames = (await readdir("database"))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  migrations = await Promise.all(
    filenames.map(async (name) => ({
      name,
      source: await readFile(`database/${name}`, "utf8"),
    })),
  );
  database = new PGlite();

  for (const migration of migrations) {
    await database.exec(migration.source);
  }
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

test("migrasi kategori mempertahankan transaksi lama dan seluruh constraint lainnya", async () => {
  const previousDatabase = new PGlite();
  const constraintQuery =
    "SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'transactions'::regclass ORDER BY conname";

  try {
    await previousDatabase.exec(migrations[0].source);
    await previousDatabase.query(
      "INSERT INTO accounts (id, email, password_hash) VALUES ($1, 'lama@example.test', 'hash')",
      [firstAccount],
    );
    await previousDatabase.query(
      "INSERT INTO books (account_id, name, opening_balance) VALUES ($1, 'Buku lama', 250000)",
      [firstAccount],
    );
    await previousDatabase.query("SELECT mutate_book($1::uuid, 0, 'create', $2::jsonb)", [
      firstAccount,
      JSON.stringify(transaction),
    ]);
    const beforeRows = await previousDatabase.query("SELECT * FROM transactions");
    const beforeBooks = await previousDatabase.query("SELECT * FROM books");
    const beforeConstraints = await previousDatabase.query<{
      conname: string;
      definition: string;
    }>(constraintQuery);

    assert.ok(
      beforeConstraints.rows.find(
        (constraint) => constraint.conname === "transactions_check",
      ),
    );

    for (const migration of migrations.slice(1)) {
      await previousDatabase.exec(migration.source);
    }

    assert.deepEqual(
      (await previousDatabase.query("SELECT * FROM transactions")).rows,
      beforeRows.rows,
    );
    assert.deepEqual(
      (await previousDatabase.query("SELECT * FROM books")).rows,
      beforeBooks.rows,
    );

    const afterConstraints = await previousDatabase.query<{
      conname: string;
      definition: string;
    }>(constraintQuery);

    assert.equal(
      afterConstraints.rows.some(
        (constraint) => constraint.conname === "transactions_check",
      ),
      false,
    );
    assert.ok(
      afterConstraints.rows.find(
        (constraint) => constraint.conname === "transactions_category_check",
      ),
    );
    assert.deepEqual(
      afterConstraints.rows.filter(
        (constraint) => constraint.conname !== "transactions_category_check",
      ),
      beforeConstraints.rows.filter(
        (constraint) => constraint.conname !== "transactions_check",
      ),
    );

    await previousDatabase.query("SELECT mutate_book($1::uuid, 1, 'update', $2::jsonb)", [
      firstAccount,
      JSON.stringify({ ...transaction, kind: "expense", category: "Gaji" }),
    ]);
  } finally {
    await previousDatabase.close();
  }
});

test("database menyimpan Gaji pengeluaran dan kategori bebas untuk kedua jenis transaksi", async () => {
  const transactions = [
    { ...transaction, kind: "expense", category: "Gaji" },
    {
      ...transaction,
      id: "20000000-0000-4000-8000-000000000002",
      kind: "income",
      category: "Sewa rumah",
    },
    {
      ...transaction,
      id: "20000000-0000-4000-8000-000000000003",
      kind: "expense",
      category: "Bahan bangunan",
    },
  ];

  for (const [revision, item] of transactions.entries()) {
    await mutate(firstAccount, revision, "create", item);
  }

  const result = await database.query<{ kind: string; category: string }>(
    "SELECT kind, category FROM transactions WHERE account_id = $1 ORDER BY id",
    [firstAccount],
  );

  assert.deepEqual(
    result.rows,
    transactions.map(({ kind, category }) => ({ kind, category })),
  );
});

test("database mempertahankan kategori bebas saat edit dan pemulihan cadangan", async () => {
  await mutate(firstAccount, 0, "create", transaction);
  await mutate(firstAccount, 1, "update", {
    ...transaction,
    kind: "expense",
    category: "Upah tukang",
  });
  const edited = await database.query<{ kind: string; category: string }>(
    "SELECT kind, category FROM transactions WHERE account_id = $1",
    [firstAccount],
  );

  assert.deepEqual(edited.rows, [{ kind: "expense", category: "Upah tukang" }]);

  await mutate(firstAccount, 2, "restore", {
    settings: { name: "Buku pulih", openingBalance: 100_000 },
    transactions: [
      { ...transaction, category: "Dana pembangunan" },
      {
        ...transaction,
        id: "20000000-0000-4000-8000-000000000002",
        kind: "expense",
        category: "Upah tukang",
      },
    ],
  });
  const restored = await database.query<{ kind: string; category: string }>(
    "SELECT kind, category FROM transactions WHERE account_id = $1 ORDER BY id",
    [firstAccount],
  );

  assert.deepEqual(restored.rows, [
    { kind: "income", category: "Dana pembangunan" },
    { kind: "expense", category: "Upah tukang" },
  ]);
});

test("database menolak kategori kosong, hanya whitespace, atau lebih dari 40 karakter", async () => {
  for (const category of ["", "   ", "\t\n\r ", "a".repeat(41)]) {
    await assert.rejects(
      mutate(firstAccount, 0, "create", { ...transaction, category }),
      /transactions_category_check/,
    );
  }

  await mutate(firstAccount, 0, "create", { ...transaction, category: "a".repeat(40) });
});

test("constraint database tetap menolak nominal, jenis, tanggal, dan keterangan tidak valid", async () => {
  const invalidFields = [
    { amount: 0 },
    { amount: -1 },
    { amount: 1_000_000_000_000 },
    { kind: "transfer" },
    { date: "1999-12-31" },
    { date: "2101-01-01" },
    { description: "   " },
  ];

  for (const fields of invalidFields) {
    await assert.rejects(
      mutate(firstAccount, 0, "create", {
        ...transaction,
        category: "Kategori bebas",
        ...fields,
      }),
    );
  }

  const result = await database.query<{ revision: number }>(
    "SELECT revision FROM books WHERE account_id = $1",
    [firstAccount],
  );
  assert.equal(result.rows[0].revision, 0);
});
