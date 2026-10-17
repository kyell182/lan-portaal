const CrudService = require('../../core/crud/CrudService');
const Repository = require('../../core/db/Repository');
const Schema = require('../../core/validation/Schema');
const HttpError = require('../../core/http/HttpError');

const schema = new Schema({
  eventId: { type: 'string' },
  zone: { type: 'string', required: true, maxLength: 40 },
  label: { type: 'string', required: true, maxLength: 20 },
  row: { type: 'integer', min: 1, max: 1000, default: 1 },
  col: { type: 'integer', min: 1, max: 1000, default: 1 },
  table: { type: 'string', maxLength: 20 },
  side: { type: 'string', values: ['A', 'B'] },
  playerId: { type: 'string' },
  note: { type: 'string', maxLength: 120 },
});

const bulkSchema = new Schema({
  eventId: { type: 'string' },
  zone: { type: 'string', required: true, maxLength: 40 },
  prefix: { type: 'string', maxLength: 10, default: '' },
  rows: { type: 'integer', required: true, min: 1, max: 300 },
  cols: { type: 'integer', min: 1, max: 100, default: 1 },
  tableSize: { type: 'integer', min: 2, max: 200 },
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

  /**
   * Maakt in één keer plaatsen aan. Standaard een raster, bv. zone "B.104", 4 rijen x 6 kolommen.
   * Met tableSize zijn `rows` het aantal tafels met tableSize plaatsen, de helft aan elke kant (A en B, tegenover elkaar).
   */
  createGrid(input) {
    const options = bulkSchema.validate(this.withDefaultEvent(input));
    const { eventId, zone } = options;
    if (this.repository.filter((s) => s.zone === zone && (s.eventId ?? null) === (eventId ?? null)).length) {
      throw HttpError.conflict(`Zone ${zone} bestaat al`);
    }
    const seats = options.tableSize ? SeatService.#tableSeats(options) : SeatService.#gridSeats(options);
    const created = this.repository.createMany(seats.map((seat) => ({ eventId: eventId ?? null, zone, playerId: null, note: null, ...seat })));
    this.events.emit('changed', { entity: 'seats' });
    return created;
  }

  /** Een speler kiest zelf een vrije plaats; had hij al een plaats in dit event, dan schuift hij door. */
  claim(seatId, playerId) {
    const seat = this.get(seatId);
    if (seat.playerId && seat.playerId !== playerId) throw HttpError.conflict('Deze plaats is al bezet');
    const player = this.players.findById(playerId);
    if (!player) throw HttpError.badRequest('Onbekende speler');
    if ((player.eventId ?? null) !== (seat.eventId ?? null)) throw HttpError.forbidden('Deze plaats hoort bij een ander event');
    this.#freeSeatsOf(playerId, seat.eventId ?? null);
    return this.update(seatId, { playerId });
  }

  release(playerId) {
    this.#freeSeatsOf(playerId);
    this.events.emit('changed', { entity: 'seats' });
  }

  static #gridSeats({ prefix, rows, cols }) {
    const seats = [];
    for (let row = 1; row <= rows; row += 1) {
      const rowName = rows <= 26 ? String.fromCharCode(64 + row) : `${row}.`;
      for (let col = 1; col <= cols; col += 1) seats.push({ label: `${prefix}${rowName}${col}`, row, col });
    }
    return seats;
  }

  /** Per tafel twee rijen (kant A boven, kant B onder) met een lege rij ertussen; labels als T3A2. */
  static #tableSeats({ prefix, rows: tables, tableSize }) {
    const perSide = Math.ceil(tableSize / 2);
    const seats = [];
    for (let number = 1; number <= tables; number += 1) {
      const table = `${prefix}T${number}`;
      ['A', 'B'].forEach((side, sideIndex) => {
        const size = side === 'A' ? perSide : tableSize - perSide;
        for (let col = 1; col <= size; col += 1) seats.push({ label: `${table}${side}${col}`, table, side, row: (number - 1) * 3 + 1 + sideIndex, col });
      });
    }
    return seats;
  }

  removeZone(zone, eventId = null) {
    const inZone = (s) => s.zone === zone && (!eventId || s.eventId === eventId);
    for (const seat of this.repository.filter(inZone)) this.repository.delete(seat.id);
    this.events.emit('changed', { entity: 'seats' });
  }

  #freeSeatsOf(playerId, eventId) {
    const inScope = (s) => s.playerId === playerId && (eventId === undefined || (s.eventId ?? null) === (eventId ?? null));
    for (const seat of this.repository.filter(inScope)) {
      this.repository.update(seat.id, { playerId: null });
    }
  }
}

module.exports = SeatService;
