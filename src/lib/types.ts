export type TransactionKind = "income" | "expense";

export interface Transaction {
  id: string;
  kind: TransactionKind;
  amount: number;
  date: string;
  category: string;
  description: string;
  createdAt: string;
}

export type TransactionInput = Omit<Transaction, "createdAt">;

export interface BookSettings {
  name: string;
  openingBalance: number;
}

export interface BookData {
  settings: BookSettings;
  transactions: Transaction[];
  revision: number;
}

export interface BookBackup {
  format: "catat-uang";
  version: 1;
  exportedAt: string;
  settings: BookSettings;
  transactions: Transaction[];
}

export type Mutation =
  | { type: "create"; transaction: TransactionInput }
  | { type: "update"; transaction: TransactionInput }
  | { type: "delete"; id: string }
  | { type: "settings"; settings: BookSettings }
  | { type: "restore"; backup: BookBackup };

export type ActionResult<T> =
  { success: true; data: T } | { success: false; error: string };

export type Screen = "ledger" | "reports" | "settings";

export type StorageMode = "cloud" | "demo";
