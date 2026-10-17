const Repository = require('../../core/db/Repository');
const Schema = require('../../core/validation/Schema');

const schema = new Schema({
  mark: { type: 'string', maxLength: 12 },
  name: { type: 'string', maxLength: 30 },
});

/**
 * Merknaam van het portaal (bv. "VIVES" + "LAN"). Wat de admin niet invult, valt terug op SITE_MARK en SITE_NAME uit de omgeving.
 * Bewaard als één document zodat elke organisatie het portaal zijn eigen naam kan geven.
 */
class SiteService {
  constructor(store, events, config) {
    this.repository = new Repository(store, 'site');
    this.events = events;
    this.defaults = { mark: config.siteMark, name: config.siteName };
  }

  get() {
    const saved = this.repository.all()[0] ?? {};
    return { mark: saved.mark || this.defaults.mark, name: saved.name || this.defaults.name };
  }

  /** Lege waarden zetten de naam terug naar de standaard. */
  update(input) {
    const data = schema.validate(input, { partial: true });
    const patch = { mark: data.mark ?? null, name: data.name ?? null };
    const [current] = this.repository.all();
    if (current) this.repository.update(current.id, patch);
    else this.repository.create(patch);
    this.events?.emit('changed', { entity: 'site' });
    return this.get();
  }

  /** Titel voor het browsertabblad en de PWA. */
  title() {
    const { mark, name } = this.get();
    return `${mark} ${name}`.trim();
  }
}

module.exports = SiteService;
