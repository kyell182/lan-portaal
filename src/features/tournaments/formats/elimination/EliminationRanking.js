const StandingsTable = require('../shared/StandingsTable');
const { BYE, STATUS } = require('../shared/constants');

/**
 * Rangschikt deelnemers in een knock-out op basis van waar ze uitgeschakeld werden.
 * eliminations: Map pid → diepte (hoe later uitgeschakeld, hoe hoger). Kampioen = Infinity.
 */
class EliminationRanking {
  static table(title, participants, matches, eliminations) {
    const stats = EliminationRanking.#stats(participants, matches);
    const rows = participants.map((p) => {
      const depth = eliminations.get(p.id);
      return { pid: p.id, depth: depth ?? null, wins: stats.get(p.id).wins, losses: stats.get(p.id).losses, status: EliminationRanking.#status(depth) };
    });
    rows.sort((a, b) => EliminationRanking.#value(b) - EliminationRanking.#value(a));

    const table = new StandingsTable(title, [
      { key: 'wins', label: 'W' },
      { key: 'losses', label: 'V' },
      { key: 'status', label: 'Status' },
    ]);
    table.fill(rows, (prev, row) => prev.depth === row.depth && row.depth !== Infinity);
    table.rows.forEach((row) => { if (row.depth === null) row.place = null; });
    return table.toJSON();
  }

  static #value(row) {
    if (row.depth === null) return Number.MAX_SAFE_INTEGER - 1; // nog in de race
    return row.depth === Infinity ? Number.MAX_SAFE_INTEGER : row.depth;
  }

  static #status(depth) {
    if (depth === Infinity) return '🏆 Winnaar';
    return depth === null || depth === undefined ? 'Nog in de race' : 'Uitgeschakeld';
  }

  static #stats(participants, matches) {
    const stats = new Map(participants.map((p) => [p.id, { wins: 0, losses: 0 }]));
    for (const m of matches) {
      if (m.status !== STATUS.DONE || m.auto || m.loser === BYE) continue;
      if (stats.has(m.winner)) stats.get(m.winner).wins += 1;
      if (stats.has(m.loser)) stats.get(m.loser).losses += 1;
    }
    return stats;
  }
}

module.exports = EliminationRanking;
