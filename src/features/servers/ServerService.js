const CrudService = require('../../core/crud/CrudService');
const Repository = require('../../core/db/Repository');
const Schema = require('../../core/validation/Schema');

const schema = new Schema({
  eventId: { type: 'string' },
  name: { type: 'string', required: true, maxLength: 80 },
  address: { type: 'string', maxLength: 120 },
  imageUrl: { type: 'string', maxLength: 500 },
  description: { type: 'string', maxLength: 500 },
  details: { type: 'string', maxLength: 1000 },
  password: { type: 'string', maxLength: 120 },
  order: { type: 'integer', min: 0, max: 999, default: 0 },
});

/** Servers en andere gegevens buiten de toernooien om (bv. Minecraft), getoond als tegels.
 *  Het wachtwoord zien enkel admins en ingelogde spelers; de rest krijgt alleen `hasPassword`. */
class ServerService extends CrudService {
  constructor(store, events) {
    super({ repository: new Repository(store, 'servers'), schema, events, entityName: 'Server', filterKeys: ['eventId'] });
  }

  present(item, isAdmin, isPlayer = false) {
    if (isAdmin) return item;
    const { password, ...visible } = item;
    return isPlayer ? { ...visible, password } : { ...visible, hasPassword: !!password };
  }
}

module.exports = ServerService;
