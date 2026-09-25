const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID");

/** Nominal selalu berupa bilangan bulat rupiah, sehingga tidak ada pembulatan sen. */
export function formatMoney(amount: number): string {
  return rupiahFormatter.format(amount).replace(/\u00a0/g, " ");
}

export function formatNumber(amount: number): string {
  return numberFormatter.format(amount);
}

export function formatDate(date: string, full = false): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: full ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
}

/** WIB menjadi acuan tanggal buku kas di kedua perangkat. */
export function getToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function shiftMonth(month: string, direction: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + direction, 1));
  return shifted.toISOString().slice(0, 7);
}
