const jwt = require('jsonwebtoken');
const HttpError = require('../../core/http/HttpError');

const AUDIENCE = 'player';
const TOKEN_TTL = '8h';

/**
 * Speler-sessie zonder wachtwoord: een ingecheckte speler kiest zijn gamertag, wie eerst kiest wint.
 * De crew kan een naam vrijgeven (claimVersion +1), waardoor de oude cookie ongeldig wordt.
 */
class PlayerAuthService {
  constructor(players, config) {
    this.players = players;
    this.config = config;
  }

  /** Ingecheckte spelers waarvan de naam nog niet gekozen is. */
  available(eventId) {
    const event = eventId || this.players.withDefaultEvent({}).eventId;
    return this.players.list({ eventId: event })
      .filter((p) => p.checkedIn && !p.claimedAt)
      .map((p) => this.players.toPublic(p));
  }

  claim(playerId) {
    const player = this.players.get(playerId);
    if (!player.checkedIn) throw HttpError.forbidden('Je bent nog niet ingecheckt; vraag het aan de crew');
    if (player.claimedAt) throw HttpError.conflict('Deze naam is al gekozen');
    const claimed = this.players.update(playerId, { claimedAt: new Date().toISOString() });
    return { token: this.#sign(claimed), player: this.players.toPublic(claimed) };
  }

  /** De speler achter het token, of null als het ongeldig is of de naam vrijgegeven werd. */
  verify(token) {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret, { audience: AUDIENCE });
      const player = this.players.repository.findById(payload.sub);
      const valid = player && player.claimedAt && (player.claimVersion ?? 0) === payload.ver;
      return valid ? { id: player.id, nickname: player.nickname } : null;
    } catch {
      return null;
    }
  }

  #sign(player) {
    return jwt.sign({ sub: player.id, ver: player.claimVersion ?? 0 }, this.config.jwtSecret, { audience: AUDIENCE, expiresIn: TOKEN_TTL });
  }
}

module.exports = PlayerAuthService;
