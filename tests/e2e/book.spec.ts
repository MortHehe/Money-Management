import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo");
  await expect(
    page.getByRole("button", { name: "Uang keluar", exact: true }),
  ).toBeEnabled();
});

test("menambah, menyimpan setelah refresh, mengubah, dan menghapus pengeluaran", async ({
  page,
}) => {
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 5.810.000");
  await page.getByRole("button", { name: "Uang keluar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nominal dalam rupiah").fill("45000");
  await dialog.getByLabel("Keterangan").fill("Belanja pengujian");
  await dialog.getByRole("button", { name: "Simpan transaksi" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 5.765.000");
  await page.reload();
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 5.765.000");
  await page.getByLabel("Cari transaksi").fill("Belanja pengujian");
  await page.getByRole("button", { name: "Ubah Belanja pengujian", exact: true }).click();
  await dialog.getByLabel("Nominal dalam rupiah").fill("50000");
  await dialog.getByRole("button", { name: "Simpan transaksi" }).click();
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 5.760.000");
  await page
    .getByRole("button", { name: "Hapus Belanja pengujian", exact: true })
    .click();
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 5.760.000");
  await page
    .getByRole("button", { name: "Hapus Belanja pengujian", exact: true })
    .click();
  await page.getByRole("button", { name: "Ya, hapus", exact: true }).click();
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 5.810.000");
});

test("nominal kosong ditolak dan membatalkan formulir tidak menambah catatan", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Uang masuk", exact: true }).click();
  await page.getByLabel("Keterangan").fill("Tidak boleh tersimpan");
  await page.getByRole("button", { name: "Simpan transaksi" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Isi nominal");
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 5.810.000");
});

test("saldo awal bisa diubah, laporan dibuka, CSV dan cadangan bisa diunduh", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Pengaturan", exact: true }).click();
  await page.getByLabel("Nominal dalam rupiah").fill("2000000");
  await page.getByRole("button", { name: "Simpan pengaturan" }).click();
  await expect(page.getByRole("status")).toContainText("berhasil disimpan");
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh", exact: true }).click();
  expect((await backupDownload).suggestedFilename()).toMatch(/\.json$/);
  await page.getByRole("button", { name: "Laporan", exact: true }).click();
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 6.560.000");
  await expect(page.getByRole("heading", { name: "Enam bulan terakhir" })).toBeVisible();
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh laporan CSV / Excel" }).click();
  expect((await csvDownload).suggestedFilename()).toMatch(/\.csv$/);
});

test("memulihkan cadangan memerlukan konfirmasi dan mengganti buku kas", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Pengaturan", exact: true }).click();
  const backup = {
    format: "catat-uang",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: { name: "Buku hasil pemulihan", openingBalance: 123000 },
    transactions: [],
  };
  await page.getByLabel("Pilih file cadangan").setInputFiles({
    name: "cadangan.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("button", { name: "Pulihkan cadangan", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Ketik PULIHKAN untuk melanjutkan").fill("PULIHKAN");
  await page.getByRole("button", { name: "Pulihkan cadangan", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Buku kas", exact: true }).click();
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 123.000");
  await expect(
    page.getByRole("heading", { name: "Mulai dengan satu catatan" }),
  ).toBeVisible();
});

test("pencarian, filter, pergantian bulan, dan ukuran layar bekerja", async ({
  page,
}, testInfo) => {
  await page.getByLabel("Filter jenis transaksi").selectOption("income");
  await page.getByLabel("Cari transaksi").fill("anak");
  await expect(
    page.getByRole("button", { name: "Ubah Uang dari anak", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Ubah Gaji bulanan", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Bulan berikutnya" }).click();
  await expect(
    page.getByRole("heading", { name: "Mulai dengan satu catatan" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bulan sebelumnya" }).click();
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-dashboard.png`,
    fullPage: true,
  });
});

test("layar kecil dan browser HTTP lokal tetap dapat mencatat uang masuk", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
  });
  await page.reload();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("button", { name: "Uang masuk", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Nominal dalam rupiah").fill("999999999999");
  await page.getByLabel("Keterangan").fill("Pemasukan layar kecil");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  ).toBe(false);
  await page.getByRole("button", { name: "Simpan transaksi" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 1.000.005.809.999");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  ).toBe(false);
});
