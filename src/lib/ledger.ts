import { MAX_TRANSACTIONS } from "./constants";
import type { BookData, Mutation, Transaction } from "./types";

export interface LedgerRow extends Transaction {
  balance: number;
}

/** Urutan yang stabil membuat saldo tetap konsisten saat tanggalnya sama. */
export function compareTransactions(first: Transaction, second: Transaction): number {
  return (
    first.date.localeCompare(second.date) ||
    first.createdAt.localeCompare(second.createdAt) ||
    first.id.localeCompare(second.id)
  );
}

export function signedAmount(transaction: Transaction): number {
  return transaction.kind === "income" ? transaction.amount : -transaction.amount;
}

export function buildLedger(data: BookData): LedgerRow[] {
  let balance = data.settings.openingBalance;

  return [...data.transactions].sort(compareTransactions).map((transaction) => {
    balance += signedAmount(transaction);
    return { ...transaction, balance };
  });
}

/** Ringkasan seluruh buku kas, termasuk transaksi dari bulan dan tahun berbeda. */
export function summarizeBook(data: BookData) {
  let income = 0;
  let expense = 0;

  for (const transaction of data.transactions) {
    if (transaction.kind === "income") {
      income += transaction.amount;
    } else {
      expense += transaction.amount;
    }
  }

  const opening = data.settings.openingBalance;

  return {
    opening,
    income,
    expense,
    closing: opening + income - expense,
    count: data.transactions.length,
  };
}

export function summarizeMonth(data: BookData, month: string) {
  const earlier = data.transactions.filter((item) => item.date.slice(0, 7) < month);
  const current = data.transactions.filter((item) => item.date.startsWith(month));
  const opening = earlier.reduce(
    (total, item) => total + signedAmount(item),
    data.settings.openingBalance,
  );
  const income = current
    .filter((item) => item.kind === "income")
    .reduce((total, item) => total + item.amount, 0);
  const expense = current
    .filter((item) => item.kind === "expense")
    .reduce((total, item) => total + item.amount, 0);

  return {
    opening,
    income,
    expense,
    closing: opening + income - expense,
    count: current.length,
  };
}

export function currentBalance(data: BookData): number {
  return data.transactions.reduce(
    (total, item) => total + signedAmount(item),
    data.settings.openingBalance,
  );
}

export function expenseByCategory(transactions: Transaction[], month: string) {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.kind === "expense" && transaction.date.startsWith(month)) {
      totals.set(
        transaction.category,
        (totals.get(transaction.category) ?? 0) + transaction.amount,
      );
    }
  }

  return [...totals]
    .map(([category, amount]) => ({ category, amount }))
    .sort((first, second) => second.amount - first.amount);
}

/** Mode contoh mengikuti aturan perubahan yang sama dengan database. */
export function applyDemoMutation(data: BookData, mutation: Mutation): BookData {
  let transactions = [...data.transactions];
  let settings = data.settings;

  switch (mutation.type) {
    case "create": {
      if (transactions.some((item) => item.id === mutation.transaction.id)) {
        return data;
      }

      if (transactions.length >= MAX_TRANSACTIONS) {
        throw new Error("Buku kas mencapai batas 5.000 transaksi.");
      }

      transactions.push({ ...mutation.transaction, createdAt: new Date().toISOString() });
      break;
    }

    case "update": {
      if (!transactions.some((item) => item.id === mutation.transaction.id)) {
        throw new Error("Transaksi tidak ditemukan. Muat ulang data.");
      }

      transactions = transactions.map((item) =>
        item.id === mutation.transaction.id ? { ...item, ...mutation.transaction } : item,
      );
      break;
    }

    case "delete": {
      transactions = transactions.filter((item) => item.id !== mutation.id);
      break;
    }

    case "settings": {
      settings = mutation.settings;
      break;
    }

    case "restore": {
      transactions = mutation.backup.transactions;
      settings = mutation.backup.settings;
      break;
    }
  }

  return { settings, transactions, revision: data.revision + 1 };
}
