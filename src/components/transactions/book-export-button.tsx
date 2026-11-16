"use client";

import { useId, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { createCsv, downloadFile } from "@/lib/backup";
import {
  ALL_EXPORT_PERIOD,
  filterExportTransactions,
  getExportFilename,
  getExportPeriodLabel,
  type ExportScope,
} from "@/lib/export";
import type { BookData } from "@/lib/types";
import { MonthPicker } from "@/components/dashboard/month-picker";

interface BookExportButtonProps {
  data: BookData;
  month: string;
  scope: ExportScope;
  onScopeChange: (scope: ExportScope) => void;
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
  scope,
  onScopeChange,
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
  const scopeId = useId();
  const period = scope === "all" ? ALL_EXPORT_PERIOD : month;
  const periodLabel = getExportPeriodLabel(period);
  const categories = [...new Set(data.transactions.map((item) => item.category))].sort(
    (first, second) => first.localeCompare(second, "id"),
  );
  // Pertahankan kategori yang dipilih meski tidak lagi mempunyai transaksi.
  if (category && !categories.includes(category)) categories.push(category);
  const count = filterExportTransactions(data.transactions, period, category).length;

  async function exportDocument() {
    setExporting(true);
    setError(null);

    try {
      // Muat pembuat dokumen hanya ketika pengguna meminta ekspor.
      const { createBookDocument } = await import("@/lib/document-export");
      const document = await createBookDocument(data, period, category);
      downloadFile(document, getExportFilename(period, category, "docx"), document.type);
    } catch {
      setError("Dokumen Word gagal dibuat. Coba ekspor kembali.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={`book-export ${className}`}>
      <div className="book-export-category">
        <label htmlFor={scopeId}>Periode ekspor</label>
        <select
          id={scopeId}
          value={scope}
          disabled={disabled || exporting}
          onChange={(event) =>
            onScopeChange(event.target.value === "all" ? "all" : "month")
          }
        >
          <option value="month">Bulan yang dipilih</option>
          <option value="all">Semua periode</option>
        </select>
      </div>
      {scope === "month" && onMonthChange && (
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
        title={`Unduh tabel ${periodLabel} · ${category || "Semua kategori"} (.docx)`}
      >
        {exporting ? (
          <LoaderCircle size={17} className="spin" aria-hidden="true" />
        ) : (
          <Download size={17} aria-hidden="true" />
        )}
        <span>{exporting ? "Menyiapkan Word…" : "Ekspor Word (.docx)"}</span>
      </button>
      <small aria-live="polite">
        {count} transaksi · {periodLabel} · {category || "Semua kategori"}
      </small>
      {includeCsv && (
        <button
          type="button"
          className="button button-secondary"
          disabled={disabled || exporting}
          onClick={() =>
            downloadFile(
              createCsv(data, period, category),
              getExportFilename(period, category, "csv"),
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
