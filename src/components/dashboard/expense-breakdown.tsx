import { ChartPie, ArrowUpRight } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/constants";
import { expenseByCategory } from "@/lib/ledger";
import { formatMoney, formatMonth } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export function ExpenseBreakdown({
  transactions,
  month,
}: {
  transactions: Transaction[];
  month: string;
}) {
  const categories = expenseByCategory(transactions, month);
  const total = categories.reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className="panel category-panel">
      <div className="panel-heading">
        <div>
          <h2>Ke mana uang pergi?</h2>
          <p>Pengeluaran {formatMonth(month).toLowerCase()}</p>
        </div>
        <ChartPie size={20} className="muted" />
      </div>
      {categories.length === 0 ? (
        <div className="category-empty">
          <ChartPie size={35} strokeWidth={1.4} />
          <p>Belum ada pengeluaran di bulan ini.</p>
        </div>
      ) : (
        <>
          <div className="category-total">
            <span>Total pengeluaran</span>
            <strong>{formatMoney(total)}</strong>
          </div>
          <div className="stacked-bar" aria-hidden="true">
            {categories.map((item) => (
              <span
                key={item.category}
                style={{
                  width: `${(item.amount / total) * 100}%`,
                  backgroundColor: CATEGORY_COLORS[item.category],
                }}
              />
            ))}
          </div>
          <div className="category-list">
            {categories.map((item) => (
              <div className="category-item" key={item.category}>
                <div>
                  <span
                    className="category-dot"
                    style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                  />
                  <span>{item.category}</span>
                  <small>{Math.round((item.amount / total) * 100)}%</small>
                </div>
                <strong>{formatMoney(item.amount)}</strong>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="category-tip">
        <ArrowUpRight size={18} />
        <p>Mengenal pengeluaran adalah langkah awal mengatur keuangan.</p>
      </div>
    </section>
  );
}
