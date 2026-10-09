const CrudService = require('../../core/crud/CrudService');
const Repository = require('../../core/db/Repository');
const Schema = require('../../core/validation/Schema');
const HttpError = require('../../core/http/HttpError');

const schema = new Schema({
  name: { type: 'string', required: true, maxLength: 60 },
  tag: { type: 'string', maxLength: 8 },
  playerIds: { type: 'array', default: [] },
  captainId: { type: 'string' },
  color: { type: 'string', maxLength: 9 },
});

/** Teams bestaan uit spelers en zijn bruikbaar in elk toernooi, ongeacht de game. */
class TeamService extends CrudService {
  constructor(store, events, playerRepository) {
    super({ repository: new Repository(store, 'teams'), schema, events, entityName: 'Team' });
    this.players = playerRepository;
    this.onRemoved('players', (playerId) => this.#dropPlayer(playerId));
  }

  beforeSave(data, current) {
    const playerIds = data.playerIds ?? current?.playerIds ?? [];
    const unknown = playerIds.filter((id) => !this.players.findById(id));
    if (unknown.length) throw HttpError.badRequest('Onbekende spelers in team', { playerIds: unknown });
    const captainId = data.captainId ?? current?.captainId;
    if (captainId && !playerIds.includes(captainId)) data.captainId = null;
    return { ...data, playerIds: [...new Set(playerIds)] };
  }

  #dropPlayer(playerId) {
    for (const team of this.repository.filter((t) => t.playerIds.includes(playerId))) {
      this.repository.update(team.id, {
        playerIds: team.playerIds.filter((id) => id !== playerId),
        captainId: team.captainId === playerId ? null : team.captainId,
      });
    }
  }
}

module.exports = TeamService;
