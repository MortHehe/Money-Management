"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  List,
  Search,
  Table2,
  NotebookPen,
} from "lucide-react";
import { buildLedger } from "@/lib/ledger";
import { createCsv, downloadFile } from "@/lib/backup";
import type { BookData, Transaction } from "@/lib/types";

import { TransactionCard, TransactionRow } from "./transaction-item";

interface TransactionListProps {
  data: BookData;
  month: string;
  busy: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

export function TransactionList({
  data,
  month,
  busy,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(0);
  const [tableView, setTableView] = useState(false);
  const rows = buildLedger(data)
    .filter(
      (item) =>
        item.date.startsWith(month) &&
        (kind === "all" || item.kind === kind) &&
        `${item.description} ${item.category}`
          .toLocaleLowerCase("id-ID")
          .includes(search.toLocaleLowerCase("id-ID")),
    )
    .reverse();
  const pageCount = Math.max(1, Math.ceil(rows.length / 8));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(currentPage * 8, (currentPage + 1) * 8);

  function exportMonth() {
    downloadFile(
      createCsv(data, month),
      `catat-uang-${month}.csv`,
      "text/csv;charset=utf-8",
    );
  }

  return (
    <section className="panel ledger-panel">
      <div className="panel-heading">
        <div>
          <h2>
            Riwayat transaksi <span className="count-badge">{rows.length}</span>
          </h2>
          <p>Setiap pemasukan dan pengeluaran, tercatat rapi.</p>
        </div>
        <button
          className="button button-secondary export-button"
          onClick={exportMonth}
          disabled={busy}
          title="Ekspor seluruh transaksi pada bulan yang dipilih"
        >
          <Download size={17} />
          <span>Ekspor bulan ini</span>
        </button>
      </div>
      <div className="table-toolbar">
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Cari transaksi"
            placeholder="Cari catatan atau kategori…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </div>
        <select
          aria-label="Filter jenis transaksi"
          value={kind}
          onChange={(event) => {
            setKind(event.target.value);
            setPage(0);
          }}
        >
          <option value="all">Semua transaksi</option>
          <option value="income">Uang masuk</option>
          <option value="expense">Uang keluar</option>
        </select>
        <button
          className="icon-button mobile-view-toggle"
          aria-label={tableView ? "Tampilkan daftar" : "Tampilkan tabel"}
          title={tableView ? "Tampilkan daftar" : "Tampilkan tabel"}
          onClick={() => setTableView(!tableView)}
        >
          {tableView ? <List size={20} /> : <Table2 size={20} />}
        </button>
      </div>

      {visibleRows.length === 0 ? (
        <div className="empty-state">
          <span>
            <NotebookPen size={30} strokeWidth={1.5} />
          </span>
          <h3>
            {search || kind !== "all"
              ? "Catatan belum ditemukan"
              : "Mulai dengan satu catatan"}
          </h3>
          <p>
            {search || kind !== "all"
              ? "Coba kata pencarian atau jenis transaksi lainnya."
              : "Tekan Uang masuk atau Uang keluar untuk mencatat transaksi pertama di bulan ini."}
          </p>
        </div>
      ) : (
        <>
          <div
            className={`table-scroll ${tableView ? "force-table" : ""}`}
            tabIndex={0}
            role="region"
            aria-label="Tabel transaksi, geser untuk melihat seluruh kolom"
          >
            <table>
              <caption className="sr-only">
                Riwayat transaksi terbaru lebih dulu. Saldo dihitung berdasarkan urutan
                tanggal.
              </caption>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th className="text-right">Uang masuk</th>
                  <th className="text-right">Uang keluar</th>
                  <th className="text-right">Saldo</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((item) => (
                  <TransactionRow
                    key={item.id}
                    transaction={item}
                    busy={busy}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {!tableView && (
            <div className="transaction-cards">
              {visibleRows.map((item) => (
                <TransactionCard
                  key={item.id}
                  transaction={item}
                  busy={busy}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="table-footer">
        <span>
          {rows.length
            ? `${currentPage * 8 + 1}–${Math.min((currentPage + 1) * 8, rows.length)} dari ${rows.length} transaksi`
            : "0 transaksi"}
        </span>
        <div className="pagination">
          <button
            className="icon-button"
            aria-label="Halaman sebelumnya"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            {currentPage + 1} / {pageCount}
          </span>
          <button
            className="icon-button"
            aria-label="Halaman berikutnya"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= pageCount - 1}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
