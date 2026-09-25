import { Wallet } from "lucide-react";
import { formatMoney, formatNumber, formatTableDate } from "@/lib/format";
import { compareTransactions, summarizeTable } from "@/lib/ledger";
import type { BookData } from "@/lib/types";

interface TableViewProps {
  data: BookData;
}

export function TableView({ data }: TableViewProps) {
  // Salin sebelum mengurutkan agar urutan data bersama di Buku kas tetap utuh.
  const rows = [...data.transactions].sort(compareTransactions);
  const summary = summarizeTable(data);
  const hasOpeningTransaction = summary.openingFromTransactions > 0;
  const incomeLabel = hasOpeningTransaction ? "Uang masuk lainnya" : "Uang masuk";

  return (
    <section className="panel cash-table-panel" aria-labelledby="cash-table-title">
      <div className="panel-heading cash-table-heading">
        <div>
          <h2 id="cash-table-title">Seluruh transaksi</h2>
          <p>Debit = uang masuk · Kredit = uang keluar</p>
        </div>
      </div>

      <p className="cash-table-hint" id="cash-table-hint">
        Angka dalam rupiah. Gulir tabel ke bawah untuk melihat semua transaksi. Geser ke
        samping jika ada kolom yang belum terlihat.
      </p>

      <div
        className="cash-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Tabel debit dan kredit"
        aria-describedby="cash-table-hint"
      >
        <table className="cash-table">
          <caption className="sr-only">
            Seluruh transaksi dari semua bulan dan tahun, urutan tanggal paling awal.
            Total mencakup semua catatan dalam buku kas.
          </caption>
          <thead>
            <tr>
              <th scope="col">Tanggal</th>
              <th scope="col">Keterangan</th>
              <th scope="col" className="text-right">
                Debit
              </th>
              <th scope="col" className="text-right">
                Kredit
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((transaction) => (
              <tr key={transaction.id}>
                <td className="cash-table-date">
                  <time dateTime={transaction.date}>
                    {formatTableDate(transaction.date)}
                  </time>
                </td>
                <td className="cash-table-description">{transaction.description}</td>
                <td className="cash-table-amount">
                  {transaction.kind === "income" ? formatNumber(transaction.amount) : "—"}
                </td>
                <td className="cash-table-amount">
                  {transaction.kind === "expense"
                    ? formatNumber(transaction.amount)
                    : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="cash-table-empty">
                  Belum ada transaksi dalam buku kas.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                Total keseluruhan
              </th>
              <td className="cash-table-amount" data-testid="table-total-debit">
                {formatNumber(summary.income)}
              </td>
              <td className="cash-table-amount" data-testid="table-total-credit">
                {formatNumber(summary.expense)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="table-footer cash-table-count">
        <span aria-live="polite">{summary.count} transaksi · Semua periode</span>
      </div>

      <div className="cash-table-balance">
        <p className="cash-table-opening">
          Saldo awal buku kas{" "}
          <strong data-testid="table-opening-balance">
            {formatMoney(summary.openingTotal)}
          </strong>
        </p>
        {hasOpeningTransaction && (
          <p className="cash-table-opening-note">
            {summary.opening > 0
              ? `Terdiri dari ${formatMoney(summary.opening)} dari Pengaturan dan ${formatMoney(summary.openingFromTransactions)} dari transaksi “Saldo awal”.`
              : "Saldo awal berasal dari transaksi “Saldo awal” pada kolom debit."}{" "}
            Saldo awal yang tercatat di debit dihitung sekali.
          </p>
        )}
        <dl className="cash-table-breakdown">
          <div>
            <dt>{incomeLabel}</dt>
            <dd data-testid="table-other-income">{formatMoney(summary.otherIncome)}</dd>
          </div>
          <div>
            <dt>Uang keluar</dt>
            <dd>{formatMoney(summary.expense)}</dd>
          </div>
        </dl>
        <div className="cash-table-remaining">
          <span>
            <Wallet size={23} aria-hidden="true" /> Sisa uang
          </span>
          <strong data-testid="table-remaining-balance">
            {formatMoney(summary.closing)}
          </strong>
        </div>
        <p>
          Sisa uang = saldo awal buku kas + {incomeLabel.toLowerCase()} − uang keluar.
        </p>
      </div>
    </section>
  );
}
