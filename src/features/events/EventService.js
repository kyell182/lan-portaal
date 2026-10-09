const CrudService = require('../../core/crud/CrudService');
const Repository = require('../../core/db/Repository');
const Schema = require('../../core/validation/Schema');
const HttpError = require('../../core/http/HttpError');

const schema = new Schema({
  name: { type: 'string', required: true, maxLength: 80 },
  tagline: { type: 'string', maxLength: 140 },
  startDate: { type: 'string', maxLength: 40 },
  endDate: { type: 'string', maxLength: 40 },
  location: { type: 'string', maxLength: 120 },
  description: { type: 'string', maxLength: 2000 },
  discordUrl: { type: 'string', maxLength: 300 },
  active: { type: 'boolean', default: false },
});

/**
 * Events = LAN-edities (bv. "VIVES LAN Winter 2026"). Toernooien, zitplan en prijzen
 * horen bij één event; games, teams en spelers zijn gedeeld over alle edities.
 * Er is altijd hoogstens één actief event: dat toont de publieke site standaard.
 */
class EventService extends CrudService {
  /** @param children repositories van entiteiten die een eventId hebben */
  constructor(store, events, children) {
    super({ repository: new Repository(store, 'events'), schema, events, entityName: 'Event' });
    this.children = children;
  }

  create(input) {
    const first = this.repository.count() === 0;
    const item = super.create({ ...input, active: first ? true : input.active });
    if (first) this.#adoptOrphans(item.id);
    if (item.active) this.#activated(item);
    return item;
  }

  update(id, input) {
    const wasActive = this.get(id).active;
    const item = super.update(id, input);
    if (item.active && !wasActive) this.#activated(item);
    return item;
  }

  #activated(item) {
    this.#deactivateOthers(item.id);
    this.events.emit('domain', { type: 'event.activated', event: item });
  }

  beforeSave(data) {
    if (data.discordUrl && !/^https:\/\/(discord\.gg|discord\.com)\//.test(data.discordUrl)) {
      throw HttpError.badRequest('Ongeldige invoer', { discordUrl: 'Gebruik een link van discord.gg of discord.com' });
    }
    return data;
  }

  activate(id) {
    return this.update(id, { active: true });
  }

  /** Het actieve event, of anders het meest recente. */
  current() {
    const all = this.repository.all();
    return all.find((e) => e.active)
      || [...all].sort((a, b) => String(b.startDate || b.createdAt).localeCompare(String(a.startDate || a.createdAt)))[0]
      || null;
  }

  beforeRemove(event) {
    const used = Object.entries(this.children).filter(([, repo]) => repo.filter((x) => x.eventId === event.id).length);
    if (used.length) {
      throw HttpError.conflict(`Dit event bevat nog ${used.map(([name]) => name).join(', ')}. Verwijder of verplaats die eerst.`);
    }
  }

  /** Bij het eerste event: bestaande toernooien, plaatsen en prijzen zonder event komen hierin. */
  #adoptOrphans(eventId) {
    for (const repo of Object.values(this.children)) {
      for (const item of repo.filter((x) => !x.eventId)) repo.update(item.id, { eventId });
    }
    this.events.emit('changed', { entity: 'tournaments' });
  }

  #deactivateOthers(id) {
    for (const other of this.repository.filter((e) => e.active && e.id !== id)) {
      this.repository.update(other.id, { active: false });
    }
  }
}

module.exports = EventService;
