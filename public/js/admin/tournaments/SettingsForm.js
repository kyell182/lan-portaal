import { h } from '../../core/dom.js';
import { FormBuilder } from '../../core/FormBuilder.js';

const TYPE_MAP = { integer: 'number', number: 'number', boolean: 'checkbox', string: 'text' };

/**
 * Formulier voor de instellingen van een toernooivorm.
 * Wisselt van velden wanneer een andere vorm gekozen wordt.
 */
export class SettingsForm {
  constructor(formats, formatKey, values = {}) {
    this.formats = formats;
    this.el = h('div', {});
    this.show(formatKey, values);
  }

  show(formatKey, values = {}) {
    const format = this.formats.find((f) => f.key === formatKey);
    this.form = null;
    if (!format) return this.el.replaceChildren();
    const fields = format.fields.map((f) => ({
      key: f.key, label: f.label, type: TYPE_MAP[f.type] || 'text', min: f.min, max: f.max, default: f.default,
      step: f.type === 'number' ? 'any' : undefined,
    }));
    this.form = new FormBuilder(fields, values);
    this.el.replaceChildren(
      h('h3', {}, 'Instellingen'),
      format.description ? h('p', { class: 'muted' }, format.description) : null,
      this.form.el,
    );
    return this;
  }

  values() {
    return this.form ? this.form.values() : {};
  }
}
