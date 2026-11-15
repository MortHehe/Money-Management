"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { downloadFile } from "@/lib/backup";
import { getToday } from "@/lib/format";
import type { BookData } from "@/lib/types";

interface BookExportButtonProps {
  data: BookData;
  disabled?: boolean;
  className?: string;
}

export function BookExportButton({
  data,
  disabled = false,
  className = "",
}: BookExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportDocument() {
    setExporting(true);
    setError(null);

    try {
      // Muat pembuat dokumen hanya ketika pengguna meminta ekspor.
      const { createBookDocument } = await import("@/lib/document-export");
      const document = await createBookDocument(data);
      downloadFile(
        document,
        `catat-uang-semua-periode-${getToday()}.docx`,
        document.type,
      );
    } catch {
      setError("Dokumen Word gagal dibuat. Coba ekspor kembali.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={`book-export ${className}`}>
      <button
        type="button"
        className="button button-secondary"
        onClick={exportDocument}
        disabled={disabled || exporting}
        aria-busy={exporting}
        title="Unduh seluruh transaksi dan ringkasan saldo seperti Table View (.docx), dari semua bulan dan tahun"
      >
        {exporting ? (
          <LoaderCircle size={17} className="spin" aria-hidden="true" />
        ) : (
          <Download size={17} aria-hidden="true" />
        )}
        <span>{exporting ? "Menyiapkan Word…" : "Ekspor Word (.docx)"}</span>
      </button>
      <small>Semua transaksi · Semua periode</small>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
