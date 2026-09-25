import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getDatabase, isDatabaseConfigured } from "./db";

const SESSION_COOKIE = "catat-uang-session";
const SESSION_DAYS = 30;

export function digestToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function getAccountId(): Promise<string | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  const sql = getDatabase();
  const rows =
    await sql`SELECT account_id FROM sessions WHERE token_hash = ${digestToken(token)} AND expires_at > now()`;
  return rows[0]?.account_id ?? null;
}

export async function requireAccountId(): Promise<string> {
  const accountId = await getAccountId();

  if (!accountId) {
    throw new Error("UNAUTHENTICATED");
  }

  return accountId;
}

export async function createSession(accountId: string): Promise<void> {
  const sql = getDatabase();
  const cookieStore = await cookies();
  const previousToken = cookieStore.get(SESSION_COOKIE)?.value;
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1_000);

  await sql.transaction([
    sql`DELETE FROM sessions WHERE expires_at <= now() OR token_hash = ${digestToken(previousToken ?? "")}`,
    sql`INSERT INTO sessions (token_hash, account_id, expires_at) VALUES (${digestToken(token)}, ${accountId}, ${expiresAt.toISOString()})`,
  ]);

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token && isDatabaseConfigured()) {
    const sql = getDatabase();
    await sql`DELETE FROM sessions WHERE token_hash = ${digestToken(token)}`;
  }

  cookieStore.delete(SESSION_COOKIE);
}

/** Pembatasan tersimpan di Neon sehingga berlaku di seluruh instance Vercel. */
export async function consumeLoginAttempt(email: string): Promise<boolean> {
  const sql = getDatabase();
  const bucket = digestToken(email.toLowerCase());
  const rows = await sql`
    INSERT INTO login_limits (bucket, attempts, resets_at)
    VALUES (${bucket}, 1, now() + interval '15 minutes')
    ON CONFLICT (bucket) DO UPDATE SET
      attempts = CASE WHEN login_limits.resets_at <= now() THEN 1 ELSE login_limits.attempts + 1 END,
      resets_at = CASE WHEN login_limits.resets_at <= now() THEN now() + interval '15 minutes' ELSE login_limits.resets_at END
    RETURNING attempts
  `;

  return rows[0].attempts <= 10;
}
