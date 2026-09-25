import { getToday } from "./format";
import type { BookData, Transaction } from "./types";

/** Contoh selalu menggunakan bulan berjalan agar pratinjau langsung terbaca. */
export function createDemoBook(): BookData {
  const today = getToday();
  const month = today.slice(0, 7);
  const entries: Array<[Transaction["kind"], number, string, string, string]> = [
    ["income", 5_000_000, "Gaji", "Gaji bulanan", "01"],
    ["expense", 325_000, "Belanja", "Belanja kebutuhan rumah", "02"],
    ["expense", 185_000, "Tagihan", "Bayar listrik rumah", "03"],
    ["expense", 75_000, "Transportasi", "Isi bensin", "05"],
    ["income", 500_000, "Pemberian", "Uang dari anak", "08"],
    ["expense", 120_000, "Makanan", "Makan bersama keluarga", "10"],
    ["expense", 85_000, "Kesehatan", "Vitamin bulanan", "12"],
    ["expense", 150_000, "Belanja", "Belanja sayur dan buah", "15"],
  ];

  return {
    settings: { name: "Buku kas keluarga", openingBalance: 1_250_000 },
    revision: 0,
    transactions: entries.map(
      ([kind, amount, category, description, sampleDay], index) => {
        const day = String(
          Math.min(Number(sampleDay), Number(today.slice(8, 10))),
        ).padStart(2, "0");

        return {
          id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          kind,
          amount,
          category,
          description,
          date: `${month}-${day}`,
          createdAt: `${month}-${day}T08:00:00.000Z`,
        };
      },
    ),
  };
}
