import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { formatMoney, formatNumber, formatTableDate } from "./format";
import { compareTransactions, summarizeTable } from "./ledger";
import type { BookData } from "./types";

// Lebar A4 dikurangi margin 2 cm di setiap sisi, dalam twip.
const COLUMN_WIDTHS = [1_440, 3_618, 2_290, 2_290];
const TABLE_WIDTH = COLUMN_WIDTHS.reduce((total, width) => total + width, 0);
const border = { style: BorderStyle.SINGLE, size: 4, color: "D9D9D9" };

function tableCell(
  text: string,
  column: number,
  { bold = false, fill = "FFFFFF", span = 1 } = {},
): TableCell {
  return new TableCell({
    width: {
      size: COLUMN_WIDTHS.slice(column, column + span).reduce(
        (total, width) => total + width,
        0,
      ),
      type: WidthType.DXA,
    },
    columnSpan: span,
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill },
    children: text.split(/\r\n|\r|\n/).map(
      (line) =>
        new Paragraph({
          alignment: column >= 2 ? AlignmentType.RIGHT : AlignmentType.LEFT,
          spacing: { before: 0, after: 0, line: 260 },
          children: [new TextRun({ text: line, bold, size: 19 })],
        }),
    ),
  });
}

function balanceLine(label: string, amount: number, prominent = false): Paragraph {
  return new Paragraph({
    spacing: { before: prominent ? 160 : 80, after: 80 },
    children: [
      new TextRun({ text: `${label}: `, bold: prominent }),
      new TextRun({ text: formatMoney(amount), bold: true }),
    ],
  });
}

/** Dokumen berisi seluruh Table View, tanpa filter bulan, pencarian, atau halaman. */
export async function createBookDocument(data: BookData): Promise<Blob> {
  const transactions = [...data.transactions].sort(compareTransactions);
  const summary = summarizeTable(data);
  const hasOpeningTransaction = summary.openingFromTransactions > 0;
  const incomeLabel = hasOpeningTransaction ? "Uang masuk lainnya" : "Uang masuk";
  const table = new Table({
    width: { size: TABLE_WIDTH, type: WidthType.DXA },
    columnWidths: COLUMN_WIDTHS,
    layout: TableLayoutType.FIXED,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    borders: {
      top: border,
      bottom: border,
      left: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border,
    },
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: ["Tanggal", "Keterangan", "Debit", "Kredit"].map((label, index) =>
          tableCell(label, index, { bold: true, fill: "EDF3EB" }),
        ),
      }),
      ...transactions.map(
        (transaction, index) =>
          new TableRow({
            cantSplit: true,
            children: [
              formatTableDate(transaction.date),
              transaction.description,
              transaction.kind === "income" ? formatNumber(transaction.amount) : "—",
              transaction.kind === "expense" ? formatNumber(transaction.amount) : "—",
            ].map((value, column) =>
              tableCell(value, column, { fill: index % 2 ? "FAFBF8" : "FFFFFF" }),
            ),
          }),
      ),
      ...(transactions.length === 0
        ? [
            new TableRow({
              children: [
                tableCell("Belum ada transaksi dalam buku kas.", 0, { span: 4 }),
              ],
            }),
          ]
        : []),
      new TableRow({
        cantSplit: true,
        children: [
          tableCell("Total keseluruhan", 0, { span: 2, bold: true, fill: "EDF3EB" }),
          tableCell(formatNumber(summary.income), 2, { bold: true, fill: "EDF3EB" }),
          tableCell(formatNumber(summary.expense), 3, { bold: true, fill: "EDF3EB" }),
        ],
      }),
    ],
  });
  const document = new Document({
    creator: "Catat Uang",
    title: `Buku kas ${data.settings.name}`,
    description: "Seluruh transaksi dan ringkasan saldo dari semua periode.",
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 21, color: "000000" },
          paragraph: { spacing: { after: 120, line: 276 } },
        },
        title: {
          run: { font: "Arial", size: 36, bold: true, color: "000000" },
          paragraph: { spacing: { before: 0, after: 160 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11_906, height: 16_838 },
            margin: { top: 1_134, bottom: 1_134, left: 1_134, right: 1_134 },
          },
        },
        children: [
          new Paragraph({ text: data.settings.name, heading: HeadingLevel.TITLE }),
          new Paragraph({ text: "Seluruh transaksi · Semua periode", keepNext: true }),
          new Paragraph({
            text: "Angka dalam rupiah. Debit = uang masuk · Kredit = uang keluar.",
            keepNext: true,
          }),
          table,
          new Paragraph({
            text: `${summary.count} transaksi · Semua periode`,
            spacing: { before: 160, after: 160 },
          }),
          balanceLine("Saldo awal buku kas", summary.openingTotal),
          ...(hasOpeningTransaction
            ? [
                new Paragraph({
                  text:
                    (summary.opening > 0
                      ? `Terdiri dari ${formatMoney(summary.opening)} dari Pengaturan dan ${formatMoney(summary.openingFromTransactions)} dari transaksi “Saldo awal”.`
                      : "Saldo awal berasal dari transaksi “Saldo awal” pada kolom debit.") +
                    " Saldo awal yang tercatat di debit dihitung sekali.",
                }),
              ]
            : []),
          balanceLine(incomeLabel, summary.otherIncome),
          balanceLine("Uang keluar", summary.expense),
          balanceLine("Sisa uang", summary.closing, true),
          new Paragraph({
            text: `Sisa uang = saldo awal buku kas + ${incomeLabel.toLowerCase()} − uang keluar.`,
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(document);
}
