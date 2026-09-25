import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword } from "../../src/lib/password";

test("kata sandi di-hash dengan salt acak dan diverifikasi secara tepat", async () => {
  const first = await hashPassword("contoh-kata-sandi-aman");
  const second = await hashPassword("contoh-kata-sandi-aman");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("contoh-kata-sandi-aman", first), true);
  assert.equal(await verifyPassword("kata-sandi-salah", first), false);
  assert.equal(await verifyPassword("apa-saja", "hash-rusak"), false);
});
