/** Controleert één waarde tegen één veldregel. Geeft { value } of { error } terug. */
class FieldRules {
  static check(rule, raw) {
    const checker = FieldRules.#checkers[rule.type];
    if (!checker) return { error: `Onbekend type ${rule.type}` };
    return checker(rule, raw);
  }

  static #checkers = {
    string: (rule, raw) => {
      const value = String(raw).trim();
      if (rule.maxLength && value.length > rule.maxLength) return { error: `Max ${rule.maxLength} tekens` };
      if (rule.values && !rule.values.includes(value)) return { error: `Kies uit: ${rule.values.join(', ')}` };
      return { value };
    },
    number: (rule, raw) => FieldRules.#numeric(rule, raw, false),
    integer: (rule, raw) => FieldRules.#numeric(rule, raw, true),
    boolean: (rule, raw) => ({ value: raw === true || raw === 'true' || raw === 'on' || raw === 1 }),
    array: (rule, raw) => {
      if (!Array.isArray(raw)) return { error: 'Moet een lijst zijn' };
      return { value: raw.map((v) => (rule.of === 'number' ? Number(v) : String(v))) };
    },
    object: (rule, raw) => {
      if (typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Moet een object zijn' };
      return { value: raw };
    },
  };

  static #numeric(rule, raw, integer) {
    const value = Number(raw);
    if (Number.isNaN(value)) return { error: 'Moet een getal zijn' };
    if (integer && !Number.isInteger(value)) return { error: 'Moet een geheel getal zijn' };
    if (rule.min !== undefined && value < rule.min) return { error: `Minimum ${rule.min}` };
    if (rule.max !== undefined && value > rule.max) return { error: `Maximum ${rule.max}` };
    return { value };
  }
}

module.exports = FieldRules;
