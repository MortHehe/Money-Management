"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  FlaskConical,
  RefreshCw,
  WifiOff,
  X,
} from "lucide-react";
import { useBook } from "@/hooks/use-book";
import { useOnline } from "@/hooks/use-online";
import { getToday, formatMoney } from "@/lib/format";
import { summarizeMonth } from "@/lib/ledger";
import type {
  BookData,
  Screen,
  StorageMode,
  Transaction,
  TransactionInput,
  TransactionKind,
} from "@/lib/types";
import { AppShell } from "@/components/layout/app-shell";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TableView } from "@/components/transactions/table-view";
import { DeleteDialog } from "@/components/transactions/delete-dialog";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { SummaryCards } from "./summary-cards";
import { MonthPicker } from "./month-picker";
import { ExpenseBreakdown } from "./expense-breakdown";
import { ReportsPanel } from "./reports-panel";

interface EditorState {
  kind: TransactionKind;
  transaction?: Transaction;
  revision: number;
}

const screenTitles: Record<Screen, { title: string; subtitle: string }> = {
  ledger: {
    title: "Catatan kecil, tenang setiap hari.",
    subtitle: "Lihat uang masuk dan keluar dalam satu tempat.",
  },
  table: {
    title: "Table View",
    subtitle: "Seluruh catatan dalam satu tabel, dari awal hingga sekarang.",
  },
  reports: {
    title: "Kenali keuangan Anda.",
    subtitle: "Ringkasan sederhana untuk melihat gambaran besarnya.",
  },
  settings: {
    title: "Buku kas, sesuai kebutuhan.",
    subtitle: "Atur saldo awal dan simpan cadangan catatan Anda.",
  },
};

export function Dashboard({
  initialData,
  mode,
}: {
  initialData: BookData;
  mode: StorageMode;
}) {
  const { data, busy, ready, notice, setNotice, reload, mutate } = useBook(
    initialData,
    mode,
  );
  const [screen, setScreen] = useState<Screen>("ledger");
  const [month, setMonth] = useState(() => getToday().slice(0, 7));
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deletion, setDeletion] = useState<{
    transaction: Transaction;
    revision: number;
  } | null>(null);
  const online = useOnline();
  const summary = summarizeMonth(data, month);
  const disabled = busy || !ready;

  function openEditor(kind: TransactionKind, transaction?: Transaction) {
    setNotice(null);
    setEditor({ kind, transaction, revision: data.revision });
  }

  async function saveTransaction(transaction: TransactionInput) {
    if (!editor) {
      return;
    }

    const saved = await mutate(
      { type: editor.transaction ? "update" : "create", transaction },
      editor.revision,
    );

    if (saved) {
      setMonth(transaction.date.slice(0, 7));
      setEditor(null);
    }
  }

  async function deleteTransaction() {
    if (!deletion) {
      return;
    }

    const deleted = await mutate(
      { type: "delete", id: deletion.transaction.id },
      deletion.revision,
    );

    if (deleted) {
      setDeletion(null);
    }
  }

  return (
    <AppShell
      screen={screen}
      onNavigate={setScreen}
      bookName={data.settings.name}
      mode={mode}
      busy={disabled}
    >
      {mode === "demo" && (
        <div className="demo-banner">
          <FlaskConical size={18} />
          <p>
            <strong>Anda sedang mencoba buku kas contoh.</strong> Perubahan hanya
            tersimpan di browser ini, terpisah dari database Neon.
          </p>
          <Link href="/">
            Siapkan buku kas <span aria-hidden="true">↗</span>
          </Link>
        </div>
      )}
      {!online && (
        <div className="offline-banner" role="status">
          <WifiOff size={18} />
          {mode === "demo"
            ? "Anda sedang offline. Data contoh tetap bisa digunakan di browser ini."
            : "Koneksi terputus. Sambungkan internet untuk menyimpan. Isian yang sedang dibuka tetap tersedia."}
        </div>
      )}
      <div className="page-heading">
        <div>
          <div className="eyebrow">{data.settings.name}</div>
          <h1>{screenTitles[screen].title}</h1>
          <p>{screenTitles[screen].subtitle}</p>
        </div>
        <button
          className="button button-secondary refresh-button"
          onClick={reload}
          disabled={disabled}
          aria-label="Muat ulang data"
        >
          <RefreshCw size={17} className={busy ? "spin" : ""} />
          <span>Muat ulang</span>
        </button>
      </div>
      {notice && !editor && !deletion && (
        <div
          className={`notice notice-${notice.kind}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.kind === "success" ? (
            <CheckCircle2 size={19} />
          ) : (
            <CircleAlert size={19} />
          )}
          <span>{notice.text}</span>
          <button
            className="icon-button"
            onClick={() => setNotice(null)}
            aria-label="Tutup pemberitahuan"
          >
            <X size={17} />
          </button>
        </div>
      )}
      {(screen === "ledger" || screen === "reports") && (
        <>
          <div className="section-topline">
            <h2>{screen === "ledger" ? "Sekilas keuangan" : "Laporan bulanan"}</h2>
            <MonthPicker
              month={month}
              onChange={setMonth}
              transactions={data.transactions}
            />
          </div>
          <SummaryCards data={data} month={month} />
        </>
      )}
      {screen === "ledger" && (
        <>
          <div className="entry-actions">
            <div>
              <strong>Ada transaksi hari ini?</strong>
              <span>Catat sekarang, supaya tidak terlupa.</span>
            </div>
            <div className="entry-buttons">
              <button
                className="button button-income"
                onClick={() => openEditor("income")}
                disabled={disabled}
              >
                <ArrowDownLeft size={22} />
                Uang masuk
              </button>
              <button
                className="button button-expense"
                onClick={() => openEditor("expense")}
                disabled={disabled}
              >
                <ArrowUpRight size={22} />
                Uang keluar
              </button>
            </div>
          </div>
          <div className="ledger-layout">
            <div>
              <TransactionList
                key={month}
                data={data}
                month={month}
                busy={disabled}
                onEdit={(transaction) => openEditor(transaction.kind, transaction)}
                onDelete={(transaction) => {
                  setNotice(null);
                  setDeletion({ transaction, revision: data.revision });
                }}
              />
              <div className="month-balance-note">
                <span>
                  Saldo awal bulan <strong>{formatMoney(summary.opening)}</strong>
                </span>
                <span>
                  Saldo akhir bulan <strong>{formatMoney(summary.closing)}</strong>
                </span>
              </div>
            </div>
            <div className="ledger-side">
              <ExpenseBreakdown transactions={data.transactions} month={month} />
              <div className="little-note">
                <span className="little-note-line" />
                <p>
                  Yang penting bukan seberapa banyak,
                  <br />
                  <strong>tapi tahu ke mana uang bergerak.</strong>
                </p>
              </div>
            </div>
          </div>
        </>
      )}
      {screen === "table" && <TableView data={data} />}
      {screen === "reports" && <ReportsPanel data={data} month={month} />}
      {screen === "settings" && (
        <SettingsPanel
          key={data.revision}
          data={data}
          busy={disabled}
          mode={mode}
          error={notice?.kind === "error" ? notice.text : undefined}
          onSave={(settings, revision) =>
            mutate({ type: "settings", settings }, revision)
          }
          onRestore={(backup, revision) => mutate({ type: "restore", backup }, revision)}
        />
      )}
      {editor && (
        <TransactionForm
          kind={editor.kind}
          transaction={editor.transaction}
          busy={busy}
          error={notice?.kind === "error" ? notice.text : undefined}
          onClose={() => setEditor(null)}
          onSave={saveTransaction}
        />
      )}
      {deletion && (
        <DeleteDialog
          transaction={deletion.transaction}
          busy={busy}
          error={notice?.kind === "error" ? notice.text : undefined}
          onClose={() => setDeletion(null)}
          onConfirm={deleteTransaction}
        />
      )}
    </AppShell>
  );
}
