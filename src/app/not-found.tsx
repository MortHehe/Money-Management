import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="status-page">
      <BookOpen size={42} />
      <h1>Halaman tidak ditemukan.</h1>
      <p>Mari kembali ke buku kas Anda.</p>
      <Link className="button button-primary" href="/">
        Buka buku kas
      </Link>
    </main>
  );
}
