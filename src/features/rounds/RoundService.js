const HttpError = require('../../core/http/HttpError');
const RoundLocator = require('./RoundLocator');
const RoundPresenter = require('./RoundPresenter');

const MAX_GAME_NAME_LENGTH = 40;

/**
 * "Mijn ronde": wat een speler van zijn eigen groep ziet en mag doen.
 * Elke actie werkt op de groep van de aangemelde speler zelf, nooit op een groep uit de aanvraag.
 */
class RoundService {
  constructor({ players, tournaments, games, seats }) {
    this.players = players;
    this.tournaments = tournaments;
    this.locator = new RoundLocator(players.repository, tournaments.repository);
    this.presenter = new RoundPresenter({ players: players.repository, games: games.repository, seats: seats.repository });
  }

  me(playerId) {
    return this.presenter.present(this.players.get(playerId), this.locator.find(playerId));
  }

  submitResult(playerId, matchNo, order) {
    return this.#act(playerId, (group, pid) => [`submit:${group.id}:${matchNo}`, { by: pid, order }]);
  }

  confirm(playerId, matchNo) {
    return this.#act(playerId, (group, pid) => [`confirm:${group.id}:${matchNo}`, { by: pid }]);
  }

  dispute(playerId, matchNo, reason) {
    return this.#act(playerId, (group, pid) => [`dispute:${group.id}:${matchNo}`, { by: pid, reason }]);
  }

  setRoom(playerId, room) {
    return this.#act(playerId, (group, pid) => [`room:${group.id}`, { ...room, by: pid }]);
  }

  /** Optionele naam in het spel (bv. Curve Fever geeft Naam#1234), per game bewaard bij de speler. */
  setGameName(playerId, name) {
    const { tournament } = this.#locate(playerId);
    if (!tournament.gameId) throw HttpError.badRequest('Deze ronde heeft geen game');
    const player = this.players.get(playerId);
    const gameNames = { ...player.gameNames, [tournament.gameId]: String(name || '').trim().slice(0, MAX_GAME_NAME_LENGTH) };
    this.players.update(playerId, { gameNames });
    return this.me(playerId);
  }

  #act(playerId, build) {
    const { tournament, participant, group } = this.#locate(playerId);
    const [matchId, payload] = build(group, participant.id);
    this.tournaments.report(tournament.id, matchId, payload);
    return this.me(playerId);
  }

  #locate(playerId) {
    const located = this.locator.find(playerId);
    if (!located) throw HttpError.notFound('Je zit (nog) niet in een groep');
    return located;
  }
}

module.exports = RoundService;
