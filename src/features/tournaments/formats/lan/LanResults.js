const GroupMembers = require('./GroupMembers');
const GroupRanking = require('./GroupRanking');
const GroupSizeScale = require('./GroupSizeScale');
const RoomResults = require('./RoomResults');

/** Ronde-punten per speler, afgeleid uit de groepen (of uit de zaaluitslag). Punten zijn voorlopig zolang een match niet bevestigd is. */
class LanResults {
  /** @returns [{ pid, groupId, place, points, size, provisional }] — enkel voor groepen met een volledige uitslag */
  static compute(state, settings, participants = []) {
    if (state.mode === 'room') return RoomResults.compute(state, settings, participants);
    const scale = new GroupSizeScale(settings.pointsBySize);
    return state.groups.flatMap((group) => {
      const ranking = GroupRanking.rank(group);
      if (!ranking) return [];
      const size = GroupMembers.active(group).length;
      return ranking.rows.map(({ pid, place }) => ({
        pid, groupId: group.id, place, size, points: scale.pointsFor(size, place), provisional: ranking.provisional,
      }));
    });
  }
}

module.exports = LanResults;
