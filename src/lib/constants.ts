import type { TransactionKind } from "./types";

export const APP_NAME = "Catat Uang";
export const MAX_AMOUNT = 999_999_999_999;
export const MAX_TRANSACTIONS = 5_000;
export const MAX_BACKUP_BYTES = 3_000_000;
export const DEMO_STORAGE_KEY = "catat-uang:demo:v1";

export const CATEGORIES: Record<TransactionKind, readonly string[]> = {
  income: ["Gaji", "Pemberian", "Usaha", "Lainnya"],
  expense: ["Belanja", "Makanan", "Tagihan", "Transportasi", "Kesehatan", "Lainnya"],
};

export const CATEGORY_COLORS: Record<string, string> = {
  Belanja: "#266451",
  Makanan: "#a57642",
  Tagihan: "#657cba",
  Transportasi: "#929d67",
  Kesehatan: "#b5717c",
  Lainnya: "#8a9290",
};
