import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import type { LedgerRow } from "@/lib/ledger";
import type { Transaction } from "@/lib/types";

export interface TransactionItemProps {
  transaction: LedgerRow;
  busy: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

function TransactionSymbol({ kind }: { kind: Transaction["kind"] }) {
  return (
    <span className={`transaction-symbol ${kind}`}>
      {kind === "income" ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}
    </span>
  );
}

function TransactionActions({
  transaction,
  busy,
  onEdit,
  onDelete,
  showLabel = false,
}: TransactionItemProps & { showLabel?: boolean }) {
  return (
    <div className="row-actions">
      <button
        className={showLabel ? "text-action" : "icon-button"}
        aria-label={`Ubah ${transaction.description}`}
        onClick={() => onEdit(transaction)}
        disabled={busy}
      >
        <Pencil size={17} />
        {showLabel && "Ubah"}
      </button>
      <button
        className="icon-button delete-button"
        aria-label={`Hapus ${transaction.description}`}
        onClick={() => onDelete(transaction)}
        disabled={busy}
      >
        <Trash2 size={17} />
      </button>
    </div>
  );
}

/** Baris untuk tampilan laptop atau mode tabel pada HP. */
export function TransactionRow(props: TransactionItemProps) {
  const { transaction } = props;

  return (
    <tr>
      <td className="date-cell">{formatDate(transaction.date)}</td>
      <td>
        <div className="description-cell">
          <TransactionSymbol kind={transaction.kind} />
          <span>
            <strong>{transaction.description}</strong>
            <small>{transaction.category}</small>
          </span>
        </div>
      </td>
      <td className="money-cell income-text">
        {transaction.kind === "income" ? (
          formatMoney(transaction.amount)
        ) : (
          <span className="dash">—</span>
        )}
      </td>
      <td className="money-cell expense-text">
        {transaction.kind === "expense" ? (
          formatMoney(transaction.amount)
        ) : (
          <span className="dash">—</span>
        )}
      </td>
      <td className="money-cell balance-cell">{formatMoney(transaction.balance)}</td>
      <td>
        <TransactionActions {...props} />
      </td>
    </tr>
  );
}

/** Kartu pada HP mengutamakan nominal, keterangan, dan tombol yang mudah disentuh. */
export function TransactionCard(props: TransactionItemProps) {
  const { transaction } = props;

  return (
    <article className="transaction-card">
      <div className="transaction-card-top">
        <TransactionSymbol kind={transaction.kind} />
        <div className="transaction-card-info">
          <strong>{transaction.description}</strong>
          <span>
            {formatDate(transaction.date)} <span aria-hidden="true">·</span>{" "}
            {transaction.category}
          </span>
        </div>
        <strong
          className={transaction.kind === "income" ? "income-text" : "expense-text"}
        >
          <span className="sr-only">
            {transaction.kind === "income" ? "Uang masuk" : "Uang keluar"}
          </span>
          {transaction.kind === "income" ? "+" : "−"}
          {formatMoney(transaction.amount)}
        </strong>
      </div>
      <div className="transaction-card-bottom">
        <span>
          Saldo <strong>{formatMoney(transaction.balance)}</strong>
        </span>
        <TransactionActions {...props} showLabel />
      </div>
    </article>
  );
}
