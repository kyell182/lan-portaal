import { IMPORT_FIELDS } from './ImportFields.js';

const STORAGE_KEY = 'lan-import-mapping';

/** Koppelt velden aan kolomnummers: eerst de onthouden keuze, anders een gok op basis van de kolomnaam. */
export class ColumnMapping {
  /** @returns {Object<string, number|null>} veldsleutel → kolomindex */
  static suggest(headers) {
    const remembered = ColumnMapping.#recall();
    const used = new Set();
    const mapping = {};
    for (const field of IMPORT_FIELDS) {
      const index = ColumnMapping.#find(field, headers, remembered[field.key], used);
      mapping[field.key] = index;
      if (index !== null) used.add(index);
    }
    return mapping;
  }

  static remember(mapping, headers) {
    const byHeader = {};
    for (const [key, index] of Object.entries(mapping)) if (index !== null) byHeader[key] = headers[index];
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(byHeader)); } catch { /* opslag niet beschikbaar */ }
  }

  static #find(field, headers, rememberedHeader, used) {
    const free = (i) => i >= 0 && !used.has(i);
    const exact = headers.indexOf(rememberedHeader);
    if (rememberedHeader && free(exact)) return exact;
    const guess = headers.findIndex((header, i) => free(i) && field.keywords.some((k) => header.toLowerCase().includes(k)));
    return guess >= 0 ? guess : null;
  }

  static #recall() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
}
