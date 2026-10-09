const path = require('path');
const crypto = require('crypto');

/** Leest alle instellingen één keer uit de omgeving. */
class Config {
  constructor(env = process.env) {
    this.port = Number(env.PORT) || 3000;
    this.dataDir = env.DATA_DIR || path.join(process.cwd(), 'data');
    this.adminUsername = env.ADMIN_USERNAME || 'admin';
    this.adminPassword = env.ADMIN_PASSWORD || '';
    this.cookieSecure = env.COOKIE_SECURE === 'true';
    this.jwtSecret = env.JWT_SECRET || this.#fallbackSecret();
    this.tokenTtl = '12h';
    this.publicUrl = env.PUBLIC_URL || '';
  }

  #fallbackSecret() {
    console.warn('[config] JWT_SECRET ontbreekt: tijdelijke sleutel gebruikt (sessies verlopen bij herstart).');
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = Config;
