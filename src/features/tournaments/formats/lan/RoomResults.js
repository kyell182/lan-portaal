const RankBands = require('./RankBands');

/** Ronde-punten van een zaalronde: rangbanden voor de ingevulde top, "rest" voor wie meespeelde maar niet vermeld is. */
class RoomResults {
  /** @returns [{ pid, place, points, provisional }] — leeg zolang er geen uitslag is */
  static compute(state, settings, participants) {
    const { order } = state.room;
    if (!order.length) return [];
    const bands = new RankBands(settings.rankBands);
    const listed = order.map((pid, i) => ({ pid, place: i + 1, points: bands.pointsFor(i + 1), provisional: false }));
    const named = new Set(order);
    const restPlace = order.length + 1;
    const rest = participants.filter((p) => !named.has(p.id)).map((p) => ({ pid: p.id, place: restPlace, points: bands.pointsForRest, provisional: false }));
    return [...listed, ...rest];
  }
}

module.exports = RoomResults;
