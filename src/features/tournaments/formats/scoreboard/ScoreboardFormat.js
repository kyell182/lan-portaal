const TournamentFormat = require('../TournamentFormat');
const HttpError = require('../../../../core/http/HttpError');
const CriteriaList = require('./CriteriaList');
const ScoreboardStandings = require('./ScoreboardStandings');

/** Acties die de admin op een scorebord uitvoert (het "matchId" van de uitslag-route). */
const ACTION = Object.freeze({ CRITERIA: 'criteria', SCORES: 'scores', STATUS: 'status' });

/**
 * Scorebord: geen matches, de admin kent zelf punten toe per deelnemer en per criterium
 * (bv. social gelikt, gevolgd, aanwezigheid). De criteria blijven aanpasbaar tijdens het toernooi.
 */
class ScoreboardFormat extends TournamentFormat {
  get key() { return 'scoreboard'; }

  get label() { return 'Scorebord (vrije punten)'; }

  get description() { return 'Admins kennen zelf punten toe per criterium (bv. social, aanwezigheid). Criteria zijn altijd aanpasbaar.'; }

  get minParticipants() { return 1; }

  get settingsFields() {
    return [
      { key: 'criteria', label: 'Startcriteria (naam=punten per eenheid, gescheiden door ;)', type: 'string', maxLength: 600, default: 'Aanwezigheid=10; Social gelikt=5; Social gevolgd=5' },
    ];
  }

  create(participants, settings) {
    this.assertParticipants(participants);
    return { criteria: CriteriaList.normalize(CriteriaList.parse(settings.criteria)), scores: {}, finished: false, matches: [] };
  }

  /** action: 'criteria' | 'scores' | 'status'. De payload hangt af van de actie. */
  report(state, action, payload, settings, participants) {
    if (action === ACTION.CRITERIA) return this.#setCriteria(state, payload);
    if (action === ACTION.SCORES) return this.#setScores(state, payload, participants);
    if (action === ACTION.STATUS) return { ...state, finished: payload?.finished === true };
    throw HttpError.notFound('Onbekende actie voor een scorebord');
  }

  standings(state, participants) {
    return [ScoreboardStandings.build(state, participants)];
  }

  isFinished(state) {
    return state.finished === true;
  }

  #setCriteria(state, payload) {
    const criteria = CriteriaList.normalize(payload?.criteria, state.criteria);
    const kept = new Set(criteria.map((c) => c.id));
    const scores = Object.fromEntries(Object.entries(state.scores).map(([pid, values]) => [
      pid, Object.fromEntries(Object.entries(values).filter(([id]) => kept.has(id))),
    ]));
    return { ...state, criteria, scores };
  }

  /** payload: { entries: [{ pid, values: { [criteriumId]: aantal } }] } — vervangt de waarden van die deelnemers. */
  #setScores(state, payload, participants) {
    const known = new Set(participants.map((p) => p.id));
    const scores = { ...state.scores };
    for (const entry of Array.isArray(payload?.entries) ? payload.entries : []) {
      if (!known.has(entry?.pid)) throw HttpError.badRequest('Onbekende deelnemer in resultaat');
      scores[entry.pid] = this.#amounts(entry.values, state.criteria);
    }
    return { ...state, scores };
  }

  #amounts(values, criteria) {
    const amounts = {};
    for (const criterion of criteria) {
      const raw = values?.[criterion.id];
      if (raw === '' || raw === null || raw === undefined) continue;
      const amount = Number(raw);
      if (!Number.isFinite(amount)) throw HttpError.badRequest(`Waarde van "${criterion.label}" moet een getal zijn`);
      amounts[criterion.id] = amount;
    }
    return amounts;
  }
}

module.exports = ScoreboardFormat;
