const HttpError = require('../../../../core/http/HttpError');

const BAND_PATTERN = /^(rest|\d+(?:-\d+)?)\s*=\s*(\d+(?:\.\d+)?)$/i;

/**
 * Punten per rangband voor een zaalronde, onafhankelijk van het aantal spelers:
 * "1=12; 2=10; 3=9; 4-5=8; 6-10=7; 11-20=5; 21-35=4; 36-50=2; rest=1".
 */
class RankBands {
  constructor(text) {
    const bands = RankBands.#parse(text);
    this.ranges = bands.filter((b) => b.from !== null);
    this.restPoints = bands.find((b) => b.from === null)?.points ?? 0;
  }

  /** Gooit een veldfout als de tekst niet bruikbaar is. */
  static validate(text) {
    new RankBands(text);
  }

  pointsFor(place) {
    return this.ranges.find((b) => place >= b.from && place <= b.to)?.points ?? this.restPoints;
  }

  /** Punten voor wie meespeelt maar niet in de uitslag staat. */
  get pointsForRest() {
    return this.restPoints;
  }

  static #parse(text) {
    const bands = String(text || '').split(';').map((p) => p.trim()).filter(Boolean).map(RankBands.#band);
    if (bands.filter((b) => b.from === null).length > 1) throw RankBands.#invalid('"rest" mag maar één keer voorkomen');
    if (!bands.some((b) => b.points > 0)) throw RankBands.#invalid('Geef minstens één band met punten, bv. 1=12; rest=1');
    return bands;
  }

  static #band(part) {
    const match = BAND_PATTERN.exec(part);
    if (!match) throw RankBands.#invalid(`Ongeldige band: "${part}"`);
    const points = Number(match[2]);
    if (match[1].toLowerCase() === 'rest') return { from: null, to: null, points };
    const [from, to = from] = match[1].split('-').map(Number);
    if (from < 1 || to < from) throw RankBands.#invalid(`Ongeldige plaatsen in "${part}"`);
    return { from, to, points };
  }

  static #invalid(message) {
    return HttpError.badRequest('Ongeldige invoer', { rankBands: message });
  }
}

module.exports = RankBands;
