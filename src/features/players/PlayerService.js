const CrudService = require('../../core/crud/CrudService');
const Repository = require('../../core/db/Repository');
const Schema = require('../../core/validation/Schema');
const HttpError = require('../../core/http/HttpError');
const PlayerNickname = require('./PlayerNickname');
const SocialPlatforms = require('./SocialPlatforms');

const schema = new Schema({
  eventId: { type: 'string' },
  nickname: { type: 'string', required: true, maxLength: 40 },
  firstName: { type: 'string', maxLength: 60 },
  lastName: { type: 'string', maxLength: 60 },
  email: { type: 'string', maxLength: 120 },
  studyProgram: { type: 'string', maxLength: 80 },
  notes: { type: 'string', maxLength: 500 },
  device: { type: 'string', maxLength: 40 },
  socials: { type: 'object', default: {} },
  socialsClaimed: { type: 'array', default: [] },
  checkedIn: { type: 'boolean', default: false },
  checkedInAt: { type: 'string', maxLength: 40 },
  claimedAt: { type: 'string', maxLength: 40 },
  claimVersion: { type: 'integer', default: 0 },
  gameNames: { type: 'object', default: {} },
});

/**
 * Spelers per event. De gamertag (nickname) is uniek per event en gekoppeld aan de echte naam.
 * Publiek zijn enkel gamertag, naam en opleiding zichtbaar; e-mail, toestel en socials niet.
 */
class PlayerService extends CrudService {
  constructor(store, events) {
    super({ repository: new Repository(store, 'players'), schema, events, entityName: 'Speler', filterKeys: ['eventId'] });
  }

  toPublic({ id, nickname, firstName, lastName, studyProgram }) {
    return { id, nickname, firstName, lastName, studyProgram };
  }

  beforeSave(data, current) {
    const eventId = data.eventId ?? current?.eventId ?? null;
    return this.prepare(data, current, this.takenNicknames(eventId, current?.id));
  }

  /** Valideert en normaliseert een speler zonder op te slaan. `taken`: gamertags (kleine letters) die al bezet zijn. */
  prepare(data, current, taken) {
    this.#assertNames(data, current);
    this.#assertNickname(data, current, taken);
    return this.#stampCheckIn(this.#cleanSocials(data), current);
  }

  /** Gamertags (kleine letters) van een event, eventueel zonder één speler (die zichzelf). */
  takenNicknames(eventId, exceptId = null) {
    const players = this.repository.filter((p) => (p.eventId ?? null) === (eventId ?? null) && p.id !== exceptId);
    return new Set(players.map((p) => PlayerNickname.key(p.nickname)));
  }

  /** Valideert een nieuwe speler zonder op te slaan (voor imports). */
  prepareCreate(input, taken) {
    return this.prepare(this.schema.validate(this.withDefaultEvent(input)), null, taken);
  }

  prepareUpdate(current, input, taken) {
    return this.prepare(this.schema.validate(input, { partial: true }), current, taken);
  }

  /** Slaat een geprepareerde batch op met één schrijfbeurt per soort. */
  saveBatch({ create = [], update = [] }) {
    if (create.length) this.repository.createMany(create);
    if (update.length) this.repository.updateMany(update);
    this.events?.emit('changed', { entity: 'players' });
  }

  /** Geeft een gekozen naam weer vrij: oude cookies worden ongeldig. */
  release(id) {
    return this.update(id, { claimedAt: null, claimVersion: (this.get(id).claimVersion ?? 0) + 1 });
  }

  /** Wist alle spelers van een event (privacy na afloop). */
  removeAllOfEvent(eventId) {
    if (!eventId) throw HttpError.badRequest('eventId is verplicht');
    const ids = this.repository.deleteWhere((p) => p.eventId === eventId);
    for (const id of ids) this.events?.emit('removed', { entity: 'players', id });
    this.events?.emit('changed', { entity: 'players' });
    return ids.length;
  }

  #assertNames(data, current) {
    if (current && !('firstName' in data) && !('lastName' in data)) return;
    const merged = { ...current, ...data };
    const errors = {};
    if (!merged.firstName) errors.firstName = 'Verplicht veld';
    if (!merged.lastName) errors.lastName = 'Verplicht veld';
    if (Object.keys(errors).length) throw HttpError.badRequest('Ongeldige invoer', errors);
  }

  #assertNickname(data, current, taken) {
    if (data.nickname === undefined || data.nickname === current?.nickname) return;
    PlayerNickname.assertAllowed(data.nickname, taken);
  }

  #cleanSocials(data) {
    const clean = { ...data };
    if ('socials' in data) clean.socials = SocialPlatforms.cleanUsernames(data.socials);
    if ('socialsClaimed' in data) clean.socialsClaimed = SocialPlatforms.cleanClaimed(data.socialsClaimed);
    return clean;
  }

  #stampCheckIn(data, current) {
    if (data.checkedIn === undefined || data.checkedIn === !!current?.checkedIn) return data;
    return { ...data, checkedInAt: data.checkedIn ? new Date().toISOString() : null };
  }
}

module.exports = PlayerService;
