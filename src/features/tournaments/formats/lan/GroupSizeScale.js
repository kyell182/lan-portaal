const HttpError = require('../../../../core/http/HttpError');
const PointsScale = require('../points/PointsScale');

/**
 * Punten per plaats, met een tabel per groepsgrootte: "8=10,7,5,3,1,1,1,1; 7=10,6,4,2,1,1,1".
 * Bestaat er geen tabel voor een grootte, dan wordt de dichtstbijzijnde grotere tabel afgekapt
 * (of, bij een groep die groter is dan alle tabellen, de grootste tabel verlengd met haar laatste waarde).
 */
class GroupSizeScale {
  constructor(text) {
    this.scales = GroupSizeScale.#parse(text);
  }

  /** Gooit een veldfout als de tekst niet bruikbaar is. */
  static validate(text) {
    new GroupSizeScale(text);
  }

  pointsFor(size, place) {
    const scale = this.#scaleFor(size);
    return scale.pointsFor(Math.min(place, scale.values.length));
  }

  #scaleFor(size) {
    const sizes = [...this.scales.keys()].sort((a, b) => a - b);
    const exact = this.scales.get(size);
    if (exact) return exact;
    const larger = sizes.find((s) => s > size);
    if (larger) return new PointsScale(this.scales.get(larger).values.slice(0, size).join(','));
    return this.scales.get(sizes[sizes.length - 1]);
  }

  static #parse(text) {
    const scales = new Map();
    for (const part of String(text || '').split(';').map((p) => p.trim()).filter(Boolean)) {
      const [size, table] = GroupSizeScale.#split(part);
      scales.set(size, GroupSizeScale.#scale(table, part));
    }
    if (!scales.size) throw GroupSizeScale.#invalid('Geef minstens één tabel op, bv. 8=10,7,5,3,1');
    return scales;
  }

  static #split(part) {
    const [left, table] = part.split('=');
    const size = Number(left);
    if (!Number.isInteger(size) || size < 1 || table === undefined) throw GroupSizeScale.#invalid(`Ongeldige tabel: "${part}"`);
    return [size, table];
  }

  static #scale(table, part) {
    const scale = new PointsScale(table);
    const raw = table.split(/[,\s]+/).filter(Boolean);
    if (!scale.values.length || scale.values.length !== raw.length) throw GroupSizeScale.#invalid(`Ongeldige punten in "${part}"`);
    if (!(scale.values[0] > 0)) throw GroupSizeScale.#invalid(`De winnaar moet punten krijgen in "${part}"`);
    return scale;
  }

  static #invalid(message) {
    return HttpError.badRequest('Ongeldige invoer', { pointsBySize: message });
  }
}

module.exports = GroupSizeScale;
