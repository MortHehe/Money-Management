"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadBookAction, mutateBookAction } from "@/app/actions/book";
import { DEMO_STORAGE_KEY } from "@/lib/constants";
import { applyDemoMutation } from "@/lib/ledger";
import { bookSchema, mutationSchema } from "@/lib/validation";
import type { BookData, Mutation, StorageMode } from "@/lib/types";

export function useBook(initialData: BookData, mode: StorageMode) {
  const [data, setData] = useState(initialData);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(mode === "cloud");
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (mode !== "demo") {
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      try {
        const stored = localStorage.getItem(DEMO_STORAGE_KEY);

        if (stored) {
          setData(bookSchema.parse(JSON.parse(stored)));
        }
      } catch {
        setNotice({
          kind: "error",
          text: "Data contoh di browser tidak dapat dibaca. Gunakan cadangan jika tersedia.",
        });
      } finally {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mode]);

  const reload = useCallback(async () => {
    if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    setBusy(true);

    try {
      if (mode === "demo") {
        const stored = localStorage.getItem(DEMO_STORAGE_KEY);

        if (stored) {
          setData(bookSchema.parse(JSON.parse(stored)));
        }
      } else {
        const result = await loadBookAction();

        if (!result.success) {
          throw new Error(result.error);
        }

        setData(result.data);
      }

      setNotice({ kind: "success", text: "Catatan terbaru sudah dimuat." });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error ? error.message : "Data belum dapat dimuat. Coba lagi.",
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [mode]);

  async function mutate(mutation: Mutation, revision: number): Promise<boolean> {
    if (busyRef.current || !ready) {
      return false;
    }

    busyRef.current = true;
    setBusy(true);
    setNotice(null);

    try {
      const validated = mutationSchema.parse(mutation);
      let nextData: BookData;

      if (mode === "demo") {
        const stored = localStorage.getItem(DEMO_STORAGE_KEY);
        const latest = stored ? bookSchema.parse(JSON.parse(stored)) : data;

        if (latest.revision !== revision) {
          throw new Error(
            "Data berubah di tab lain. Tutup formulir, tekan Muat ulang, lalu coba lagi.",
          );
        }

        nextData = applyDemoMutation(latest, validated);
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(nextData));
      } else {
        const result = await mutateBookAction(validated, revision);

        if (!result.success) {
          throw new Error(result.error);
        }

        nextData = result.data;
      }

      setData(nextData);
      setNotice({
        kind: "success",
        text:
          mutation.type === "delete"
            ? "Transaksi sudah dihapus."
            : mutation.type === "restore"
              ? "Cadangan berhasil dipulihkan."
              : "Catatan berhasil disimpan.",
      });
      return true;
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Belum tersimpan. Periksa koneksi dan coba lagi.",
      });
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return { data, busy, ready, notice, setNotice, reload, mutate };
}
