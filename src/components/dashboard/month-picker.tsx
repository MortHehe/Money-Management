import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonth, shiftMonth } from "@/lib/format";
import type { Transaction } from "@/lib/types";

interface MonthPickerProps {
  month: string;
  onChange: (month: string) => void;
  transactions: Transaction[];
}

export function MonthPicker({ month, onChange, transactions }: MonthPickerProps) {
  const months = new Set(transactions.map((item) => item.date.slice(0, 7)));

  for (let offset = -12; offset <= 1; offset += 1) {
    months.add(shiftMonth(month, offset));
  }

  return (
    <div className="month-picker">
      <button
        className="icon-button"
        aria-label="Bulan sebelumnya"
        onClick={() => onChange(shiftMonth(month, -1))}
        disabled={month <= "2000-01"}
      >
        <ChevronLeft size={18} />
      </button>
      <CalendarDays size={17} className="month-icon" />
      <select
        aria-label="Bulan laporan"
        value={month}
        onChange={(event) => onChange(event.target.value)}
      >
        {[...months]
          .filter((value) => value >= "2000-01" && value <= "2100-12")
          .sort()
          .reverse()
          .map((value) => (
            <option key={value} value={value}>
              {formatMonth(value)}
            </option>
          ))}
      </select>
      <button
        className="icon-button"
        aria-label="Bulan berikutnya"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={month >= "2100-12"}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
