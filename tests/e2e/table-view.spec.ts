import { expect, test, type Page } from "@playwright/test";
import { DEMO_STORAGE_KEY } from "../../src/lib/constants";
import type { BookData, Transaction } from "../../src/lib/types";

function createTransaction(
  index: number,
  date: string,
  amount: number,
  kind: Transaction["kind"] = "income",
): Transaction {
  return {
    id: `20000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    kind,
    date,
    amount,
    category: kind === "income" ? "Gaji" : "Belanja",
    description: `Catatan ${index}`,
    createdAt: `${date}T08:00:00.000Z`,
  };
}

function createBook(): BookData {
  return {
    settings: { name: "Buku pengujian tabel", openingBalance: 100_000 },
    revision: 0,
    transactions: [
      createTransaction(100, "2025-12-31", 500_000),
      ...Array.from({ length: 26 }, (_, index) =>
        createTransaction(
          index + 1,
          `2026-02-${String(index + 1).padStart(2, "0")}`,
          1_000,
        ),
      ),
      createTransaction(27, "2026-02-27", 75_000, "expense"),
      createTransaction(101, "2026-03-01", 999_000),
    ].reverse(),
  };
}

async function openTable(page: Page, data = createBook()) {
  await page.addInitScript(
    ({ key, book }) => {
      localStorage.setItem(key, JSON.stringify(book));
    },
    { key: DEMO_STORAGE_KEY, book: data },
  );
  await page.goto("/demo");
  await page.getByRole("button", { name: "Table View", exact: true }).click();
}

test("Table View menampilkan semua baris lintas bulan dan tahun dengan total keseluruhan", async ({
  page,
}, testInfo) => {
  await openTable(page);
  const table = page.locator(".cash-table");
  await expect(table.locator("thead th")).toHaveText([
    "Tanggal",
    "Keterangan",
    "Debit",
    "Kredit",
  ]);
  await expect(page.getByLabel("Bulan laporan")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Halaman Table View" })).toHaveCount(
    0,
  );
  await expect(table.locator("tbody tr")).toHaveCount(29);
  await expect(table.locator("tbody tr").first().locator("td")).toHaveText([
    "31/12/2025",
    "Catatan 100",
    "500.000",
    "—",
  ]);
  await expect(table.locator("tbody tr").last().locator("td")).toHaveText([
    "01/03/2026",
    "Catatan 101",
    "999.000",
    "—",
  ]);
  await expect(
    table.locator("tbody tr").filter({ hasText: "27/02/2026" }).locator("td"),
  ).toHaveText(["27/02/2026", "Catatan 27", "—", "75.000"]);
  await expect(page.getByTestId("table-opening-balance")).toHaveText("Rp 100.000");
  await expect(page.getByTestId("table-total-debit")).toHaveText("1.525.000");
  await expect(page.getByTestId("table-total-credit")).toHaveText("75.000");
  await expect(page.getByTestId("table-remaining-balance")).toHaveText("Rp 1.550.000");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-table-view.png`,
    fullPage: true,
  });

  await page.getByRole("button", { name: "Buku kas", exact: true }).click();
  await page.getByLabel("Bulan laporan").selectOption("2026-02");
  await page.getByRole("button", { name: "Table View", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(29);
  await expect(page.getByTestId("table-total-debit")).toHaveText("1.525.000");
  await expect(page.getByTestId("table-remaining-balance")).toHaveText("Rp 1.550.000");
});

test("buku kosong menampilkan total nol dan sisa uang sesuai saldo awal", async ({
  page,
}) => {
  const data = createBook();
  data.transactions = [];
  await openTable(page, data);
  await expect(page.locator(".cash-table")).toContainText(
    "Belum ada transaksi dalam buku kas.",
  );
  await expect(page.getByTestId("table-total-debit")).toHaveText("0");
  await expect(page.getByTestId("table-total-credit")).toHaveText("0");
  await expect(page.getByTestId("table-opening-balance")).toHaveText("Rp 100.000");
  await expect(page.getByTestId("table-remaining-balance")).toHaveText("Rp 100.000");
});

test("perubahan di Buku kas langsung tampil di Table View", async ({ page }) => {
  await openTable(page);
  await page.getByRole("button", { name: "Buku kas", exact: true }).click();
  await page.getByRole("button", { name: "Uang keluar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nominal dalam rupiah").fill("1000");
  await dialog.getByLabel("Tanggal", { exact: true }).fill("2026-02-28");
  await dialog.getByLabel("Keterangan").fill("Belanja dari Buku kas");
  await dialog.getByRole("button", { name: "Simpan transaksi" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Table View", exact: true }).click();
  await expect(page.getByTestId("table-total-credit")).toHaveText("76.000");
  await expect(page.getByTestId("table-remaining-balance")).toHaveText("Rp 1.549.000");
  await expect(page.locator(".cash-table tbody tr")).toHaveCount(30);
  await expect(
    page.locator(".cash-table tbody tr").filter({ hasText: "28/02/2026" }),
  ).toContainText("Belanja dari Buku kas");
});

test("nominal besar dan sisa negatif tetap terbaca pada layar 320px", async ({
  page,
}) => {
  const data = createBook();
  data.settings.openingBalance = 0;
  data.transactions = [
    {
      ...createTransaction(1, "2026-02-01", 999_999_999_999, "expense"),
      description: "Keterangan panjang untuk menguji tabel pada layar kecil ".repeat(2),
    },
  ];
  await page.setViewportSize({ width: 320, height: 740 });
  await openTable(page, data);
  await expect(page.getByTestId("table-remaining-balance")).toHaveText(
    "-Rp 999.999.999.999",
  );
  await expect(page.getByTestId("table-total-credit")).toHaveText("999.999.999.999");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  ).toBe(false);
  const canScroll = await page.locator(".cash-table-scroll").evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    return element.scrollLeft > 0;
  });
  expect(canScroll).toBe(true);
  await expect(
    page.getByRole("button", { name: "Pengaturan", exact: true }),
  ).toBeInViewport();
});

test("manifest, ikon Apple, viewport, dan panduan Safari tersedia", async ({
  page,
  request,
}) => {
  await openTable(page);
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(manifestHref).toBeTruthy();
  const manifestResponse = await request.get(manifestHref!);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
  });
  const iconHref = await page
    .locator('link[rel="apple-touch-icon"]')
    .getAttribute("href");
  expect(iconHref).toBeTruthy();
  const iconResponse = await request.get(iconHref!);
  expect(iconResponse.ok()).toBe(true);
  const icon = await iconResponse.body();
  expect(icon.readUInt32BE(16)).toBe(180);
  expect(icon.readUInt32BE(20)).toBe(180);
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute(
    "content",
    "yes",
  );
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    "content",
    "Catat Uang",
  );
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );

  await page.getByRole("button", { name: "Pengaturan", exact: true }).click();
  const guide = page.locator(".apple-install-guide");
  await guide.locator("summary").click();
  await expect(guide.getByText("Tambah ke Layar Utama", { exact: true })).toBeVisible();
  await expect(guide.getByText("Buka sebagai App Web", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  ).toBe(false);
});
