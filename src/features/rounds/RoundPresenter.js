const GroupMembers = require('../tournaments/formats/lan/GroupMembers');
const LanResults = require('../tournaments/formats/lan/LanResults');
const { CHECK } = require('../tournaments/formats/lan/ResultReview');

/** Bouwt het kleine antwoord van "Mijn ronde": enkel de groep van de speler zelf. */
class RoundPresenter {
  constructor({ players, games, seats }) {
    this.players = players;
    this.games = games;
    this.seats = seats;
  }

  present(player, located) {
    const base = { player: RoundPresenter.#nameOf(player) };
    if (!located) return { ...base, round: null };
    const { tournament, participant, group } = located;
    if (!group) return { ...base, round: this.#roomRound(tournament, participant, player) };
    const members = GroupMembers.active(group).map((pid) => this.#member(pid, tournament, group));
    const iAmHost = group.hostPid === participant.id;
    return { ...base, round: {
      tournamentId: tournament.id,
      name: tournament.name,
      roundNo: tournament.roundNo ?? null,
      startTime: tournament.startTime ?? null,
      closed: !!tournament.state.closed,
      myPid: participant.id,
      iAmHost,
      game: this.#game(tournament.gameId),
      myGameName: tournament.gameId ? player.gameNames?.[tournament.gameId] ?? '' : '',
      seat: this.#seat(player.id),
      group: { id: group.id, name: group.name, members, host: members.find((m) => m.isHost) ?? null, room: group.room },
      matches: group.matches.map((match) => RoundPresenter.#match(match, group, participant.id, iAmHost, tournament.settings.autoConfirmSeconds)),
      myResult: LanResults.compute(tournament.state, tournament.settings, tournament.participants).find((r) => r.pid === participant.id) ?? null,
    } };
  }

  /** Zaalronde: geen groep, wel de gedeelde room-info van de crew en mijn plaats. */
  #roomRound(tournament, participant, player) {
    const { state } = tournament;
    return {
      mode: 'room',
      tournamentId: tournament.id,
      name: tournament.name,
      roundNo: tournament.roundNo ?? null,
      startTime: tournament.startTime ?? null,
      closed: !!state.closed,
      myPid: participant.id,
      game: this.#game(tournament.gameId),
      myGameName: tournament.gameId ? player.gameNames?.[tournament.gameId] ?? '' : '',
      seat: this.#seat(player.id),
      room: state.room.info,
      hasResult: state.room.order.length > 0,
      iReported: state.room.reports.some((r) => r.pid === participant.id),
      myResult: LanResults.compute(state, tournament.settings, tournament.participants).find((r) => r.pid === participant.id) ?? null,
    };
  }

  #member(pid, tournament, group) {
    const participant = tournament.participants.find((p) => p.id === pid);
    const player = this.players.findById(participant?.refId);
    const name = player ? RoundPresenter.#nameOf(player) : { nickname: participant?.name ?? '?' };
    return { pid, ...name, isHost: pid === group.hostPid };
  }

  #game(gameId) {
    return this.games.findById(gameId) ?? null;
  }

  #seat(playerId) {
    const seat = this.seats.filter((s) => s.playerId === playerId)[0];
    return seat ? { zone: seat.zone, label: seat.label, table: seat.table ?? null, side: seat.side ?? null } : null;
  }

  /** Meldingen met reden zijn alleen voor de host; de rest ziet enkel hoeveel er zijn. */
  static #match(match, group, myPid, iAmHost, autoConfirmSeconds) {
    const reviewers = GroupMembers.reviewers(group);
    return {
      no: match.no,
      status: match.status,
      confirmedBy: match.confirmedBy,
      order: match.order,
      proofUrl: match.proofUrl ?? null,
      myCheck: match.checks[myPid] ?? null,
      canCheck: reviewers.includes(myPid),
      checkedCount: reviewers.filter((pid) => match.checks[pid]).length,
      reviewerCount: reviewers.length,
      reportCount: match.reports.length,
      reports: iAmHost ? match.reports.map(({ pid, reason }) => ({ pid, reason })) : [],
      autoConfirmAt: RoundPresenter.#autoConfirmAt(match, autoConfirmSeconds),
      okCount: reviewers.filter((pid) => match.checks[pid] === CHECK.OK).length,
    };
  }

  /** Tijdstip waarop de uitslag vanzelf bevestigd wordt als niemand meldt, of null. */
  static #autoConfirmAt(match, seconds) {
    if (!(seconds > 0) || match.status !== 'submitted' || match.reports.length) return null;
    return new Date(Date.parse(match.submittedAt) + seconds * 1000).toISOString();
  }

  static #nameOf({ id, nickname, firstName, lastName }) {
    return { id, nickname, firstName, lastName };
  }
}

module.exports = RoundPresenter;
