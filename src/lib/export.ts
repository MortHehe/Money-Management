import type { Transaction } from "./types";

/** Bulan dan kategori membatasi isi file, tanpa mengikuti pencarian atau halaman UI. */
export function filterExportTransactions<T extends Transaction>(
  transactions: readonly T[],
  month: string,
  category = "",
): T[] {
  return transactions.filter(
    (transaction) =>
      transaction.date.slice(0, 7) === month &&
      (!category || transaction.category === category),
  );
}

export function getExportFilename(
  month: string,
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

  return `catat-uang-${month}${suffix}.${extension}`;
}
