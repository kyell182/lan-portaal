const Schema = require('../../core/validation/Schema');

/** Meldingen waarop elke plugin kan reageren (aan/uit per plugin). */
const NOTIFY_FIELDS = [
  { key: 'notifyEvent', label: 'Melden wanneer een event actief wordt', type: 'boolean', default: true },
  { key: 'notifyStart', label: 'Melden wanneer een toernooi start', type: 'boolean', default: true },
  { key: 'notifyResults', label: 'Elke uitslag melden', type: 'boolean', default: true },
  { key: 'notifyWinner', label: 'Winnaar melden als een toernooi afgelopen is', type: 'boolean', default: true },
];

const TOGGLE_FOR = {
  'event.activated': 'notifyEvent',
  'tournament.started': 'notifyStart',
  'match.reported': 'notifyResults',
  'round.reported': 'notifyResults',
  'tournament.finished': 'notifyWinner',
};

/**
 * Abstracte basis voor een integratie (Discord, webhook...).
 * Een plugin beschrijft zijn instellingen en zet een domeinmelding om in een bericht.
 */
class Plugin {
  get key() { throw new Error('key niet geïmplementeerd'); }

  get label() { throw new Error('label niet geïmplementeerd'); }

  get description() { return ''; }

  /** Eigen velden (bv. webhook-URL); de meldings-toggles komen er automatisch bij. */
  get ownFields() { return []; }

  /** Velden die nooit terug naar de browser gaan (enkel "ingesteld: ja/nee"). */
  get secretFields() { return []; }

  get settingsFields() {
    return [...this.ownFields, ...NOTIFY_FIELDS];
  }

  normalizeSettings(settings = {}) {
    const fields = Object.fromEntries(this.settingsFields.map((f) => [f.key, f]));
    return new Schema(fields).validate(settings);
  }

  wants(type, settings) {
    const toggle = TOGGLE_FOR[type];
    return !!toggle && settings[toggle] !== false;
  }

  describe() {
    return { key: this.key, label: this.label, description: this.description, fields: this.settingsFields, secretFields: this.secretFields };
  }

  // eslint-disable-next-line no-unused-vars
  async send(message, settings) { throw new Error('send niet geïmplementeerd'); }

  /** Stuurt een testbericht om de instellingen te controleren. */
  async test(settings) {
    return this.send({ type: 'test', title: 'Testbericht van het VIVES LAN-portaal', text: 'Als je dit ziet, werkt de koppeling.' }, settings);
  }
}

module.exports = Plugin;
