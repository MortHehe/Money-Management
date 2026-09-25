import "server-only";

import type { BookData, Mutation } from "@/lib/types";
import { bookSchema } from "@/lib/validation";
import { getDatabase } from "./db";

/** Satu query memberikan snapshot saldo awal dan transaksi yang konsisten. */
export async function readBook(accountId: string): Promise<BookData> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT jsonb_build_object(
      'settings', jsonb_build_object('name', b.name, 'openingBalance', b.opening_balance),
      'revision', b.revision,
      'transactions', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', t.id, 'kind', t.kind, 'amount', t.amount,
          'date', to_char(t.transaction_date, 'YYYY-MM-DD'),
          'category', t.category, 'description', t.description,
          'createdAt', to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        ) ORDER BY t.transaction_date, t.created_at, t.id)
        FROM transactions t WHERE t.account_id = b.account_id
      ), '[]'::jsonb)
    ) AS data
    FROM books b WHERE b.account_id = ${accountId}
  `;

  if (!rows[0]) {
    throw new Error("BOOK_NOT_FOUND");
  }

  return bookSchema.parse(rows[0].data);
}

export async function changeBook(
  accountId: string,
  revision: number,
  mutation: Mutation,
): Promise<BookData> {
  const sql = getDatabase();
  let payload: unknown;

  switch (mutation.type) {
    case "create":
    case "update":
      payload = mutation.transaction;
      break;
    case "delete":
      payload = { id: mutation.id };
      break;
    case "settings":
      payload = mutation.settings;
      break;
    case "restore":
      payload = mutation.backup;
      break;
  }

  await sql`SELECT mutate_book(${accountId}::uuid, ${revision}::integer, ${mutation.type}, ${JSON.stringify(payload)}::jsonb)`;
  return readBook(accountId);
}
