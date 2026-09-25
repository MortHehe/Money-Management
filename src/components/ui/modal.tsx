"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}

/** Dialog native menangani focus trap, Escape, dan fokus kembali ke tombol pembuka. */
export function Modal({ title, subtitle, children, onClose, busy = false }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      dialog?.close();
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      aria-describedby={subtitle ? "modal-description" : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-header">
        <div>
          <h2 id="modal-title">{title}</h2>
          {subtitle && <p id="modal-description">{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          aria-label="Tutup formulir"
          disabled={busy}
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
