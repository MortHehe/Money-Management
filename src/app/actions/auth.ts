"use server";

import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";
import {
  consumeLoginAttempt,
  createSession,
  deleteSession,
  digestToken,
} from "@/server/auth";
import { getDatabase } from "@/server/db";

export interface LoginState {
  error: string;
}

export async function loginAction(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Masukkan alamat email dan kata sandi yang benar." };
  }

  try {
    if (!(await consumeLoginAttempt(parsed.data.email))) {
      return {
        error: "Terlalu banyak percobaan masuk. Silakan coba lagi dalam 15 menit.",
      };
    }

    const sql = getDatabase();
    const rows =
      await sql`SELECT id, password_hash FROM accounts WHERE email = ${parsed.data.email}`;
    const account = rows[0];
    // Tetap melakukan scrypt untuk email yang tidak dikenal agar waktu respons serupa.
    const dummyHash = `scrypt:${"0".repeat(64)}:${"0".repeat(128)}`;
    const passwordMatches = await verifyPassword(
      parsed.data.password,
      account?.password_hash ?? dummyHash,
    );

    if (!account || !passwordMatches) {
      return { error: "Email atau kata sandi belum sesuai." };
    }

    await createSession(account.id);
    await sql`DELETE FROM login_limits WHERE bucket = ${digestToken(parsed.data.email)} OR resets_at < now()`;
  } catch {
    return { error: "Belum dapat masuk. Periksa koneksi atau konfigurasi database." };
  }

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
