const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const HttpError = require('../../core/http/HttpError');

/** Aanmelden van admins en controleren van hun token. */
class AuthService {
  constructor(adminService, config) {
    this.adminService = adminService;
    this.config = config;
  }

  async login(username, password) {
    const admin = this.adminService.findByUsername(username);
    const ok = admin && (await bcrypt.compare(String(password || ''), admin.passwordHash));
    if (!ok) throw HttpError.unauthorized('Ongeldige gebruikersnaam of wachtwoord');
    const token = jwt.sign({ sub: admin.id, username: admin.username }, this.config.jwtSecret, {
      expiresIn: this.config.tokenTtl,
    });
    return { token, admin: { id: admin.id, username: admin.username } };
  }

  /** Geeft de admin terug of null als het token ongeldig is of de admin niet meer bestaat. */
  verify(token) {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret);
      const admin = this.adminService.repository.findById(payload.sub);
      return admin ? { id: admin.id, username: admin.username } : null;
    } catch {
      return null;
    }
  }
}

module.exports = AuthService;
