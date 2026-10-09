const bcrypt = require('bcryptjs');
const HttpError = require('../../core/http/HttpError');
const Schema = require('../../core/validation/Schema');

const createSchema = new Schema({
  username: { type: 'string', required: true, maxLength: 40 },
  password: { type: 'string', required: true, maxLength: 200 },
});

/** Beheer van admin-accounts. Wachtwoorden worden enkel gehasht bewaard. */
class AdminService {
  constructor(repository) {
    this.repository = repository;
  }

  list() {
    return this.repository.all().map((a) => this.#safe(a));
  }

  findByUsername(username) {
    const name = String(username || '').toLowerCase();
    return this.repository.all().find((a) => a.username.toLowerCase() === name) || null;
  }

  async create(input) {
    const { username, password } = createSchema.validate(input);
    this.#assertStrong(password);
    if (this.findByUsername(username)) throw HttpError.conflict('Gebruikersnaam bestaat al');
    const passwordHash = await bcrypt.hash(password, 12);
    return this.#safe(this.repository.create({ username, passwordHash }));
  }

  async changePassword(id, password) {
    this.#assertStrong(password);
    if (!this.repository.findById(id)) throw HttpError.notFound('Admin niet gevonden');
    const passwordHash = await bcrypt.hash(password, 12);
    this.repository.update(id, { passwordHash });
  }

  remove(id, currentAdminId) {
    if (id === currentAdminId) throw HttpError.badRequest('Je kan jezelf niet verwijderen');
    if (this.repository.count() <= 1) throw HttpError.badRequest('Er moet minstens één admin blijven');
    if (!this.repository.delete(id)) throw HttpError.notFound('Admin niet gevonden');
  }

  /** Maakt de eerste admin aan uit de omgevingsvariabelen als er nog geen is. */
  async seed(username, password) {
    if (this.repository.count() > 0) return;
    if (!password) {
      console.warn('[admins] Geen ADMIN_PASSWORD ingesteld: er is nog geen admin-account.');
      return;
    }
    await this.create({ username, password });
    console.log(`[admins] Eerste admin "${username}" aangemaakt.`);
  }

  #assertStrong(password) {
    if (String(password || '').length < 8) throw HttpError.badRequest('Wachtwoord moet minstens 8 tekens hebben');
  }

  #safe({ passwordHash, ...rest }) {
    return rest;
  }
}

module.exports = AdminService;
