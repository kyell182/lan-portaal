const CrudService = require('../../core/crud/CrudService');
const Repository = require('../../core/db/Repository');
const Schema = require('../../core/validation/Schema');

const schema = new Schema({
  name: { type: 'string', required: true, maxLength: 80 },
  shortName: { type: 'string', maxLength: 12 },
  teamSize: { type: 'integer', min: 1, max: 20, default: 1 },
  platform: { type: 'string', maxLength: 40, default: 'PC' },
  color: { type: 'string', maxLength: 9, default: '#E2001A' },
  description: { type: 'string', maxLength: 500 },
});

/** Games waarin toernooien gespeeld worden (CS2, LoL, Rocket League...). */
class GameService extends CrudService {
  constructor(store, events) {
    super({ repository: new Repository(store, 'games'), schema, events, entityName: 'Game' });
  }
}

module.exports = GameService;
