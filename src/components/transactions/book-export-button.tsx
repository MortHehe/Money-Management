"use client";

import { useId, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { createCsv, downloadFile } from "@/lib/backup";
import { formatMonth } from "@/lib/format";
import { filterExportTransactions, getExportFilename } from "@/lib/export";
import type { BookData } from "@/lib/types";
import { MonthPicker } from "@/components/dashboard/month-picker";

interface BookExportButtonProps {
  data: BookData;
  month: string;
  category: string;
  onCategoryChange: (category: string) => void;
  onMonthChange?: (month: string) => void;
  includeCsv?: boolean;
  disabled?: boolean;
  className?: string;
}

export function BookExportButton({
  data,
  month,
  category,
  onCategoryChange,
  onMonthChange,
  includeCsv = false,
  disabled = false,
  className = "",
}: BookExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryId = useId();
  const categories = [...new Set(data.transactions.map((item) => item.category))].sort(
    (first, second) => first.localeCompare(second, "id"),
  );
  // Pertahankan kategori yang dipilih meski tidak lagi mempunyai transaksi.
  if (category && !categories.includes(category)) categories.push(category);
  const count = filterExportTransactions(data.transactions, month, category).length;

  async function exportDocument() {
    setExporting(true);
    setError(null);

    try {
      // Muat pembuat dokumen hanya ketika pengguna meminta ekspor.
      const { createBookDocument } = await import("@/lib/document-export");
      const document = await createBookDocument(data, month, category);
      downloadFile(document, getExportFilename(month, category, "docx"), document.type);
    } catch {
      setError("Dokumen Word gagal dibuat. Coba ekspor kembali.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={`book-export ${className}`}>
      {onMonthChange && (
        <div className="book-export-month">
          <span>Bulan ekspor</span>
          <MonthPicker
            month={month}
            onChange={onMonthChange}
            transactions={data.transactions}
            label="Bulan ekspor"
          />
        </div>
      )}
      <div className="book-export-category">
        <label htmlFor={categoryId}>Kategori ekspor</label>
        <select
          id={categoryId}
          value={category}
          disabled={disabled || exporting}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value="">Semua kategori</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="button button-secondary"
        onClick={exportDocument}
        disabled={disabled || exporting}
        aria-busy={exporting}
        title={`Unduh tabel ${formatMonth(month)} · ${category || "Semua kategori"} (.docx)`}
      >
        {exporting ? (
          <LoaderCircle size={17} className="spin" aria-hidden="true" />
        ) : (
          <Download size={17} aria-hidden="true" />
        )}
        <span>{exporting ? "Menyiapkan Word…" : "Ekspor Word (.docx)"}</span>
      </button>
      <small aria-live="polite">
        {count} transaksi · {formatMonth(month)} · {category || "Semua kategori"}
      </small>
      {includeCsv && (
        <button
          type="button"
          className="button button-secondary"
          disabled={disabled || exporting}
          onClick={() =>
            downloadFile(
              createCsv(data, month, category),
              getExportFilename(month, category, "csv"),
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download size={18} aria-hidden="true" />
          Unduh laporan CSV / Excel
        </button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
