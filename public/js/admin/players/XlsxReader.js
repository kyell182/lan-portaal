const SIG_END_OF_CENTRAL_DIR = 0x06054b50;
const SIG_CENTRAL_ENTRY = 0x02014b50;
const SIG_LOCAL_HEADER = 0x04034b50;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;
const MAX_COMMENT_LENGTH = 65535;
const SHARED_STRINGS = 'xl/sharedStrings.xml';
const SHEET_PATH = /^xl\/worksheets\/sheet(\d+)\.xml$/;
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/**
 * Leest het eerste werkblad van een .xlsx (zoals de export van Microsoft Forms) zonder externe bibliotheek.
 * Een .xlsx is een zip met XML; de browser pakt de deflate-delen zelf uit via DecompressionStream.
 */
export class XlsxReader {
  /** @returns rijen van cellen (tekst), gelijk van vorm als de uitvoer van CsvParser */
  static async read(arrayBuffer) {
    const files = XlsxReader.#entries(new Uint8Array(arrayBuffer));
    const sheetName = [...files.keys()].filter((name) => SHEET_PATH.test(name)).sort((a, b) => XlsxReader.#sheetNumber(a) - XlsxReader.#sheetNumber(b))[0];
    if (!sheetName) throw new Error('Dit bestand bevat geen werkblad');
    const shared = files.has(SHARED_STRINGS) ? XlsxReader.#sharedStrings(await XlsxReader.#text(files.get(SHARED_STRINGS))) : [];
    return XlsxReader.#rows(await XlsxReader.#text(files.get(sheetName)), shared);
  }

  static #sheetNumber(name) {
    return Number(SHEET_PATH.exec(name)[1]);
  }

  /** Leest de inhoudsopgave van de zip: bestandsnaam -> { method, data }. */
  static #entries(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const end = XlsxReader.#findEnd(view);
    const entries = new Map();
    let offset = view.getUint32(end + 16, true);
    for (let i = 0, count = view.getUint16(end + 10, true); i < count; i += 1) {
      if (view.getUint32(offset, true) !== SIG_CENTRAL_ENTRY) throw new Error('Geen geldig .xlsx-bestand');
      const nameLength = view.getUint16(offset + 28, true);
      const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
      entries.set(name, XlsxReader.#entry(bytes, view, offset));
      offset += 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    }
    return entries;
  }

  static #findEnd(view) {
    const lowest = Math.max(0, view.byteLength - 22 - MAX_COMMENT_LENGTH);
    for (let i = view.byteLength - 22; i >= lowest; i -= 1) if (view.getUint32(i, true) === SIG_END_OF_CENTRAL_DIR) return i;
    throw new Error('Geen geldig .xlsx-bestand');
  }

  static #entry(bytes, view, centralOffset) {
    const method = view.getUint16(centralOffset + 10, true);
    const size = view.getUint32(centralOffset + 20, true);
    const local = view.getUint32(centralOffset + 42, true);
    if (view.getUint32(local, true) !== SIG_LOCAL_HEADER) throw new Error('Geen geldig .xlsx-bestand');
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    return { method, data: bytes.subarray(start, start + size) };
  }

  static async #text({ method, data }) {
    if (method === METHOD_STORED) return new TextDecoder().decode(data);
    if (method !== METHOD_DEFLATE) throw new Error('Dit .xlsx-bestand gebruikt een niet-ondersteunde compressie');
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new TextDecoder().decode(await new Response(stream).arrayBuffer());
  }

  static #sharedStrings(xml) {
    return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => XlsxReader.#textOf(match[1]));
  }

  /** Alle <t>-stukken van een cel samengevoegd (ook bij opgemaakte tekst). */
  static #textOf(xml) {
    return [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => XlsxReader.#decode(match[1])).join('');
  }

  static #rows(xml, shared) {
    const rows = [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((row) => XlsxReader.#cells(row[1], shared));
    const width = Math.max(0, ...rows.map((row) => row.length));
    return rows.map((row) => Array.from({ length: width }, (_, i) => row[i] ?? '')).filter((row) => row.some((cell) => cell !== ''));
  }

  static #cells(xml, shared) {
    const cells = [];
    for (const match of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const reference = /\br="([A-Z]+)\d+"/.exec(match[1]);
      if (!reference) continue;
      cells[XlsxReader.#columnIndex(reference[1])] = XlsxReader.#value(match[1], match[2] ?? '', shared);
    }
    return Array.from(cells, (cell) => cell ?? '');
  }

  static #value(attributes, inner, shared) {
    const type = /\bt="([^"]*)"/.exec(attributes)?.[1];
    if (type === 'inlineStr') return XlsxReader.#textOf(inner);
    const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(inner)?.[1];
    if (raw === undefined) return '';
    return type === 's' ? shared[Number(raw)] ?? '' : XlsxReader.#decode(raw);
  }

  /** A = 0, B = 1, ..., Z = 25, AA = 26 */
  static #columnIndex(letters) {
    return [...letters].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  }

  static #decode(text) {
    return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-z]+);/g, (whole, entity) => {
      if (entity[0] === '#') return String.fromCodePoint(entity[1] === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
      return ENTITIES[entity] ?? whole;
    });
  }
}
