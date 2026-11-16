import { formatMonth } from "./format";
import { compareTransactions, summarizeBook, summarizeMonth } from "./ledger";
import type { BookData, Transaction } from "./types";

export type ExportScope = "month" | "all";
export const ALL_EXPORT_PERIOD = "all";

/** Periode dan kategori membatasi isi file, tanpa mengikuti pencarian atau halaman UI. */
export function filterExportTransactions<T extends Transaction>(
  transactions: readonly T[],
  period: string,
  category = "",
): T[] {
  return transactions.filter(
    (transaction) =>
      (period === ALL_EXPORT_PERIOD || transaction.date.slice(0, 7) === period) &&
      (!category || transaction.category === category),
  );
}

export function getExportPeriodLabel(period: string): string {
  return period === ALL_EXPORT_PERIOD ? "Semua periode" : formatMonth(period);
}

/** Modal awal tetap dari Pengaturan; saldo bawaan bulan merupakan nilai terpisah. */
export function summarizeExport(data: BookData, period: string, category = "") {
  const transactions = filterExportTransactions(data.transactions, period, category).sort(
    compareTransactions,
  );
  const summary = summarizeBook({ ...data, transactions });
  const carriedBalance =
    period === ALL_EXPORT_PERIOD ? summary.opening : summarizeMonth(data, period).opening;

  return {
    ...summary,
    transactions,
    capital: summary.opening,
    carriedBalance,
    closing: (category ? 0 : carriedBalance) + summary.income - summary.expense,
    periodLabel: getExportPeriodLabel(period),
    totalLabel: category
      ? "Total kategori"
      : period === ALL_EXPORT_PERIOD
        ? "Total keseluruhan"
        : "Total bulan ini",
  };
}

export function getExportFilename(
  period: string,
  category: string,
  extension: "docx" | "csv",
): string {
  const categoryName = category
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\p{Cc}]/gu, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[. -]+|[. -]+$/g, "");
  const suffix = category ? `-${categoryName || "kategori"}` : "";

  const periodName = period === ALL_EXPORT_PERIOD ? "semua-periode" : period;
  return `catat-uang-${periodName}${suffix}.${extension}`;
}
