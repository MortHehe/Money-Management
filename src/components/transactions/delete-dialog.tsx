"use client";

import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { formatMoney } from "@/lib/format";
import type { Transaction } from "@/lib/types";

interface DeleteDialogProps {
  transaction: Transaction;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteDialog({
  transaction,
  busy,
  error,
  onClose,
  onConfirm,
}: DeleteDialogProps) {
  return (
    <Modal
      title="Hapus transaksi ini?"
      subtitle="Saldo akan dihitung ulang setelah transaksi dihapus."
      busy={busy}
      onClose={onClose}
    >
      <div className="delete-preview">
        <span>{transaction.description}</span>
        <strong>{formatMoney(transaction.amount)}</strong>
      </div>
      <p className="muted">
        Tindakan ini tidak dapat dibatalkan. Pastikan catatan yang dipilih sudah benar.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="modal-footer">
        <button
          className="button button-secondary"
          onClick={onClose}
          disabled={busy}
          autoFocus
        >
          Batal
        </button>
        <button className="button button-danger" onClick={onConfirm} disabled={busy}>
          <Trash2 size={18} />
          {busy ? "Menghapus…" : "Ya, hapus"}
        </button>
      </div>
    </Modal>
  );
}
