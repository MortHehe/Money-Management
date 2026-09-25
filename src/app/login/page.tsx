import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { WelcomeLayout } from "@/components/auth/welcome-layout";
import { getAccountId } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!isDatabaseConfigured()) {
    redirect("/");
  }

  if (await getAccountId()) {
    redirect("/");
  }

  return (
    <WelcomeLayout>
      <span className="welcome-form-icon">
        <BookOpen size={27} />
      </span>
      <div className="eyebrow">SELAMAT DATANG KEMBALI</div>
      <h2>Mari buka buku kas.</h2>
      <p className="welcome-description">
        Masuk untuk melihat dan mencatat keuangan keluarga Anda.
      </p>
      <LoginForm />
    </WelcomeLayout>
  );
}
