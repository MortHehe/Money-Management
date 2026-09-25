import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { summarizeBook } from "@/lib/ledger";
import { formatMoney } from "@/lib/format";
import type { BookData } from "@/lib/types";

export function SummaryCards({ data }: { data: BookData }) {
  const summary = summarizeBook(data);

  return (
    <section className="summary-grid" aria-label="Ringkasan keuangan">
      <article className="balance-card">
        <div className="card-label">
          <span>Saldo keseluruhan</span>
          <Wallet size={21} />
        </div>
        <strong className="summary-amount" data-testid="total-balance">
          {formatMoney(summary.closing)}
        </strong>
        <div className="balance-caption">
          <span className="status-dot" />
          Saldo awal + seluruh transaksi
        </div>
        <div className="balance-decoration" aria-hidden="true" />
      </article>
      <article className="metric-card">
        <div className="card-label">
          <span>Uang masuk</span>
          <span className="metric-icon income">
            <ArrowDownLeft size={21} />
          </span>
        </div>
        <strong className="summary-amount income-text" data-testid="total-income">
          {formatMoney(summary.income)}
        </strong>
        <span className="metric-caption">Seluruh transaksi</span>
      </article>
      <article className="metric-card">
        <div className="card-label">
          <span>Uang keluar</span>
          <span className="metric-icon expense">
            <ArrowUpRight size={21} />
          </span>
        </div>
        <strong className="summary-amount expense-text" data-testid="total-expense">
          {formatMoney(summary.expense)}
        </strong>
        <span className="metric-caption">Seluruh transaksi</span>
      </article>
    </section>
  );
}
