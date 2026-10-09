const HttpError = require('../../core/http/HttpError');

const COOKIE = 'lan_token';

/** Leest het token uit de cookie. attach() is optioneel, require() blokkeert niet-admins. */
class AuthMiddleware {
  static COOKIE = COOKIE;

  constructor(authService) {
    this.authService = authService;
    this.attach = this.attach.bind(this);
    this.require = this.require.bind(this);
  }

  attach(req, res, next) {
    const token = req.cookies?.[COOKIE];
    req.admin = token ? this.authService.verify(token) : null;
    next();
  }

  require(req, res, next) {
    if (!req.admin) return next(HttpError.unauthorized());
    return next();
  }
}

module.exports = AuthMiddleware;
