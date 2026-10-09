/**
 * Verbindt een toernooi met zijn vorm. Werkt op een kopie van de state,
 * zodat een mislukte actie nooit een half aangepaste state achterlaat.
 */
class TournamentRunner {
  constructor(formats) {
    this.formats = formats;
  }

  start(tournament) {
    return this.#format(tournament).create(tournament.participants, tournament.settings);
  }

  report(tournament, matchId, payload) {
    const state = structuredClone(tournament.state);
    return this.#format(tournament).report(state, matchId, payload, tournament.settings, tournament.participants);
  }

  advance(tournament) {
    const state = structuredClone(tournament.state);
    return this.#format(tournament).advance(state, tournament.participants, tournament.settings);
  }

  canAdvance(tournament) {
    return this.#format(tournament).canAdvance(tournament.state, tournament.settings);
  }

  isFinished(tournament) {
    return this.#format(tournament).isFinished(tournament.state, tournament.settings);
  }

  /** Klassementen met namen ingevuld. */
  standings(tournament) {
    const names = new Map(tournament.participants.map((p) => [p.id, p.name]));
    return this.#format(tournament)
      .standings(tournament.state, tournament.participants, tournament.settings)
      .map((table) => ({ ...table, rows: table.rows.map((row) => ({ ...row, name: names.get(row.pid) || '?' })) }));
  }

  #format(tournament) {
    return this.formats.get(tournament.formatKey);
  }
}

module.exports = TournamentRunner;
