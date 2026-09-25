"use client";

import {
  BookOpen,
  ChartNoAxesCombined,
  ChevronRight,
  CloudCheck,
  FlaskConical,
  LogOut,
  Settings2,
  ShieldCheck,
  Table2,
} from "lucide-react";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Brand } from "@/components/ui/brand";
import type { Screen, StorageMode } from "@/lib/types";

interface AppShellProps {
  children: ReactNode;
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  bookName: string;
  mode: StorageMode;
  busy: boolean;
}

const navigation = [
  { id: "ledger" as const, label: "Buku kas", icon: BookOpen },
  { id: "table" as const, label: "Table View", icon: Table2 },
  { id: "reports" as const, label: "Laporan", icon: ChartNoAxesCombined },
  { id: "settings" as const, label: "Pengaturan", icon: Settings2 },
];

export function AppShell({
  children,
  screen,
  onNavigate,
  bookName,
  mode,
  busy,
}: AppShellProps) {
  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">
        Lewati ke isi halaman
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">RUANG KEUANGAN</div>
        <nav aria-label="Menu utama" className="navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={screen === id ? "nav-item active" : "nav-item"}
              aria-current={screen === id ? "page" : undefined}
              onClick={() => onNavigate(id)}
              disabled={busy}
            >
              <Icon size={21} strokeWidth={1.8} />
              <span>{label}</span>
              {screen === id && <ChevronRight size={16} className="nav-chevron" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">
            <ShieldCheck size={23} />
          </span>
          <strong>
            Sedikit dicatat,
            <br />
            lebih tenang setiap hari.
          </strong>
          <p>Mulai dari satu transaksi. Kebiasaan baik tumbuh perlahan.</p>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">{bookName.charAt(0).toUpperCase()}</span>
          <div>
            <strong>{bookName}</strong>
            <span>{mode === "demo" ? "Buku kas contoh" : "Buku kas pribadi"}</span>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <Brand />
          </div>
          <div className="breadcrumb">
            Ruang keuangan <ChevronRight size={14} />
            <strong>{navigation.find((item) => item.id === screen)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <span className={`storage-status ${mode === "demo" ? "is-demo" : ""}`}>
              {mode === "demo" ? <FlaskConical size={16} /> : <CloudCheck size={17} />}
              <span>{mode === "demo" ? "Mode contoh" : "Penyimpanan cloud"}</span>
            </span>
            {mode === "cloud" && (
              <form action={logoutAction}>
                <button
                  className="icon-button"
                  title="Keluar dari akun"
                  aria-label="Keluar dari akun"
                  disabled={busy}
                >
                  <LogOut size={19} />
                </button>
              </form>
            )}
          </div>
        </header>
        <nav className="mobile-navigation" aria-label="Menu HP">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-current={screen === id ? "page" : undefined}
              className={screen === id ? "active" : ""}
              onClick={() => onNavigate(id)}
              disabled={busy}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <main id="main-content" className="main-content">
          {children}
        </main>
        <footer className="page-footer">
          <span>
            Catat Uang <span aria-hidden="true">·</span> Satu catatan, satu langkah lebih
            tenang.
          </span>
          <span>Dibuat untuk keseharian.</span>
        </footer>
      </div>
    </div>
  );
}
