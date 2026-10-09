const CrudService = require('../../core/crud/CrudService');
const Repository = require('../../core/db/Repository');
const Schema = require('../../core/validation/Schema');
const defaultTemplates = require('./defaultTemplates');

const schema = new Schema({
  name: { type: 'string', required: true, maxLength: 80 },
  formatKey: { type: 'string', required: true },
  participantType: { type: 'string', values: ['team', 'player'], default: 'team' },
  description: { type: 'string', maxLength: 500 },
  settings: { type: 'object', default: {} },
});

/** Templates = een toernooivorm + vooraf ingestelde, vrij aanpasbare instellingen. */
class TemplateService extends CrudService {
  constructor(store, events, formats) {
    super({ repository: new Repository(store, 'templates'), schema, events, entityName: 'Template' });
    this.formats = formats;
  }

  beforeSave(data, current) {
    const formatKey = data.formatKey ?? current?.formatKey;
    const format = this.formats.get(formatKey);
    const changedFormat = current && data.formatKey && data.formatKey !== current.formatKey;
    const base = changedFormat ? {} : current?.settings ?? {};
    return { ...data, settings: format.normalizeSettings({ ...base, ...(data.settings || {}) }) };
  }

  duplicate(id) {
    const { name, formatKey, participantType, description, settings } = this.get(id);
    return this.create({ name: `${name} (kopie)`, formatKey, participantType, description, settings });
  }

  seed() {
    if (this.repository.count() > 0) return;
    defaultTemplates.forEach((template) => this.create(template));
  }
}

module.exports = TemplateService;
