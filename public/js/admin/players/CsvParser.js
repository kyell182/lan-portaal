const CANDIDATE_DELIMITERS = [';', ',', '\t'];

/** Kleine CSV-parser (aanhalingstekens, komma/puntkomma/tab, BOM). Geeft rijen van cellen terug. */
export class CsvParser {
  static parse(text) {
    const clean = text.replace(/^\uFEFF/, '');
    const delimiter = CsvParser.#detectDelimiter(clean);
    return CsvParser.#readRows(clean, delimiter).filter((row) => row.some((cell) => cell.trim() !== ''));
  }

  /** Het scheidingsteken dat het vaakst voorkomt buiten aanhalingstekens op de eerste regel. */
  static #detectDelimiter(text) {
    const firstLine = CsvParser.#firstLine(text);
    const counts = CANDIDATE_DELIMITERS.map((d) => firstLine.split(d).length - 1);
    return CANDIDATE_DELIMITERS[counts.indexOf(Math.max(...counts))];
  }

  static #firstLine(text) {
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      if (text[i] === '"') quoted = !quoted;
      if (!quoted && (text[i] === '\n' || text[i] === '\r')) return text.slice(0, i).replace(/"[^"]*"/g, '');
    }
    return text.replace(/"[^"]*"/g, '');
  }

  static #readRows(text, delimiter) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    const endCell = () => { row.push(cell); cell = ''; };
    const endRow = () => { endCell(); rows.push(row); row = []; };

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quoted) {
        if (char !== '"') cell += char;
        else if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === delimiter) endCell();
      else if (char === '\n') endRow();
      else if (char !== '\r') cell += char;
    }
    if (cell !== '' || row.length) endRow();
    return rows;
  }
}
