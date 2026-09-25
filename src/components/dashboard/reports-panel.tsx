import { ArrowRight, Download } from "lucide-react";
import { summarizeMonth } from "@/lib/ledger";
import { formatMoney, formatMonth, shiftMonth } from "@/lib/format";
import { createCsv, downloadFile } from "@/lib/backup";
import type { BookData } from "@/lib/types";
import { ExpenseBreakdown } from "./expense-breakdown";

export function ReportsPanel({ data, month }: { data: BookData; month: string }) {
  const summary = summarizeMonth(data, month);
  const months = Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5));
  const history = months.map((value) => ({
    month: value,
    ...summarizeMonth(data, value),
  }));
  const highest = Math.max(1, ...history.flatMap((item) => [item.income, item.expense]));

  return (
    <div className="reports-grid">
      <section className="panel monthly-report">
        <div className="panel-heading">
          <div>
            <h2>Ringkasan {formatMonth(month)}</h2>
            <p>Saldo awal bulan membawa sisa bulan sebelumnya.</p>
          </div>
        </div>
        <dl className="report-lines">
          <div>
            <dt>Saldo awal bulan</dt>
            <dd>{formatMoney(summary.opening)}</dd>
          </div>
          <div>
            <dt>Uang masuk</dt>
            <dd className="income-text">+ {formatMoney(summary.income)}</dd>
          </div>
          <div>
            <dt>Uang keluar</dt>
            <dd className="expense-text">− {formatMoney(summary.expense)}</dd>
          </div>
          <div className="report-closing">
            <dt>
              Saldo akhir bulan <ArrowRight size={17} />
            </dt>
            <dd>{formatMoney(summary.closing)}</dd>
          </div>
        </dl>
        <button
          className="button button-secondary full-width"
          onClick={() =>
            downloadFile(
              createCsv(data, month),
              `laporan-${month}.csv`,
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download size={18} />
          Unduh laporan CSV / Excel
        </button>
      </section>
      <ExpenseBreakdown transactions={data.transactions} month={month} />
      <section className="panel history-panel">
        <div className="panel-heading">
          <div>
            <h2>Enam bulan terakhir</h2>
            <p>Lihat perkembangan uang masuk dan keluar.</p>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-income" />
              Masuk
            </span>
            <span>
              <i className="legend-expense" />
              Keluar
            </span>
          </div>
        </div>
        <div
          className="bar-chart"
          role="img"
          aria-label="Perbandingan uang masuk dan keluar selama enam bulan. Rincian tersedia pada tabel di bawah."
        >
          {history.map((item) => (
            <div className="chart-column" key={item.month}>
              <div className="chart-bars">
                <div
                  className="chart-bar-income"
                  style={{
                    height: `${(item.income / highest) * 100}%`,
                    minHeight: item.income ? 3 : 0,
                  }}
                  title={`Masuk ${formatMoney(item.income)}`}
                />
                <div
                  className="chart-bar-expense"
                  style={{
                    height: `${(item.expense / highest) * 100}%`,
                    minHeight: item.expense ? 3 : 0,
                  }}
                  title={`Keluar ${formatMoney(item.expense)}`}
                />
              </div>
              <span>{formatMonth(item.month).split(" ")[0].slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <div className="table-scroll report-table">
          <table>
            <caption className="sr-only">Rincian enam bulan terakhir</caption>
            <thead>
              <tr>
                <th>Bulan</th>
                <th className="text-right">Masuk</th>
                <th className="text-right">Keluar</th>
                <th className="text-right">Saldo akhir</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.month}>
                  <td>{formatMonth(item.month)}</td>
                  <td className="money-cell income-text">{formatMoney(item.income)}</td>
                  <td className="money-cell expense-text">{formatMoney(item.expense)}</td>
                  <td className="money-cell">{formatMoney(item.closing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
