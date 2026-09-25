import type { BookBackup, BookData } from "./types";
import { buildLedger } from "./ledger";
import { MAX_BACKUP_BYTES } from "./constants";
import { backupSchema } from "./validation";

export function createBackup(data: BookData): BookBackup {
  return {
    format: "catat-uang",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: data.settings,
    transactions: data.transactions,
  };
}

export function parseBackup(content: string): BookBackup {
  if (new TextEncoder().encode(content).byteLength > MAX_BACKUP_BYTES) {
    throw new Error("Ukuran cadangan maksimal 3 MB.");
  }

  const result = backupSchema.safeParse(JSON.parse(content));

  if (!result.success) {
    throw new Error("File bukan cadangan Catat Uang yang valid, atau isinya rusak.");
  }

  return result.data;
}

/** Awalan apostrof mencegah keterangan dieksekusi sebagai rumus oleh Excel. */
export function escapeCsvCell(value: string | number): string {
  if (typeof value === "number") {
    return `"${value}"`;
  }

  const safeValue = /^[\s]*[=+\-@\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function createCsv(data: BookData, month: string): string {
  const header = [
    "Tanggal",
    "Keterangan",
    "Kategori",
    "Uang masuk",
    "Uang keluar",
    "Saldo",
  ];
  const rows = buildLedger(data)
    .filter((item) => item.date.startsWith(month))
    .map((item) => [
      item.date,
      item.description,
      item.category,
      item.kind === "income" ? item.amount : 0,
      item.kind === "expense" ? item.amount : 0,
      item.balance,
    ]);

  return (
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(escapeCsvCell).join(";")).join("\r\n")
  );
}

export function downloadFile(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
