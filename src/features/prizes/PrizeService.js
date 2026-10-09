const CrudService = require('../../core/crud/CrudService');
const Repository = require('../../core/db/Repository');
const Schema = require('../../core/validation/Schema');

const schema = new Schema({
  eventId: { type: 'string' },
  name: { type: 'string', required: true, maxLength: 80 },
  kind: { type: 'string', values: ['prijs', 'shop'], default: 'prijs' },
  description: { type: 'string', maxLength: 500 },
  tournamentId: { type: 'string' },
  place: { type: 'integer', min: 1, max: 100 },
  price: { type: 'number', min: 0 },
  quantity: { type: 'integer', min: 0, default: 1 },
  sponsor: { type: 'string', maxLength: 80 },
  imageUrl: { type: 'string', maxLength: 500 },
  awardedTo: { type: 'string', maxLength: 80 },
});

/** Prijzen (per toernooi/plaats) en shop-items (snacks, merch) met prijs en voorraad. */
class PrizeService extends CrudService {
  constructor(store, events) {
    super({ repository: new Repository(store, 'prizes'), schema, events, entityName: 'Prijs', filterKeys: ['eventId'] });
    this.onRemoved('tournaments', (id) => this.#detachTournament(id));
  }

  #detachTournament(tournamentId) {
    for (const prize of this.repository.filter((p) => p.tournamentId === tournamentId)) {
      this.repository.update(prize.id, { tournamentId: null });
    }
  }
}

module.exports = PrizeService;
