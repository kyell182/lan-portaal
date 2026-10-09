import { h } from './dom.js';

/**
 * Bouwt een formulier uit een veldconfig en leest de waarden terug.
 * Veld: { key, label, type: text|number|textarea|select|multi|checkbox|color|datetime-local, options, required, min, max, step }
 */
export class FormBuilder {
  constructor(fields, values = {}) {
    this.fields = fields;
    this.inputs = new Map();
    this.el = h('div', {}, fields.map((f) => this.#field(f, values[f.key])));
  }

  values() {
    const out = {};
    for (const field of this.fields) out[field.key] = this.#read(field);
    return out;
  }

  #field(field, value) {
    if (field.type === 'checkbox') {
      const input = h('input', { type: 'checkbox', checked: !!(value ?? field.default) });
      this.inputs.set(field.key, input);
      return h('label', { class: 'field check' }, input, h('span', {}, field.label));
    }
    const input = this.#input(field, value ?? field.default ?? '');
    this.inputs.set(field.key, input);
    return h('label', { class: 'field' }, h('span', {}, field.label + (field.required ? ' *' : '')), input);
  }

  #input(field, value) {
    const common = { required: field.required, min: field.min, max: field.max, step: field.step };
    if (field.type === 'textarea') return h('textarea', common, value);
    if (field.type === 'select') {
      const options = [field.required ? null : h('option', { value: '' }, '—'), ...field.options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label))];
      return h('select', common, options);
    }
    if (field.type === 'multi') {
      const selected = new Set(value || []);
      return h('div', { class: 'multi' }, field.options.length
        ? field.options.map((o) => h('label', {}, h('input', { type: 'checkbox', value: o.value, checked: selected.has(o.value) }), o.label))
        : h('span', { class: 'muted' }, 'Nog niets om te kiezen'));
    }
    return h('input', { ...common, type: field.type || 'text', value: value ?? '' });
  }

  #read(field) {
    const input = this.inputs.get(field.key);
    if (field.type === 'checkbox') return input.checked;
    if (field.type === 'multi') return [...input.querySelectorAll('input:checked')].map((i) => i.value);
    if (field.type === 'number') return input.value === '' ? null : Number(input.value);
    return input.value;
  }
}
