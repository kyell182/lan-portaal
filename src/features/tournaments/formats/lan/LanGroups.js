const HttpError = require('../../../../core/http/HttpError');
const BalancedGroups = require('./BalancedGroups');
const SeatSeparation = require('./SeatSeparation');
const GroupMembers = require('./GroupMembers');
const { ResultReview, MATCH_STATUS } = require('./ResultReview');

const MIN_ATTEMPTS = 200;
const ATTEMPTS_PER_PLAYER = 5;
const MAX_ATTEMPTS = 20000;
const ROOM_FIELDS = Object.freeze({ code: 60, link: 300, password: 60, note: 300 });

/** Bewerkingen op de groepen in de state: genereren, host, roominfo, no-shows en beslissingen van de crew. */
class LanGroups {
  constructor(rng = Math.random) {
    this.rng = rng;
  }

  /** Maakt de groepen. Opnieuw genereren kan enkel zolang er nog geen uitslag is ingestuurd. */
  generate(state, participants, settings, payload = {}) {
    if (state.groups.some((g) => g.matches.some((m) => m.status !== MATCH_STATUS.OPEN))) {
      throw HttpError.conflict('Er is al een uitslag ingestuurd; groepen kunnen niet meer opnieuw gegenereerd worden');
    }
    const standingOrder = LanGroups.#standingOrder(settings, payload);
    const pids = participants.map((p) => p.id);
    const built = BalancedGroups.build({
      pids, maxGroupSize: settings.maxGroupSize, groupCount: settings.groupCount, seeding: settings.seeding, standingOrder, rng: this.rng,
    });
    const { lists, conflicts } = this.#separated(built, settings, payload.seatsByPid);
    const avoid = new Set(payload.avoidHostPids || []);
    return { ...state, seatConflicts: conflicts, groups: lists.map((list, i) => this.#newGroup(i + 1, list, settings.matchesPerGroup, avoid)) };
  }

  /** Groepsleden niet naast of tegenover elkaar (alleen bij willekeurige indeling). conflicts = null als niet van toepassing. */
  #separated(lists, settings, seatsByPid) {
    const separation = new SeatSeparation(seatsByPid);
    if (!settings.avoidScreenPeek || settings.seeding !== 'random' || !separation.hasSeats) return { lists, conflicts: null };
    const attempts = Math.min(MAX_ATTEMPTS, MIN_ATTEMPTS + ATTEMPTS_PER_PLAYER * lists.flat().length);
    const improved = separation.improve(lists, { rng: this.rng, attempts });
    return { lists: improved, conflicts: separation.total(improved) };
  }

  setHost(group, pid) {
    if (!GroupMembers.active(group).includes(pid)) throw HttpError.badRequest('De host moet in de groep zitten');
    group.hostPid = pid;
    group.matches.forEach((match) => ResultReview.evaluate(match, group));
  }

  setRoom(group, payload) {
    for (const [field, maxLength] of Object.entries(ROOM_FIELDS)) {
      if (payload?.[field] !== undefined) group.room[field] = String(payload[field]).trim().slice(0, maxLength);
    }
  }

  /** No-show: de speler verdwijnt uit de groep, zonder te herschudden. */
  removePlayer(group, pid) {
    if (!GroupMembers.active(group).includes(pid)) throw HttpError.badRequest('Deze speler zit niet (meer) in de groep');
    group.removed.push(pid);
    if (group.hostPid === pid) group.hostPid = null;
    group.matches.forEach((match) => ResultReview.dropPlayer(match, group, pid));
  }

  /** De crew beslist een gelijke stand: spelers in volgorde van beste naar slechtste. */
  setTieBreak(group, order) {
    const active = new Set(GroupMembers.active(group));
    if (!Array.isArray(order) || order.some((pid) => !active.has(pid))) throw HttpError.badRequest('Ongeldige volgorde voor de beslissing');
    group.tieBreak = [...order];
  }

  #newGroup(number, pids, matchCount, avoid) {
    return {
      id: `g${number}`,
      name: `Groep ${number}`,
      pids,
      hostPid: this.#pickHost(pids, avoid),
      room: { code: '', link: '', password: '', note: '' },
      removed: [],
      tieBreak: [],
      matches: Array.from({ length: matchCount }, (_, i) => ResultReview.newMatch(i + 1)),
    };
  }

  /** Bij voorkeur iemand die nog niet host was (best effort). */
  #pickHost(pids, avoid) {
    const fresh = pids.filter((pid) => !avoid.has(pid));
    const pool = fresh.length ? fresh : pids;
    return pool[Math.floor(this.rng() * pool.length)] ?? null;
  }

  static #standingOrder(settings, payload) {
    if (settings.seeding !== 'standing') return [];
    if (!Array.isArray(payload.standingOrder)) throw HttpError.badRequest('Voor indeling op stand is de huidige stand nodig');
    return payload.standingOrder;
  }
}

module.exports = LanGroups;
