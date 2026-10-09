const CrudService = require('../../core/crud/CrudService');
const Repository = require('../../core/db/Repository');
const Schema = require('../../core/validation/Schema');

const schema = new Schema({
  nickname: { type: 'string', required: true, maxLength: 40 },
  firstName: { type: 'string', maxLength: 60 },
  lastName: { type: 'string', maxLength: 60 },
  email: { type: 'string', maxLength: 120 },
  studyProgram: { type: 'string', maxLength: 80 },
  notes: { type: 'string', maxLength: 500 },
});

/** Spelers. Publiek zien we enkel de nickname en opleiding (privacy). */
class PlayerService extends CrudService {
  constructor(store, events) {
    super({ repository: new Repository(store, 'players'), schema, events, entityName: 'Speler' });
  }

  toPublic({ id, nickname, studyProgram }) {
    return { id, nickname, studyProgram };
  }
}

module.exports = PlayerService;
