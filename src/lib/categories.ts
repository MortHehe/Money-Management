import { CATEGORIES, CATEGORY_COLORS } from "./constants";
import type { Transaction, TransactionKind } from "./types";

/** Kategori bawaan diikuti kategori yang pernah dipakai dalam buku ini. */
export function getCategoryOptions(
  kind: TransactionKind,
  transactions: readonly Transaction[],
): string[] {
  const defaults = CATEGORIES[kind];
  const custom = new Set(
    transactions
      .filter((transaction) => transaction.kind === kind)
      .map((transaction) => transaction.category)
      .filter((category) => !defaults.includes(category)),
  );

  return [
    ...defaults,
    ...[...custom].sort((first, second) => first.localeCompare(second, "id")),
  ];
}

/** Kategori custom tetap punya warna, termasuk nama seperti "constructor". */
export function getCategoryColor(category: string): string {
  const color = CATEGORY_COLORS[category];

  return typeof color === "string" ? color : CATEGORY_COLORS.Lainnya;
}
