const StandingsTable = require('../shared/StandingsTable');

/** Klassement van een scorebord: punten per criterium en het totaal. */
class ScoreboardStandings {
  static build(state, participants) {
    const rows = participants.map((p) => ScoreboardStandings.#row(p.id, state));
    rows.sort((a, b) => b.total - a.total);

    const table = new StandingsTable('Klassement', [
      ...state.criteria.map((c) => ({ key: c.id, label: c.label })),
      { key: 'total', label: 'Totaal' },
    ]);
    table.fill(rows, (a, b) => a.total === b.total);
    return table.toJSON();
  }

  /** Punten voor één criterium: aantal × gewicht, het aantal wordt afgetopt op het maximum. */
  static pointsFor(criterion, amount) {
    const counted = criterion.max === null ? amount : Math.min(amount, criterion.max);
    return counted * criterion.weight;
  }

  static #row(pid, state) {
    const values = state.scores[pid] || {};
    const row = { pid, total: 0 };
    for (const criterion of state.criteria) {
      row[criterion.id] = ScoreboardStandings.pointsFor(criterion, values[criterion.id] || 0);
      row.total += row[criterion.id];
    }
    return row;
  }
}

module.exports = ScoreboardStandings;
