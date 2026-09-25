"use client";

import { useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, LoaderCircle } from "lucide-react";
import { CATEGORIES, MAX_AMOUNT } from "@/lib/constants";
import { createTransactionId } from "@/lib/browser-id";
import { getToday } from "@/lib/format";
import { transactionInputSchema } from "@/lib/validation";
import type { Transaction, TransactionInput, TransactionKind } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { AmountInput } from "@/components/ui/amount-input";

interface TransactionFormProps {
  kind: TransactionKind;
  transaction?: Transaction;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onSave: (transaction: TransactionInput) => Promise<void>;
}

export function TransactionForm({
  kind: initialKind,
  transaction,
  busy,
  error,
  onClose,
  onSave,
}: TransactionFormProps) {
  const [id] = useState(() => transaction?.id ?? createTransactionId());
  const [kind, setKind] = useState(initialKind);
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [date, setDate] = useState(transaction?.date ?? getToday());
  const [category, setCategory] = useState(
    transaction?.category ?? CATEGORIES[initialKind][0],
  );
  const [validationError, setValidationError] = useState("");

  function changeKind(nextKind: TransactionKind) {
    setKind(nextKind);
    setCategory(CATEGORIES[nextKind][0]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");
    const result = transactionInputSchema.safeParse({
      id,
      kind,
      amount: Number(amount),
      description,
      date,
      category,
    });

    if (!result.success) {
      setValidationError(
        !amount || Number(amount) < 1 || Number(amount) > MAX_AMOUNT
          ? "Isi nominal antara Rp1 dan Rp999.999.999.999."
          : "Periksa tanggal dan isi keterangan transaksi (maksimal 160 karakter).",
      );
      return;
    }

    await onSave(result.data);
  }

  return (
    <Modal
      title={transaction ? "Ubah transaksi" : "Catat transaksi baru"}
      subtitle="Isi catatannya, saldo kami hitungkan."
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={handleSubmit} className="transaction-form">
        <fieldset disabled={busy}>
          <legend className="sr-only">Detail transaksi</legend>
          <div className="kind-selector" aria-label="Jenis transaksi">
            <button
              type="button"
              aria-pressed={kind === "income"}
              className={kind === "income" ? "selected income" : ""}
              onClick={() => changeKind("income")}
            >
              <ArrowDownLeft size={19} /> Uang masuk
            </button>
            <button
              type="button"
              aria-pressed={kind === "expense"}
              className={kind === "expense" ? "selected expense" : ""}
              onClick={() => changeKind("expense")}
            >
              <ArrowUpRight size={19} /> Uang keluar
            </button>
          </div>
          <label htmlFor="transaction-amount">
            Nominal <span className="required">*</span>
          </label>
          <AmountInput
            id="transaction-amount"
            value={amount}
            onChange={setAmount}
            large
          />
          <label htmlFor="transaction-description">
            Keterangan <span className="required">*</span>
          </label>
          <input
            id="transaction-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={
              kind === "income" ? "Contoh: uang dari anak" : "Contoh: belanja pasar"
            }
            maxLength={160}
            required
          />
          <div className="form-row">
            <div>
              <label htmlFor="transaction-date">Tanggal</label>
              <input
                id="transaction-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                min="2000-01-01"
                max={getToday()}
                required
              />
            </div>
            <div>
              <label htmlFor="transaction-category">Kategori</label>
              <select
                id="transaction-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {CATEGORIES[kind].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>
        {(validationError || error) && (
          <p className="form-error" role="alert">
            {validationError || error}
          </p>
        )}
        <div className="modal-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Batal
          </button>
          <button type="submit" className="button button-primary" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={19} /> : <Check size={19} />}
            {busy ? "Menyimpan…" : "Simpan transaksi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
