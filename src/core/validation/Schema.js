const HttpError = require('../http/HttpError');
const FieldRules = require('./FieldRules');

/**
 * Beschrijft de velden van een entiteit en valideert/schoont input op.
 * Voorbeeld: new Schema({ name: { type: 'string', required: true, maxLength: 80 } })
 */
class Schema {
  constructor(fields) {
    this.fields = fields;
  }

  /** Valideert input. Met partial=true worden enkel meegegeven velden gecontroleerd (voor updates). */
  validate(input = {}, { partial = false } = {}) {
    const clean = {};
    const errors = {};

    for (const [key, rule] of Object.entries(this.fields)) {
      const present = input[key] !== undefined && input[key] !== null && input[key] !== '';
      if (!present) {
        const cleared = key in input;
        if (rule.required && (cleared || !partial)) errors[key] = 'Verplicht veld';
        else if (cleared) clean[key] = rule.default !== undefined ? structuredClone(rule.default) : null;
        else if (!partial && rule.default !== undefined) clean[key] = structuredClone(rule.default);
        continue;
      }
      const result = FieldRules.check(rule, input[key]);
      if (result.error) errors[key] = result.error;
      else clean[key] = result.value;
    }

    if (Object.keys(errors).length) throw HttpError.badRequest('Ongeldige invoer', errors);
    return clean;
  }
}

module.exports = Schema;
