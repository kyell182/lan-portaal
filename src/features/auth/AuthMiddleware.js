const HttpError = require('../../core/http/HttpError');

const COOKIE = 'lan_token';
const PLAYER_COOKIE = 'lan_player';

/**
 * Leest de tokens uit de cookies: admin (req.admin) en speler (req.player).
 * attach() is optioneel; require/requirePlayer/requireAdminOrPlayer blokkeren wie niet aangemeld is.
 */
class AuthMiddleware {
  static COOKIE = COOKIE;

  static PLAYER_COOKIE = PLAYER_COOKIE;

  constructor(authService, playerAuth = null) {
    this.authService = authService;
    this.playerAuth = playerAuth;
    this.attach = this.attach.bind(this);
    this.require = this.require.bind(this);
    this.requirePlayer = this.requirePlayer.bind(this);
    this.requireAdminOrPlayer = this.requireAdminOrPlayer.bind(this);
  }

  attach(req, res, next) {
    const token = req.cookies?.[COOKIE];
    const playerToken = req.cookies?.[PLAYER_COOKIE];
    req.admin = token ? this.authService.verify(token) : null;
    req.player = playerToken && this.playerAuth ? this.playerAuth.verify(playerToken) : null;
    next();
  }

  require(req, res, next) {
    if (!req.admin) return next(HttpError.unauthorized());
    return next();
  }

  requirePlayer(req, res, next) {
    if (!req.player) return next(HttpError.unauthorized('Kies eerst je naam'));
    return next();
  }

  requireAdminOrPlayer(req, res, next) {
    if (!req.admin && !req.player) return next(HttpError.unauthorized());
    return next();
  }
}

module.exports = AuthMiddleware;
