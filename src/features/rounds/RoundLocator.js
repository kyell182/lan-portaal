const STATUS_DRAFT = 'draft';
const FORMAT_KEY = 'lan-round';
const ROOM_MODE = 'room';

/** Zoekt de lopende LAN-ronde van een speler: het toernooi, zijn deelnemer-id en zijn groep. */
class RoundLocator {
  constructor(playersRepository, tournamentsRepository) {
    this.players = playersRepository;
    this.tournaments = tournamentsRepository;
  }

  /** @returns { tournament, participant, group } of null als de speler in geen enkele groep zit */
  find(playerId) {
    const player = this.players.findById(playerId);
    if (!player) return null;
    const found = this.tournaments
      .filter((t) => t.formatKey === FORMAT_KEY && t.status !== STATUS_DRAFT && t.state && (t.eventId ?? null) === (player.eventId ?? null))
      .map((tournament) => RoundLocator.#membership(tournament, playerId))
      .filter(Boolean);
    return RoundLocator.#current(found);
  }

  static #membership(tournament, playerId) {
    const participant = tournament.participants.find((p) => p.refId === playerId);
    if (!participant) return null;
    if (tournament.state.mode === ROOM_MODE) return { tournament, participant, group: null };
    const group = tournament.state.groups.find((g) => g.pids.includes(participant.id) && !g.removed.includes(participant.id));
    return group ? { tournament, participant, group } : null;
  }

  /** De eerstvolgende niet-gesloten ronde, anders de laatst gesloten ronde. */
  static #current(found) {
    const byRound = (a, b) => (a.tournament.roundNo ?? Infinity) - (b.tournament.roundNo ?? Infinity);
    const open = found.filter((f) => !f.tournament.state.closed).sort(byRound);
    if (open.length) return open[0];
    return [...found].sort(byRound).pop() ?? null;
  }
}

module.exports = RoundLocator;
