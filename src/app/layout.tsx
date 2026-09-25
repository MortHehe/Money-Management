import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./readability.css";

export const metadata: Metadata = {
  title: "Catat Uang — Buku kas keluarga",
  description:
    "Catat pemasukan dan pengeluaran keluarga dengan mudah. Saldo otomatis, riwayat rapi, nyaman di HP dan laptop.",
  applicationName: "Catat Uang",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Catat Uang" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#235b49",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
