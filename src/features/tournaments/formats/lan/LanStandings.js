const StandingsTable = require('../shared/StandingsTable');
const GroupMembers = require('./GroupMembers');
const LanResults = require('./LanResults');

const NO_RESULT = '-';

/** Klassement van één LAN-ronde: alle spelers die meespelen, met punten zodra hun groep een uitslag heeft. */
class LanStandings {
  static build(state, settings) {
    const results = new Map(LanResults.compute(state, settings).map((r) => [r.pid, r]));
    const rows = state.groups.flatMap((group) => GroupMembers.active(group).map((pid) => LanStandings.#row(pid, group, results.get(pid))));
    rows.sort(LanStandings.#compare);

    const table = new StandingsTable('Ronde', [
      { key: 'group', label: 'Groep' },
      { key: 'groupPlace', label: 'Plaats in groep' },
      { key: 'points', label: 'Punten' },
      { key: 'status', label: 'Status' },
    ]);
    table.fill(rows, (a, b) => a.points !== NO_RESULT && LanStandings.#compare(a, b) === 0);
    return table.toJSON();
  }

  static #row(pid, group, result) {
    return {
      pid,
      group: group.name,
      groupPlace: result ? result.place : NO_RESULT,
      points: result ? result.points : NO_RESULT,
      status: result ? (result.provisional ? 'voorlopig' : 'definitief') : '',
    };
  }

  static #compare(a, b) {
    const pointsA = a.points === NO_RESULT ? -1 : a.points;
    const pointsB = b.points === NO_RESULT ? -1 : b.points;
    return (pointsB - pointsA) || (LanStandings.#rank(a) - LanStandings.#rank(b));
  }

  static #rank(row) {
    return row.groupPlace === NO_RESULT ? Infinity : row.groupPlace;
  }
}

module.exports = LanStandings;
