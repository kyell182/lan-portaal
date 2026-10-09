const HttpError = require('../../../core/http/HttpError');
const Schema = require('../../../core/validation/Schema');

/**
 * Abstracte basis voor elke toernooivorm.
 * Een vorm beschrijft zijn instellingen (voor templates) en weet hoe hij
 * een state opbouwt, uitslagen verwerkt, doorschuift en een klassement maakt.
 * De state is altijd een gewoon JSON-object zodat ze opgeslagen kan worden.
 */
class TournamentFormat {
  /** Unieke sleutel, bv. 'single-elimination'. */
  get key() { throw new Error('key niet geïmplementeerd'); }

  get label() { throw new Error('label niet geïmplementeerd'); }

  get description() { return ''; }

  /** Velden die in een template aangepast kunnen worden: [{ key, label, type, default, min, max, values }]. */
  get settingsFields() { return []; }

  /** Minimum aantal deelnemers om te starten. */
  get minParticipants() { return 2; }

  /** Vult ontbrekende instellingen aan met defaults en valideert ze. */
  normalizeSettings(settings = {}) {
    const fields = Object.fromEntries(this.settingsFields.map((f) => [f.key, f]));
    return new Schema(fields).validate(settings);
  }

  describe() {
    return { key: this.key, label: this.label, description: this.description, fields: this.settingsFields };
  }

  assertParticipants(participants) {
    if (participants.length < this.minParticipants) {
      throw HttpError.badRequest(`Minstens ${this.minParticipants} deelnemers nodig`);
    }
  }

  // eslint-disable-next-line no-unused-vars
  create(participants, settings) { throw new Error('create niet geïmplementeerd'); }

  // eslint-disable-next-line no-unused-vars
  report(state, matchId, payload, settings) { throw new Error('report niet geïmplementeerd'); }

  // eslint-disable-next-line no-unused-vars
  standings(state, participants, settings) { throw new Error('standings niet geïmplementeerd'); }

  /** Volgende ronde/fase genereren (Swiss, poules → knock-out, puntentoernooi). */
  // eslint-disable-next-line no-unused-vars
  advance(state, participants, settings) {
    throw HttpError.badRequest('Deze vorm heeft geen volgende ronde');
  }

  // eslint-disable-next-line no-unused-vars
  canAdvance(state, settings) { return false; }

  // eslint-disable-next-line no-unused-vars
  isFinished(state, settings) { return false; }
}

module.exports = TournamentFormat;
