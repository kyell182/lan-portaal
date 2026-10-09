const StandingsTable = require('../shared/StandingsTable');
const { BYE, STATUS } = require('../shared/constants');

/** Competitieklassement: punten, saldo, gescoord. Optioneel met Buchholz (Swiss). */
class LeagueTable {
  constructor(settings, { buchholz = false } = {}) {
    this.settings = settings;
    this.buchholz = buchholz;
  }

  build(title, participants, matches) {
    const rows = new Map(participants.map((p) => [p.id, LeagueTable.#emptyRow(p.id)]));
    for (const m of matches) {
      if (m.status === STATUS.DONE) this.#apply(rows, m);
    }
    if (this.buchholz) this.#addBuchholz(rows);

    const sorted = [...rows.values()].sort((a, b) => this.#compare(a, b));
    for (const row of sorted) {
      row.diff = row.scoreFor - row.scoreAgainst;
      delete row.opponents;
    }
    const table = new StandingsTable(title, this.#columns());
    table.fill(sorted, (a, b) => this.#compare(a, b) === 0);
    return table.toJSON();
  }

  static #emptyRow(pid) {
    return { pid, played: 0, wins: 0, draws: 0, losses: 0, scoreFor: 0, scoreAgainst: 0, points: 0, opponents: [], buchholz: 0 };
  }

  #apply(rows, m) {
    const [a, b] = m.slots;
    if (a.pid === BYE || b.pid === BYE) {
      const real = rows.get(a.pid === BYE ? b.pid : a.pid);
      if (real) Object.assign(real, { wins: real.wins + 1, points: real.points + this.settings.pointsWin });
      return;
    }
    const ra = rows.get(a.pid);
    const rb = rows.get(b.pid);
    if (!ra || !rb) return;
    this.#score(ra, rb, a.score ?? 0, b.score ?? 0, m);
    this.#score(rb, ra, b.score ?? 0, a.score ?? 0, m);
  }

  #score(row, other, own, against, m) {
    row.played += 1;
    row.scoreFor += own;
    row.scoreAgainst += against;
    row.opponents.push(other.pid);
    if (m.draw) {
      row.draws += 1;
      row.points += this.settings.pointsDraw;
    } else if (m.winner === row.pid) {
      row.wins += 1;
      row.points += this.settings.pointsWin;
    } else {
      row.losses += 1;
      row.points += this.settings.pointsLoss;
    }
  }

  #addBuchholz(rows) {
    for (const row of rows.values()) {
      row.buchholz = row.opponents.reduce((sum, pid) => sum + (rows.get(pid)?.points || 0), 0);
    }
  }

  #compare(a, b) {
    return (b.points - a.points)
      || (this.buchholz ? b.buchholz - a.buchholz : 0)
      || ((b.scoreFor - b.scoreAgainst) - (a.scoreFor - a.scoreAgainst))
      || (b.scoreFor - a.scoreFor);
  }

  #columns() {
    const cols = [
      { key: 'played', label: 'G' },
      { key: 'wins', label: 'W' },
      { key: 'draws', label: 'G=' },
      { key: 'losses', label: 'V' },
      { key: 'scoreFor', label: '+' },
      { key: 'scoreAgainst', label: '-' },
      { key: 'diff', label: '+/-' },
    ];
    if (this.buchholz) cols.push({ key: 'buchholz', label: 'Buchholz' });
    cols.push({ key: 'points', label: 'Ptn' });
    return cols;
  }
}

module.exports = LeagueTable;
