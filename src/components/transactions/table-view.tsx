"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { MonthPicker } from "@/components/dashboard/month-picker";
import { formatMoney, formatMonth, formatNumber, formatTableDate } from "@/lib/format";
import { compareTransactions, summarizeMonth } from "@/lib/ledger";
import type { BookData } from "@/lib/types";

interface TableViewProps {
  data: BookData;
  month: string;
  onMonthChange: (month: string) => void;
}

const ROWS_PER_PAGE = 25;

export function TableView({ data, month, onMonthChange }: TableViewProps) {
  const [page, setPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = data.transactions
    .filter((transaction) => transaction.date.startsWith(month))
    .sort(compareTransactions);
  const pageCount = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const firstRow = currentPage * ROWS_PER_PAGE;
  const visibleRows = rows.slice(firstRow, firstRow + ROWS_PER_PAGE);

  // Total dan sisa uang memakai seluruh bulan, bukan hanya halaman yang terlihat.
  const summary = summarizeMonth(data, month);

  function changePage(nextPage: number) {
    setPage(nextPage);

    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }

  return (
    <section className="panel cash-table-panel" aria-labelledby="cash-table-title">
      <div className="panel-heading cash-table-heading">
        <div>
          <h2 id="cash-table-title">Catatan {formatMonth(month)}</h2>
          <p>Debit = uang masuk · Kredit = uang keluar</p>
        </div>
        <MonthPicker
          month={month}
          onChange={onMonthChange}
          transactions={data.transactions}
        />
      </div>

      <p className="cash-table-hint" id="cash-table-hint">
        Angka dalam rupiah. Geser tabel jika ada kolom yang belum terlihat.
      </p>

      <div
        ref={scrollRef}
        className="cash-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Tabel debit dan kredit"
        aria-describedby="cash-table-hint"
      >
        <table className="cash-table">
          <caption className="sr-only">
            Catatan {formatMonth(month)}, urutan tanggal paling awal. Total mencakup
            seluruh transaksi bulan ini.
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
            {visibleRows.map((transaction) => (
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
                  Belum ada transaksi pada bulan ini.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                Total bulan ini
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

      <div className="table-footer cash-table-pagination">
        <span aria-live="polite">
          {rows.length
            ? `${firstRow + 1}–${Math.min(firstRow + ROWS_PER_PAGE, rows.length)} dari ${rows.length} transaksi`
            : "0 transaksi"}
        </span>
        {pageCount > 1 && (
          <nav className="pagination" aria-label="Halaman Table View">
            <button
              className="icon-button"
              aria-label="Halaman tabel sebelumnya"
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 0}
            >
              <ChevronLeft size={20} />
            </button>
            <span>
              {currentPage + 1} / {pageCount}
            </span>
            <button
              className="icon-button"
              aria-label="Halaman tabel berikutnya"
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
            >
              <ChevronRight size={20} />
            </button>
          </nav>
        )}
      </div>

      <div className="cash-table-balance">
        <p className="cash-table-opening">
          Saldo awal bulan{" "}
          <strong data-testid="table-opening-balance">
            {formatMoney(summary.opening)}
          </strong>
        </p>
        <div className="cash-table-remaining">
          <span>
            <Wallet size={23} aria-hidden="true" /> Sisa uang
          </span>
          <strong data-testid="table-remaining-balance">
            {formatMoney(summary.closing)}
          </strong>
        </div>
        <p>
          Saldo akhir {formatMonth(month)} = saldo awal bulan + total debit − total
          kredit.
        </p>
      </div>
    </section>
  );
}
