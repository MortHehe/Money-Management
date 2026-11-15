import { strFromU8, unzipSync } from "fflate";

function xmlText(xml: string): string {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
  };
  return Array.from(xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g), ([, text]) =>
    text.replace(/&(amp|lt|gt|quot|apos);/g, (_, entity: string) => entities[entity]),
  ).join("");
}

/** Baca kembali OOXML dari file unduhan, bukan objek pembuat dokumen. */
export function readDocx(content: Uint8Array) {
  const files = unzipSync(content);
  const xml = strFromU8(files["word/document.xml"]);
  const paragraphs = (fragment: string) =>
    Array.from(fragment.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g), ([, paragraph]) =>
      xmlText(paragraph),
    );
  const rows = Array.from(xml.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g), ([, row]) =>
    Array.from(row.matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g), ([, cell]) =>
      paragraphs(cell).join("\n"),
    ),
  );

  return { xml, rows, paragraphs: paragraphs(xml) };
}
