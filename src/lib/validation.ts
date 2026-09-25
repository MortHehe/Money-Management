import { z } from "zod";

import { CATEGORIES, MAX_AMOUNT, MAX_TRANSACTIONS } from "./constants";

const amountSchema = z.number().int().min(1).max(MAX_AMOUNT);

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value &&
      value >= "2000-01-01" &&
      value <= "2100-12-31"
    );
  }, "Tanggal tidak valid. Gunakan tahun 2000–2100.");

export const transactionInputSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(["income", "expense"]),
    amount: amountSchema,
    date: dateSchema,
    category: z.string().max(40),
    description: z.string().trim().min(1, "Isi keterangan transaksi.").max(160),
  })
  .refine((transaction) => CATEGORIES[transaction.kind].includes(transaction.category), {
    message: "Kategori tidak sesuai dengan jenis transaksi.",
    path: ["category"],
  });

export const transactionSchema = transactionInputSchema.safeExtend({
  createdAt: z.iso.datetime(),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(50),
  openingBalance: z.number().int().min(0).max(MAX_AMOUNT),
});

export const bookSchema = z.object({
  settings: settingsSchema,
  transactions: z.array(transactionSchema).max(MAX_TRANSACTIONS),
  revision: z.number().int().min(0),
});

export const backupSchema = z
  .object({
    format: z.literal("catat-uang"),
    version: z.literal(1),
    exportedAt: z.iso.datetime(),
    settings: settingsSchema,
    transactions: z.array(transactionSchema).max(MAX_TRANSACTIONS),
  })
  .refine(
    (backup) =>
      new Set(backup.transactions.map((item) => item.id)).size ===
      backup.transactions.length,
    {
      message: "Cadangan berisi ID transaksi ganda.",
    },
  );

export const mutationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create"), transaction: transactionInputSchema }),
  z.object({ type: z.literal("update"), transaction: transactionInputSchema }),
  z.object({ type: z.literal("delete"), id: z.uuid() }),
  z.object({ type: z.literal("settings"), settings: settingsSchema }),
  z.object({ type: z.literal("restore"), backup: backupSchema }),
]);

export const loginSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});
