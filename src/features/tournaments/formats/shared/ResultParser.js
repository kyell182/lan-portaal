const HttpError = require('../../../../core/http/HttpError');

/**
 * Zet een ingegeven resultaat om naar scores + winnaar.
 * Payload: { scores: [a, b] } en optioneel { winner: pid } (bv. bij forfait zonder score).
 */
class ResultParser {
  static parse(match, payload, { allowDraws = false } = {}) {
    const [a, b] = match.slots.map((s) => s.pid);
    const scores = ResultParser.#scores(payload);
    const explicit = payload?.winner;

    if (explicit) {
      if (![a, b].includes(explicit)) throw HttpError.badRequest('Winnaar speelt niet in deze match');
      return { scores, winner: explicit, loser: explicit === a ? b : a, draw: false };
    }
    if (!scores) throw HttpError.badRequest('Geef scores of een winnaar op');
    if (scores[0] === scores[1]) {
      if (!allowDraws) throw HttpError.badRequest('Gelijkspel is niet toegestaan in deze vorm');
      return { scores, winner: null, loser: null, draw: true };
    }
    const aWins = scores[0] > scores[1];
    return { scores, winner: aWins ? a : b, loser: aWins ? b : a, draw: false };
  }

  static #scores(payload) {
    const raw = payload?.scores;
    if (!Array.isArray(raw) || raw.length !== 2) return null;
    const scores = raw.map(Number);
    if (scores.some((s) => Number.isNaN(s) || s < 0)) throw HttpError.badRequest('Scores moeten positieve getallen zijn');
    return scores;
  }
}

module.exports = ResultParser;
