const StandingsTable = require('../shared/StandingsTable');

/** Klassement van een puntentoernooi: totaal, aantal overwinningen, beste plaats, punten per ronde. */
class PointsStandings {
  static build(rounds, participants, bonusLabel = 'Bonus') {
    const rows = participants.map((p) => PointsStandings.#row(p.id, rounds));
    rows.sort(PointsStandings.#compare);

    const roundColumns = rounds.map((r) => ({ key: `r${r.number}`, label: `R${r.number}` }));
    const table = new StandingsTable('Klassement', [
      ...roundColumns,
      { key: 'bonus', label: bonusLabel },
      { key: 'wins', label: '1ste plaatsen' },
      { key: 'total', label: 'Totaal' },
    ]);
    table.fill(rows, (a, b) => PointsStandings.#compare(a, b) === 0);
    return table.toJSON();
  }

  static #row(pid, rounds) {
    const row = { pid, total: 0, wins: 0, bonus: 0, best: 9999 };
    for (const round of rounds) {
      const entry = round.entries.find((e) => e.pid === pid);
      row[`r${round.number}`] = entry ? entry.points : '-';
      if (!entry) continue;
      row.total += entry.points;
      row.bonus += entry.bonus;
      if (entry.place === 1) row.wins += 1;
      row.best = Math.min(row.best, entry.place);
    }
    return row;
  }

  static #compare(a, b) {
    return (b.total - a.total) || (b.wins - a.wins) || (a.best - b.best);
  }
}

module.exports = PointsStandings;
