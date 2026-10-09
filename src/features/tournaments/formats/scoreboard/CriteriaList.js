const HttpError = require('../../../../core/http/HttpError');

const MAX_CRITERIA = 20;
const MAX_LABEL_LENGTH = 40;
const PAIR_SEPARATOR = ';';
const WEIGHT_SEPARATOR = '=';

/**
 * De criteria van een scorebord (bv. "Social gelikt", 5 punten per eenheid, max 3 eenheden).
 * Een criterium: { id, label, weight, max } — max = null betekent onbeperkt.
 */
class CriteriaList {
  /** Zet de instelling "Aanwezigheid=10; Social gelikt=5" om naar criteria zonder id. */
  static parse(text) {
    return String(text || '')
      .split(PAIR_SEPARATOR)
      .map((pair) => pair.trim())
      .filter(Boolean)
      .map((pair) => {
        const [label, weight] = pair.split(WEIGHT_SEPARATOR);
        return { label, weight: weight === undefined ? 1 : weight };
      });
  }

  /** Valideert een lijst; bestaande ids blijven behouden zodat al toegekende punten bij hun criterium blijven. */
  static normalize(list, existing = []) {
    if (!Array.isArray(list)) throw HttpError.badRequest('Criteria moeten een lijst zijn');
    if (list.length > MAX_CRITERIA) throw HttpError.badRequest(`Maximaal ${MAX_CRITERIA} criteria`);
    const known = new Set(existing.map((c) => c.id));
    let counter = existing.reduce((highest, c) => Math.max(highest, Number(c.id.slice(1))), 0);
    return list.map((item) => {
      const id = known.has(item?.id) ? item.id : `c${++counter}`;
      return CriteriaList.#criterion(id, item);
    });
  }

  static #criterion(id, item) {
    const label = String(item?.label ?? '').trim();
    if (!label) throw HttpError.badRequest('Elk criterium heeft een naam nodig');
    if (label.length > MAX_LABEL_LENGTH) throw HttpError.badRequest(`Naam van een criterium: max ${MAX_LABEL_LENGTH} tekens`);
    const weight = Number(item.weight);
    if (!Number.isFinite(weight)) throw HttpError.badRequest(`Punten per eenheid van "${label}" moet een getal zijn`);
    return { id, label, weight, max: CriteriaList.#max(item.max, label) };
  }

  static #max(raw, label) {
    if (raw === '' || raw === null || raw === undefined) return null;
    const max = Number(raw);
    if (!Number.isFinite(max) || max < 0) throw HttpError.badRequest(`Maximum van "${label}" moet een positief getal zijn`);
    return max;
  }
}

module.exports = CriteriaList;
