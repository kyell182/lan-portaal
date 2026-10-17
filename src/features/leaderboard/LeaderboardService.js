const LEADERBOARD_FORMAT = 'lan-round';
const SOCIAL_FORMAT = 'scoreboard';
const STATUS_DRAFT = 'draft';
const MATCH_PENDING = new Set(['submitted', 'disputed']);
const NO_TIE_BREAK = Number.MAX_SAFE_INTEGER;

/**
 * Algemeen klassement van een event, zonder eigen opslag: rekent alles uit de toernooien.
 * Telt de LAN-rondes met `countsForOverall`; de scoreboard-toernooien van het event tellen als social bonus.
 * Spelers worden gekoppeld via `participant.refId` (de speler-id), want deelnemer-id's verschillen per toernooi.
 */
class LeaderboardService {
  constructor({ tournaments, players, games, formats, currentEvent }) {
    this.tournaments = tournaments;
    this.players = players;
    this.games = games;
    this.formats = formats;
    this.currentEvent = currentEvent;
  }

  /** @param except toernooi-id dat niet meetelt (bv. de finale waarvoor we de stand willen) */
  overall(eventId, { except = null } = {}) {
    const event = eventId || this.currentEvent();
    const started = this.#ofEvent(event).filter((t) => t.state && t.status !== STATUS_DRAFT && t.id !== except);
    const rounds = started.filter(LeaderboardService.#countsAsRound).sort(LeaderboardService.#byRound);
    const scores = new Map();
    rounds.forEach((t) => this.#addRound(scores, t));
    started.filter((t) => t.formatKey === SOCIAL_FORMAT).forEach((t) => this.#addSocial(scores, t));

    return {
      eventId: event,
      rows: LeaderboardService.#rank([...scores].map(([playerId, score]) => this.#row(playerId, score)).filter(Boolean)),
      rounds: this.schedule(event),
      unconfirmedGroups: rounds.reduce((sum, t) => sum + LeaderboardService.#unconfirmed(t), 0),
    };
  }

  /** Alle rondes van het event (ook nog niet gestarte), voor de kolommen en "volgende ronde". */
  schedule(eventId) {
    return this.#ofEvent(eventId || this.currentEvent())
      .filter(LeaderboardService.#countsAsRound)
      .sort(LeaderboardService.#byRound)
      .map((t, i) => ({
        roundNo: t.roundNo ?? i + 1,
        tournamentId: t.id,
        name: t.name,
        gameName: this.games.findById(t.gameId)?.name ?? null,
        startTime: t.startTime ?? null,
        status: t.status,
      }));
  }

  rankOf(eventId, playerId) {
    const { rows } = this.overall(eventId);
    const row = rows.find((r) => r.playerId === playerId);
    return row ? { place: row.place, total: row.total, of: rows.length, provisional: row.provisional } : null;
  }

  #ofEvent(event) {
    return this.tournaments.filter((t) => (t.eventId ?? null) === (event ?? null));
  }

  #addRound(scores, tournament) {
    const roundNo = tournament.roundNo ?? 0;
    const format = this.formats.get(tournament.formatKey);
    const playerOf = LeaderboardService.#playerOfParticipant(tournament);
    for (const result of format.results(tournament.state, tournament.settings, tournament.participants)) {
      const playerId = playerOf.get(result.pid);
      if (!playerId) continue;
      const score = LeaderboardService.#scoreOf(scores, playerId);
      score.rounds[roundNo] = (score.rounds[roundNo] ?? 0) + result.points;
      score.provisional ||= result.provisional;
    }
  }

  #addSocial(scores, tournament) {
    const playerOf = LeaderboardService.#playerOfParticipant(tournament);
    const [table] = this.formats.get(tournament.formatKey).standings(tournament.state, tournament.participants, tournament.settings);
    for (const row of table.rows) {
      const playerId = playerOf.get(row.pid);
      if (playerId) LeaderboardService.#scoreOf(scores, playerId).social += row.total;
    }
  }

  #row(playerId, score) {
    const player = this.players.findById(playerId);
    if (!player) return null;
    const roundPoints = Object.values(score.rounds);
    return {
      playerId,
      nickname: player.nickname,
      firstName: player.firstName,
      lastName: player.lastName,
      rounds: score.rounds,
      social: score.social,
      total: roundPoints.reduce((a, b) => a + b, 0) + score.social,
      best: Math.max(0, ...roundPoints),
      tieBreakRank: player.tieBreakRank ?? NO_TIE_BREAK,
      provisional: score.provisional,
    };
  }

  /** Totaal, dan beste enkele ronde, dan de uitslag van de tie-break (1-tegen-1). Gelijk = gedeelde plaats. */
  static #rank(rows) {
    const compare = (a, b) => (b.total - a.total) || (b.best - a.best) || (a.tieBreakRank - b.tieBreakRank);
    rows.sort(compare);
    rows.forEach((row, i) => { row.place = i > 0 && compare(rows[i - 1], row) === 0 ? rows[i - 1].place : i + 1; });
    return rows.map(({ tieBreakRank, ...visible }) => visible);
  }

  static #playerOfParticipant(tournament) {
    return new Map(tournament.participants.filter((p) => p.refId).map((p) => [p.id, p.refId]));
  }

  static #scoreOf(scores, playerId) {
    if (!scores.has(playerId)) scores.set(playerId, { rounds: {}, social: 0, provisional: false });
    return scores.get(playerId);
  }

  static #countsAsRound(tournament) {
    return tournament.formatKey === LEADERBOARD_FORMAT && tournament.countsForOverall === true;
  }

  static #byRound(a, b) {
    return (a.roundNo ?? Infinity) - (b.roundNo ?? Infinity);
  }

  /** Groepen met een ingestuurde maar nog niet bevestigde uitslag. */
  static #unconfirmed(tournament) {
    return (tournament.state.groups ?? []).filter((g) => g.matches.some((m) => MATCH_PENDING.has(m.status))).length;
  }
}

module.exports = LeaderboardService;
