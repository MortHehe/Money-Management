import { expect, test, type Locator, type Page } from "@playwright/test";

const customOption = { label: "Kategori custom…" };

async function openTransaction(page: Page, label: "Uang masuk" | "Uang keluar") {
  await page.getByRole("button", { name: label, exact: true }).click();
  return page.getByRole("dialog");
}

async function fillTransaction(dialog: Locator, description: string) {
  await dialog.getByLabel("Nominal dalam rupiah").fill("150000");
  await dialog.getByLabel("Keterangan").fill(description);
}

async function saveTransaction(dialog: Locator) {
  await dialog.getByRole("button", { name: "Simpan transaksi" }).click();
  await expect(dialog).not.toBeVisible();
}

async function expectNoPageOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  ).toBe(false);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/demo");
  await expect(
    page.getByRole("button", { name: "Uang keluar", exact: true }),
  ).toBeEnabled();
});

test("Gaji tersedia dan tersimpan sebagai kategori pengeluaran", async ({ page }) => {
  const dialog = await openTransaction(page, "Uang keluar");
  await fillTransaction(dialog, "Bayar gaji pekerja");
  await dialog.getByLabel("Kategori", { exact: true }).selectOption("Gaji");
  await saveTransaction(dialog);

  await expect(page.getByTestId("total-balance")).toHaveText("Rp 5.660.000");
  const salary = page.locator(".category-item").filter({ hasText: "Gaji" });
  await expect(salary).toContainText("Rp 150.000");

  await page.reload();
  await page.getByLabel("Cari transaksi").fill("Gaji");
  await page
    .getByRole("button", { name: "Ubah Bayar gaji pekerja", exact: true })
    .click();
  await expect(dialog.getByLabel("Kategori", { exact: true })).toHaveValue("Gaji");
  await expect(
    dialog.getByRole("button", { name: "Uang keluar", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

for (const scenario of [
  { label: "Uang keluar", category: "Bahan renovasi", renamed: "Bahan atap" },
  { label: "Uang masuk", category: "Hasil kebun", renamed: "Penjualan panen" },
] as const) {
  test(`${scenario.label}: kategori custom tersimpan, bisa diubah, dicari, dan dipakai kembali`, async ({
    page,
  }, testInfo) => {
    const description = `Catatan ${scenario.label.toLowerCase()} custom`;
    const dialog = await openTransaction(page, scenario.label);
    await fillTransaction(dialog, description);
    await dialog.getByLabel("Kategori", { exact: true }).selectOption(customOption);
    await dialog.getByLabel("Nama kategori custom").fill(`  ${scenario.category}  `);
    await expectNoPageOverflow(page);

    if (scenario.label === "Uang keluar") {
      await page.screenshot({
        path: `artifacts/${testInfo.project.name}-custom-category-form.png`,
        fullPage: true,
      });
    }

    await saveTransaction(dialog);
    await page.reload();
    await page.getByLabel("Cari transaksi").fill(scenario.category);
    await page.getByRole("button", { name: `Ubah ${description}`, exact: true }).click();
    await expect(dialog.getByLabel("Kategori", { exact: true })).toHaveValue(
      scenario.category,
    );

    await dialog.getByLabel("Kategori", { exact: true }).selectOption(customOption);
    await dialog.getByLabel("Nama kategori custom").fill(scenario.renamed);
    await saveTransaction(dialog);
    await page.reload();
    await page.getByLabel("Cari transaksi").fill(scenario.renamed);
    await expect(
      page.getByRole("button", { name: `Ubah ${description}`, exact: true }),
    ).toBeVisible();

    await openTransaction(page, scenario.label);
    await fillTransaction(dialog, `${description} kedua`);
    await dialog.getByLabel("Kategori", { exact: true }).selectOption(scenario.renamed);
    await expect(dialog.getByLabel("Nama kategori custom")).not.toBeVisible();
    await saveTransaction(dialog);
    await expect(
      page.getByRole("button", { name: `Ubah ${description} kedua`, exact: true }),
    ).toBeVisible();

    if (scenario.label === "Uang keluar") {
      const category = page
        .locator(".category-item")
        .filter({ hasText: scenario.renamed });
      await expect(category).toContainText("Rp 300.000");
      const color = await category
        .locator(".category-dot")
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      expect(color).not.toBe("rgba(0, 0, 0, 0)");
      await page.locator(".category-panel").screenshot({
        path: `artifacts/${testInfo.project.name}-custom-category-breakdown.png`,
      });
    }

    await expectNoPageOverflow(page);
  });
}

test("kategori custom wajib diisi dan tetap terjaga saat mengganti jenis di layar kecil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const dialog = await openTransaction(page, "Uang keluar");
  await fillTransaction(dialog, "Kategori layar kecil");
  const select = dialog.getByLabel("Kategori", { exact: true });
  await select.selectOption(customOption);
  const customInput = dialog.getByLabel("Nama kategori custom");
  await expect(customInput).toHaveAttribute("maxlength", "40");
  await expect(customInput).toHaveAttribute("required", "");
  await customInput.fill("   ");
  await dialog.getByRole("button", { name: "Simpan transaksi" }).click();
  await expect(dialog.getByRole("alert")).toContainText(/kategori/i);
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 5.810.000");

  const longCategory = "KategoriKhususTanpaSpasi".padEnd(40, "A");
  await customInput.fill(longCategory);
  await dialog.getByRole("button", { name: "Uang masuk", exact: true }).click();
  await expect(select).toHaveValue("");
  await expect(customInput).toHaveValue(longCategory);
  await dialog.getByRole("button", { name: "Uang keluar", exact: true }).click();
  await expect(customInput).toHaveValue(longCategory);
  await expectNoPageOverflow(page);
  await saveTransaction(dialog);
  await page.getByLabel("Cari transaksi").fill(longCategory);
  await expect(
    page.getByRole("button", { name: "Ubah Kategori layar kecil", exact: true }),
  ).toBeVisible();
  await expectNoPageOverflow(page);
});
