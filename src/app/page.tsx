import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen } from "lucide-react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { WelcomeLayout } from "@/components/auth/welcome-layout";
import { getAccountId } from "@/server/auth";
import { readBook } from "@/server/books";
import { isDatabaseConfigured } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isDatabaseConfigured()) {
    const demoEnabled =
      process.env.NODE_ENV !== "production" || process.env.ENABLE_DEMO === "true";

    return (
      <WelcomeLayout>
        <span className="welcome-form-icon">
          <BookOpen size={27} />
        </span>
        <div className="eyebrow">SELAMAT DATANG</div>
        <h2>Buku kas baru Anda.</h2>
        <p className="welcome-description">
          Aplikasi sudah siap disiapkan. Hubungkan database untuk mulai menyimpan catatan
          pribadi.
        </p>
        <div className="setup-steps">
          <p>
            <span>1</span>Hubungkan database Neon ke proyek.
          </p>
          <p>
            <span>2</span>Jalankan migrasi dan buat akun keluarga.
          </p>
          <p>
            <span>3</span>Masuk, lalu mulai mencatat.
          </p>
        </div>
        <p className="field-help">
          Petunjuk lengkap tersedia di README.md pada folder proyek.
        </p>
        {demoEnabled && (
          <Link className="button button-primary full-width" href="/demo">
            Coba buku kas contoh <ArrowRight size={18} />
          </Link>
        )}
      </WelcomeLayout>
    );
  }

  const accountId = await getAccountId();

  if (!accountId) {
    redirect("/login");
  }

  return <Dashboard initialData={await readBook(accountId)} mode="cloud" />;
}
