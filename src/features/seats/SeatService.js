const CrudService = require('../../core/crud/CrudService');
const Repository = require('../../core/db/Repository');
const Schema = require('../../core/validation/Schema');
const HttpError = require('../../core/http/HttpError');

const schema = new Schema({
  eventId: { type: 'string' },
  zone: { type: 'string', required: true, maxLength: 40 },
  label: { type: 'string', required: true, maxLength: 20 },
  row: { type: 'integer', min: 1, max: 100, default: 1 },
  col: { type: 'integer', min: 1, max: 100, default: 1 },
  playerId: { type: 'string' },
  note: { type: 'string', maxLength: 120 },
});

const bulkSchema = new Schema({
  eventId: { type: 'string' },
  zone: { type: 'string', required: true, maxLength: 40 },
  prefix: { type: 'string', maxLength: 10, default: '' },
  rows: { type: 'integer', required: true, min: 1, max: 50 },
  cols: { type: 'integer', required: true, min: 1, max: 50 },
});

/** Zitplaatsen per event en zone (lokaal/tafelrij) in een raster, toe te wijzen aan spelers. */
class SeatService extends CrudService {
  constructor(store, events, playerRepository) {
    super({ repository: new Repository(store, 'seats'), schema, events, entityName: 'Plaats', filterKeys: ['eventId'] });
    this.players = playerRepository;
    this.onRemoved('players', (playerId) => this.#freeSeatsOf(playerId));
  }

  beforeSave(data, current) {
    if (!data.playerId) return data;
    if (!this.players.findById(data.playerId)) throw HttpError.badRequest('Onbekende speler');
    const eventId = data.eventId ?? current?.eventId ?? null;
    const taken = this.repository.all().find((s) => s.playerId === data.playerId && s.id !== current?.id && (s.eventId ?? null) === eventId);
    if (taken) throw HttpError.conflict(`Speler zit al op plaats ${taken.label}`);
    return data;
  }

  /** Maakt in één keer een raster plaatsen aan, bv. zone "B.104", 4 rijen x 6 kolommen. */
  createGrid(input) {
    const { eventId, zone, prefix, rows, cols } = bulkSchema.validate(this.withDefaultEvent(input));
    if (this.repository.filter((s) => s.zone === zone && (s.eventId ?? null) === (eventId ?? null)).length) {
      throw HttpError.conflict(`Zone ${zone} bestaat al`);
    }
    const created = [];
    for (let row = 1; row <= rows; row += 1) {
      for (let col = 1; col <= cols; col += 1) {
        const rowName = rows <= 26 ? String.fromCharCode(64 + row) : `${row}.`;
        const label = `${prefix}${rowName}${col}`;
        created.push(this.repository.create({ eventId: eventId ?? null, zone, label, row, col, playerId: null, note: null }));
      }
    }
    this.events.emit('changed', { entity: 'seats' });
    return created;
  }

  removeZone(zone, eventId = null) {
    const inZone = (s) => s.zone === zone && (!eventId || s.eventId === eventId);
    for (const seat of this.repository.filter(inZone)) this.repository.delete(seat.id);
    this.events.emit('changed', { entity: 'seats' });
  }

  #freeSeatsOf(playerId) {
    for (const seat of this.repository.filter((s) => s.playerId === playerId)) {
      this.repository.update(seat.id, { playerId: null });
    }
  }
}

module.exports = SeatService;
