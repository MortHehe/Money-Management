import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { z } from "zod";
import { hashPassword } from "../src/lib/password";
import { scriptDatabase } from "./environment";

async function createAccount() {
  const sql = scriptDatabase();
  let hidden = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!hidden) {
        process.stdout.write(chunk);
      }

      callback();
    },
  });
  const prompt = createInterface({
    input: process.stdin,
    output,
    terminal: Boolean(process.stdin.isTTY),
  });

  try {
    const email = z
      .email()
      .max(254)
      .parse((await prompt.question("Email akun keluarga: ")).trim().toLowerCase());
    const existing = await sql`SELECT id FROM accounts WHERE email = ${email}`;

    if (existing.length > 0) {
      const answer = await prompt.question(
        "Akun sudah ada. Ganti kata sandi dan keluarkan semua sesi? Ketik YA: ",
      );

      if (answer !== "YA") {
        console.log("Tidak ada perubahan.");
        return;
      }
    }

    const name =
      existing.length === 0
        ? (await prompt.question("Nama buku kas [Buku kas keluarga]: ")).trim() ||
          "Buku kas keluarga"
        : "";

    if (existing.length === 0) {
      z.string().min(2).max(50).parse(name);
    }

    process.stdout.write("Kata sandi (minimal 12 karakter, tidak ditampilkan): ");
    hidden = true;
    const password = await prompt.question("");
    hidden = false;
    process.stdout.write("\n");
    z.string().min(12).max(128).parse(password);

    process.stdout.write("Ulangi kata sandi: ");
    hidden = true;
    const confirmation = await prompt.question("");
    hidden = false;
    process.stdout.write("\n");

    if (confirmation !== password) {
      throw new Error("Kata sandi tidak sama.");
    }

    const passwordHash = await hashPassword(password);

    if (existing.length > 0) {
      await sql.transaction([
        sql`UPDATE accounts SET password_hash = ${passwordHash} WHERE id = ${existing[0].id}`,
        sql`DELETE FROM sessions WHERE account_id = ${existing[0].id}`,
      ]);
    } else {
      await sql`
        WITH account AS (
          INSERT INTO accounts (email, password_hash) VALUES (${email}, ${passwordHash}) RETURNING id
        )
        INSERT INTO books (account_id, name) SELECT id, ${name} FROM account
      `;
    }

    console.log(
      "Akun siap. Gunakan email dan kata sandi tadi untuk masuk dari HP dan laptop.",
    );
  } finally {
    hidden = false;
    prompt.close();
  }
}

createAccount().catch(() => {
  console.error(
    "Akun belum berhasil disimpan. Pastikan migrasi selesai, email valid, nama 2–50 karakter, dan kata sandi 12–128 karakter serta cocok.",
  );
  process.exitCode = 1;
});
