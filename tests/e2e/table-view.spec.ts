import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { DEMO_STORAGE_KEY } from "../../src/lib/constants";
import type { BookData, Transaction } from "../../src/lib/types";
import { readDocx } from "../helpers/docx";

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

async function downloadWord(page: Page, filename = "catat-uang-2026-02.docx") {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ekspor Word (.docx)", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(filename);
  expect(await download.failure()).toBeNull();
  return readDocx(await readFile((await download.path())!));
}

test("ekspor Word mengikuti bulan dan kategori pilihan pada Table View, Buku kas, dan Laporan", async ({
  page,
}, testInfo) => {
  await openTable(page);
  await page.getByLabel("Bulan ekspor", { exact: true }).selectOption("2026-02");
  const table = page.locator(".cash-table");
  const monthRows = await table
    .locator("tbody tr")
    .evaluateAll((rows) =>
      rows
        .filter((row) => row.textContent?.includes("/02/2026"))
        .map((row) =>
          Array.from(row.querySelectorAll("th, td"), (cell) => cell.textContent),
        ),
    );
  const expectedRows = [
    ["Tanggal", "Keterangan", "Debit", "Kredit"],
    ...monthRows,
    ["Total bulan ini", "26.000", "75.000"],
  ];
  const document = await downloadWord(page);
  expect(document.rows).toEqual(expectedRows);
  expect(document.paragraphs).toContain("Saldo awal bulan: Rp 600.000");
  expect(document.paragraphs).toContain("Saldo akhir bulan: Rp 551.000");
  expect(document.paragraphs).toContain("27 transaksi · Februari 2026 · Semua kategori");
  await expect(table.locator("tbody tr")).toHaveCount(29);
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-word-export.png`,
    fullPage: true,
  });

  await page.getByLabel("Kategori ekspor", { exact: true }).selectOption("Belanja");
  const categoryRows = [
    ["Tanggal", "Keterangan", "Debit", "Kredit"],
    ["27/02/2026", "Catatan 27", "—", "75.000"],
    ["Total kategori", "0", "75.000"],
  ];
  const categoryDocument = await downloadWord(page, "catat-uang-2026-02-Belanja.docx");
  expect(categoryDocument.rows).toEqual(categoryRows);
  expect(categoryDocument.paragraphs).toContain("Selisih kategori: -Rp 75.000");

  await page.getByLabel("Bulan ekspor", { exact: true }).selectOption("2026-03");
  const empty = await downloadWord(page, "catat-uang-2026-03-Belanja.docx");
  expect(empty.rows).toEqual([
    ["Tanggal", "Keterangan", "Debit", "Kredit"],
    ["Belum ada transaksi untuk pilihan ini."],
    ["Total kategori", "0", "0"],
  ]);
  await page.getByLabel("Bulan ekspor", { exact: true }).selectOption("2026-02");

  await page.getByRole("button", { name: "Buku kas", exact: true }).click();
  await expect(page.getByLabel("Bulan laporan")).toHaveValue("2026-02");
  await expect(page.getByLabel("Kategori ekspor", { exact: true })).toHaveValue(
    "Belanja",
  );
  await page.getByLabel("Cari transaksi").fill("Catatan 1");
  await page.getByLabel("Filter jenis transaksi").selectOption("income");
  expect((await downloadWord(page, "catat-uang-2026-02-Belanja.docx")).rows).toEqual(
    categoryRows,
  );

  await page.getByRole("button", { name: "Laporan", exact: true }).click();
  expect((await downloadWord(page, "catat-uang-2026-02-Belanja.docx")).rows).toEqual(
    categoryRows,
  );
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh laporan CSV / Excel" }).click();
  const csvDownload = await csvPromise;
  expect(csvDownload.suggestedFilename()).toBe("catat-uang-2026-02-Belanja.csv");
  const csv = await readFile((await csvDownload.path())!, "utf8");
  expect(csv.split("\r\n")).toHaveLength(2);
  expect(csv).toContain('"Catatan 27";"Belanja";"0";"75000";"551000"');
  await page.getByLabel("Kategori ekspor", { exact: true }).selectOption("");
  expect((await downloadWord(page)).rows).toEqual(expectedRows);
  await page.getByLabel("Bulan laporan").selectOption("2026-03");
  const march = await downloadWord(page, "catat-uang-2026-03.docx");
  expect(march.rows).toEqual([
    ["Tanggal", "Keterangan", "Debit", "Kredit"],
    ["01/03/2026", "Catatan 101", "999.000", "—"],
    ["Total bulan ini", "999.000", "0"],
  ]);
  expect(march.paragraphs).toContain("Saldo akhir bulan: Rp 1.550.000");
});

test("ekspor Word mengenali kategori custom dan kategori yang sama pada pemasukan serta pengeluaran", async ({
  page,
}) => {
  const data = createBook();
  data.transactions = [
    { ...createTransaction(1, "2025-02-01", 100_000), category: "Bahan / atap" },
    { ...createTransaction(2, "2026-02-01", 50_000), category: "Bahan / atap" },
    {
      ...createTransaction(3, "2026-02-02", 20_000, "expense"),
      category: "Bahan / atap",
    },
    createTransaction(4, "2026-02-03", 900_000),
    { ...createTransaction(5, "2026-03-01", 100_000), category: "Bahan / atap" },
  ];
  await openTable(page, data);
  await page.getByLabel("Bulan ekspor", { exact: true }).selectOption("2026-02");
  await page.getByLabel("Kategori ekspor", { exact: true }).selectOption("Bahan / atap");
  const document = await downloadWord(page, "catat-uang-2026-02-Bahan-atap.docx");
  expect(document.rows).toEqual([
    ["Tanggal", "Keterangan", "Debit", "Kredit"],
    ["01/02/2026", "Catatan 2", "50.000", "—"],
    ["02/02/2026", "Catatan 3", "—", "20.000"],
    ["Total kategori", "50.000", "20.000"],
  ]);
  expect(document.paragraphs).toContain("Februari 2026 · Bahan / atap");
  expect(document.paragraphs).toContain("Selisih kategori: Rp 30.000");
});

test("Word tetap bisa diunduh untuk buku kosong", async ({ page }) => {
  const data = createBook();
  data.transactions = [];
  await openTable(page, data);
  await page.getByLabel("Bulan ekspor", { exact: true }).selectOption("2026-02");
  const document = await downloadWord(page);
  expect(document.rows).toEqual([
    ["Tanggal", "Keterangan", "Debit", "Kredit"],
    ["Belum ada transaksi untuk pilihan ini."],
    ["Total bulan ini", "0", "0"],
  ]);
  expect(document.paragraphs).toContain("Saldo akhir bulan: Rp 100.000");
});

test("kegagalan unduhan Word menampilkan pesan dan dapat dicoba kembali", async ({
  page,
}) => {
  await openTable(page);
  await page.getByLabel("Bulan ekspor", { exact: true }).selectOption("2026-02");
  await page.evaluate(() => {
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (...args) => {
      URL.createObjectURL = original;
      throw new Error(`Simulasi kegagalan unduhan ${args.length}`);
    };
  });
  await page.getByRole("button", { name: "Ekspor Word (.docx)", exact: true }).click();
  const alert = page.locator(".book-export").getByRole("alert");
  await expect(alert).toHaveText("Dokumen Word gagal dibuat. Coba ekspor kembali.");
  expect((await downloadWord(page)).rows).toHaveLength(29);
  await expect(alert).toHaveCount(0);
});

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
  const overview = page.getByRole("region", { name: "Sekilas keuangan", exact: true });
  await expect(overview.getByRole("combobox")).toHaveCount(0);
  await expect(overview.getByText("Semua periode", { exact: true })).toBeVisible();
  await expect(overview.getByTestId("total-income")).toHaveText("Rp 1.525.000");
  await expect(overview.getByTestId("total-expense")).toHaveText("Rp 75.000");
  await expect(overview.getByTestId("total-balance")).toHaveText("Rp 1.550.000");
  await page.getByLabel("Bulan laporan").selectOption("2026-02");
  await expect(overview.getByTestId("total-income")).toHaveText("Rp 1.525.000");
  await expect(overview.getByTestId("total-expense")).toHaveText("Rp 75.000");
  await expect(overview.getByTestId("total-balance")).toHaveText("Rp 1.550.000");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-overall-summary.png`,
    fullPage: true,
  });

  await page.getByRole("button", { name: "Laporan", exact: true }).click();
  await expect(overview.getByTestId("total-income")).toHaveText("Rp 1.525.000");
  await expect(overview.getByTestId("total-expense")).toHaveText("Rp 75.000");
  await expect(page.locator(".monthly-report")).toContainText("+ Rp 26.000");
  await expect(page.locator(".monthly-report")).toContainText("− Rp 75.000");
  await page.getByRole("button", { name: "Bulan berikutnya" }).click();
  await expect(overview.getByTestId("total-income")).toHaveText("Rp 1.525.000");
  await expect(overview.getByTestId("total-expense")).toHaveText("Rp 75.000");
  await expect(page.locator(".monthly-report")).toContainText("+ Rp 999.000");
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
  await page.getByRole("button", { name: "Buku kas", exact: true }).click();
  await expect(page.getByTestId("total-income")).toHaveText("Rp 0");
  await expect(page.getByTestId("total-expense")).toHaveText("Rp 0");
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 100.000");
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
  await expect(page.getByTestId("total-income")).toHaveText("Rp 1.525.000");
  await expect(page.getByTestId("total-expense")).toHaveText("Rp 76.000");
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 1.549.000");
  await page.getByRole("button", { name: "Table View", exact: true }).click();
  await expect(page.getByTestId("table-total-credit")).toHaveText("76.000");
  await expect(page.getByTestId("table-remaining-balance")).toHaveText("Rp 1.549.000");
  await expect(page.locator(".cash-table tbody tr")).toHaveCount(30);
  await expect(
    page.locator(".cash-table tbody tr").filter({ hasText: "28/02/2026" }),
  ).toContainText("Belanja dari Buku kas");
});

test("debit berketerangan saldo awal tetap menjadi pemasukan tanpa menambah modal awal", async ({
  page,
}, testInfo) => {
  const data = createBook();
  data.settings.openingBalance = 0;
  data.transactions = [
    { ...createTransaction(1, "2026-07-20", 301_000_000), description: "Saldo awal" },
    createTransaction(2, "2026-08-01", 131_657_500, "expense"),
    createTransaction(3, "2026-09-01", 4_000_000),
  ];
  await openTable(page, data);
  await expect(page.locator(".cash-table tbody tr").first()).toContainText("301.000.000");
  await expect(page.getByTestId("table-opening-balance")).toHaveText("Rp 0");
  await expect(page.getByTestId("table-income")).toHaveText("Rp 305.000.000");
  await expect(page.getByTestId("table-total-debit")).toHaveText("305.000.000");
  await expect(page.getByTestId("table-remaining-balance")).toHaveText("Rp 173.342.500");
  await expect(page.locator(".cash-table-balance")).toContainText("Uang masuk");
  await expect(page.locator(".cash-table-opening-note")).toContainText(
    "tidak menambah modal awal",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  ).toBe(false);
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-opening-balance.png`,
    fullPage: true,
  });

  await page.getByRole("button", { name: "Buku kas", exact: true }).click();
  await expect(page.getByTestId("total-balance")).toHaveText("Rp 173.342.500");
  await page.getByLabel("Bulan laporan").selectOption("2026-07");
  await page.getByRole("button", { name: "Ubah Saldo awal", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nominal dalam rupiah").fill("302000000");
  await dialog.getByRole("button", { name: "Simpan transaksi" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Table View", exact: true }).click();
  await expect(page.getByTestId("table-opening-balance")).toHaveText("Rp 0");
  await expect(page.getByTestId("table-income")).toHaveText("Rp 306.000.000");
  await expect(page.getByTestId("table-total-debit")).toHaveText("306.000.000");
  await expect(page.getByTestId("table-remaining-balance")).toHaveText("Rp 174.342.500");
});

test("modal awal dari Pengaturan terpisah dari debit di tabel dan ekspor Word", async ({
  page,
}) => {
  const data = createBook();
  data.transactions = [
    { ...createTransaction(1, "2026-07-20", 500_000), description: "  SALDO   Awal  " },
    createTransaction(2, "2026-07-21", 75_000, "expense"),
  ];
  await openTable(page, data);
  await expect(page.getByTestId("table-opening-balance")).toHaveText("Rp 100.000");
  await expect(page.getByTestId("table-income")).toHaveText("Rp 500.000");
  await expect(page.getByTestId("table-total-debit")).toHaveText("500.000");
  await expect(page.getByTestId("table-remaining-balance")).toHaveText("Rp 525.000");
  await expect(page.locator(".cash-table-opening-note")).toContainText(
    "Modal awal berasal dari saldo awal di Pengaturan",
  );
  await expect(page.locator(".cash-table-opening-note")).toContainText(
    "tidak menambah modal awal",
  );
  await page.getByLabel("Bulan ekspor", { exact: true }).selectOption("2026-07");
  const document = await downloadWord(page, "catat-uang-2026-07.docx");
  expect(document.paragraphs).toContain("Saldo awal bulan: Rp 100.000");
  expect(document.paragraphs).toContain("Uang masuk: Rp 500.000");
  expect(document.paragraphs).toContain("Saldo akhir bulan: Rp 525.000");
  expect(document.rows.at(-1)).toEqual(["Total bulan ini", "500.000", "75.000"]);

  await page.getByRole("button", { name: "Pengaturan", exact: true }).click();
  await expect(page.getByLabel("Nominal dalam rupiah")).toHaveValue("100.000");
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
