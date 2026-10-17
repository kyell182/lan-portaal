const GroupMembers = require('./GroupMembers');
const { MATCH_STATUS } = require('./ResultReview');

// Eindige waarde (geen Infinity) zodat het verschil van twee onbeslisten 0 blijft.
const UNDECIDED = Number.MAX_SAFE_INTEGER;

/**
 * Rangschikt de spelers van één groep over al haar matches.
 * Som van de plaatsen (laagste wint), dan beste enkele plaats, dan de beslissing van de crew (tieBreak).
 * Wie dan nog gelijk staat deelt de plaats.
 */
class GroupRanking {
  /** @returns null zolang niet elke match een volgorde heeft, anders { rows: [{ pid, place }], provisional } */
  static rank(group) {
    const members = GroupMembers.active(group);
    const complete = group.matches.length > 0 && group.matches.every((m) => m.order.length);
    if (!members.length || !complete) return null;

    const rows = members.map((pid) => GroupRanking.#scoreOf(pid, group)).sort(GroupRanking.#compare);
    GroupRanking.#assignPlaces(rows);
    return { rows: rows.map(({ pid, place }) => ({ pid, place })), provisional: group.matches.some((m) => m.status !== MATCH_STATUS.CONFIRMED) };
  }

  /** Wie ontbreekt in een uitslag (afwezig) krijgt de slechtste plaats van die match. */
  static #scoreOf(pid, group) {
    const places = group.matches.map((m) => (m.order.includes(pid) ? m.order.indexOf(pid) + 1 : m.order.length + 1));
    const decided = group.tieBreak.indexOf(pid);
    return { pid, sum: places.reduce((a, b) => a + b, 0), best: Math.min(...places), decided: decided === -1 ? UNDECIDED : decided };
  }

  static #compare(a, b) {
    return (a.sum - b.sum) || (a.best - b.best) || (a.decided - b.decided);
  }

  static #assignPlaces(rows) {
    rows.forEach((row, i) => {
      const previous = rows[i - 1];
      const tied = previous && GroupRanking.#compare(previous, row) === 0;
      row.place = tied ? previous.place : i + 1;
    });
  }
}

module.exports = GroupRanking;
