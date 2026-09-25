"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, Download, HardDriveDownload, Info, Upload, Wallet } from "lucide-react";
import { AmountInput } from "@/components/ui/amount-input";
import { Modal } from "@/components/ui/modal";
import { createBackup, downloadFile, parseBackup } from "@/lib/backup";
import { MAX_BACKUP_BYTES } from "@/lib/constants";
import { formatMoney, getToday } from "@/lib/format";
import { settingsSchema } from "@/lib/validation";
import type { BookBackup, BookData, BookSettings, StorageMode } from "@/lib/types";

interface SettingsPanelProps {
  data: BookData;
  busy: boolean;
  mode: StorageMode;
  error?: string;
  onSave: (settings: BookSettings, revision: number) => Promise<boolean>;
  onRestore: (backup: BookBackup, revision: number) => Promise<boolean>;
}

export function SettingsPanel({
  data,
  busy,
  mode,
  error,
  onSave,
  onRestore,
}: SettingsPanelProps) {
  const [name, setName] = useState(data.settings.name);
  const [openingBalance, setOpeningBalance] = useState(
    String(data.settings.openingBalance),
  );
  const [initialRevision] = useState(data.revision);
  const [message, setMessage] = useState("");
  const [backup, setBackup] = useState<BookBackup | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const parsed = settingsSchema.safeParse({
      name,
      openingBalance: Number(openingBalance),
    });

    if (!parsed.success) {
      setMessage(
        "Nama buku harus 2–50 karakter dan saldo awal antara Rp0 hingga Rp999.999.999.999.",
      );
      return;
    }

    await onSave(parsed.data, initialRevision);
  }

  function downloadBackup() {
    downloadFile(
      JSON.stringify(createBackup(data), null, 2),
      `cadangan-catat-uang-${getToday()}.json`,
      "application/json",
    );
  }

  async function selectBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setMessage("");

    if (!file) {
      return;
    }

    try {
      if (file.size > MAX_BACKUP_BYTES) {
        throw new Error("Ukuran cadangan maksimal 3 MB.");
      }

      setBackup(parseBackup(await file.text()));
      setConfirmation("");
    } catch (error) {
      setMessage(
        error instanceof Error && !(error instanceof SyntaxError)
          ? error.message
          : "File cadangan tidak dapat dibaca. Pilih file JSON dari Catat Uang.",
      );
    }
  }

  async function restoreBackup() {
    if (backup && confirmation === "PULIHKAN") {
      const restored = await onRestore(backup, initialRevision);

      if (restored) {
        setBackup(null);
      }
    }
  }

  return (
    <div className="settings-grid">
      <section className="panel settings-card">
        <div className="panel-heading">
          <div>
            <h2>
              <Wallet size={20} />
              Buku kas Anda
            </h2>
            <p>Atur nama buku dan uang yang sudah ada sebelum mulai mencatat.</p>
          </div>
        </div>
        <form onSubmit={saveSettings}>
          <fieldset disabled={busy}>
            <label htmlFor="book-name">Nama buku kas</label>
            <input
              id="book-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={50}
              required
            />
            <label htmlFor="opening-balance">Saldo awal</label>
            <AmountInput
              id="opening-balance"
              value={openingBalance}
              onChange={setOpeningBalance}
            />
            <p className="field-help">
              Uang yang dimiliki sebelum transaksi pertama. Mengubahnya akan menghitung
              ulang seluruh saldo.
            </p>
          </fieldset>
          <button className="button button-primary" disabled={busy}>
            <Check size={18} />
            {busy ? "Menyimpan…" : "Simpan pengaturan"}
          </button>
        </form>
      </section>
      <section className="panel settings-card">
        <div className="panel-heading">
          <div>
            <h2>
              <HardDriveDownload size={20} />
              Cadangan catatan
            </h2>
            <p>Simpan salinan semua transaksi dan pengaturan buku kas.</p>
          </div>
        </div>
        <div className="backup-option">
          <span className="backup-icon">
            <Download size={23} />
          </span>
          <div>
            <strong>Unduh cadangan</strong>
            <p>
              {data.transactions.length} transaksi beserta saldo awal, dalam satu file
              JSON.
            </p>
          </div>
          <button
            className="button button-secondary"
            onClick={downloadBackup}
            disabled={busy}
          >
            Unduh
          </button>
        </div>
        <div className="backup-option">
          <span className="backup-icon">
            <Upload size={23} />
          </span>
          <div>
            <strong>Pulihkan cadangan</strong>
            <p>Ganti isi buku kas dengan salinan yang pernah diunduh.</p>
          </div>
          <button
            className="button button-secondary"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            Pilih file
          </button>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".json,application/json"
            onChange={selectBackup}
            aria-label="Pilih file cadangan"
            tabIndex={-1}
          />
        </div>
        <div className="info-box">
          <Info size={18} />
          <p>
            {mode === "demo"
              ? "Mode contoh menyimpan data di browser ini. Data contoh tidak tersinkron ke perangkat lain."
              : "Catatan tersimpan di cloud dan dapat dibuka dari HP maupun laptop dengan akun yang sama."}
          </p>
        </div>
      </section>
      {message && (
        <p role="alert" className="form-error settings-message">
          {message}
        </p>
      )}
      {backup && (
        <Modal
          title="Pulihkan buku kas?"
          subtitle="Seluruh catatan saat ini akan diganti dengan isi cadangan."
          onClose={() => setBackup(null)}
          busy={busy}
        >
          <div className="restore-summary">
            <strong>{backup.settings.name}</strong>
            <span>{backup.transactions.length} transaksi</span>
            <span>Saldo awal {formatMoney(backup.settings.openingBalance)}</span>
          </div>
          <p className="muted">Unduh cadangan buku saat ini sebelum melanjutkan.</p>
          <button className="text-action" onClick={downloadBackup} disabled={busy}>
            <Download size={17} />
            Unduh catatan saat ini
          </button>
          <label htmlFor="restore-confirmation">
            Ketik <strong>PULIHKAN</strong> untuk melanjutkan
          </label>
          <input
            id="restore-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            disabled={busy}
          />
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="modal-footer">
            <button
              className="button button-secondary"
              onClick={() => setBackup(null)}
              disabled={busy}
            >
              Batal
            </button>
            <button
              className="button button-danger"
              onClick={restoreBackup}
              disabled={busy || confirmation !== "PULIHKAN"}
            >
              {busy ? "Memulihkan…" : "Pulihkan cadangan"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
