import { h, mount } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { Modal } from '../core/Modal.js';
import { FormBuilder } from '../core/FormBuilder.js';
import { Toast } from '../core/Toast.js';
import { adminEventContext } from './context.js';

/**
 * Generieke beheerpagina (lijst + toevoegen/bewerken/verwijderen) op basis van een resource-config:
 * { title, singular, endpoint, scoped, watches, loadContext(), columns: [{ label, value(item, ctx) }], fields(ctx) }
 * scoped = true: items horen bij het gekozen event (lijst gefilterd, nieuwe items krijgen eventId).
 */
export class CrudPage extends Page {
  static for(resource) {
    return class extends CrudPage {
      constructor() { super(resource); }
    };
  }

  constructor(resource) {
    super();
    this.r = resource;
  }

  get watches() { return this.r.watches || [this.r.endpoint.slice(1)]; }

  async load() {
    const listUrl = this.r.endpoint + (this.r.scoped ? adminEventContext.query() : '');
    const [items, ctx] = await Promise.all([api.get(listUrl), this.r.loadContext?.() ?? {}]);
    return { items: this.r.sort ? [...items].sort(this.r.sort) : items, ctx };
  }

  draw({ items, ctx }) {
    this.ctx = ctx;
    mount(this.container,
      h('div', { class: 'page-head' },
        h('div', {}, h('h2', {}, this.r.title), this.r.intro ? h('div', { class: 'meta' }, this.r.intro) : null),
        h('div', { class: 'actions' }, this.r.extraActions?.(this) ?? null,
          h('button', { class: 'btn primary', onclick: () => this.edit() }, `${this.r.singular} toevoegen`))),
      items.length ? this.#table(items) : h('div', { class: 'empty' }, `Nog geen ${this.r.title.toLowerCase()}. Voeg er een toe om te beginnen.`));
  }

  edit(item = null) {
    const form = new FormBuilder(this.r.fields(this.ctx), item || {});
    new Modal({
      title: item ? `${this.r.singular} bewerken` : `${this.r.singular} toevoegen`,
      body: form.el,
      submitLabel: item ? 'Wijzigingen opslaan' : 'Toevoegen',
      onSubmit: async () => {
        const values = this.r.beforeSubmit ? this.r.beforeSubmit(form.values()) : form.values();
        if (item) await api.put(`${this.r.endpoint}/${item.id}`, values);
        else await api.post(this.r.endpoint, this.r.scoped ? { ...values, eventId: adminEventContext.id } : values);
        Toast.show(item ? 'Opgeslagen' : 'Toegevoegd');
        this.reload();
      },
      onError: (err) => Toast.error(err),
    }).open();
  }

  async remove(item) {
    const name = this.r.columns[0].value(item, this.ctx);
    if (!confirm(`"${name}" verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;
    try {
      await api.delete(`${this.r.endpoint}/${item.id}`);
      Toast.show('Verwijderd');
      this.reload();
    } catch (err) {
      Toast.error(err);
    }
  }

  #table(items) {
    return h('div', { class: 'table-scroll' }, h('table', { class: 'data' },
      h('thead', {}, h('tr', {}, this.r.columns.map((c) => h('th', {}, c.label)), h('th', {}))),
      h('tbody', {}, items.map((item) => h('tr', {},
        this.r.columns.map((c) => h('td', {}, c.value(item, this.ctx) ?? '')),
        h('td', { class: 'num' }, h('div', { class: 'actions', style: { justifyContent: 'flex-end' } },
          this.r.rowActions?.(item, this) ?? null,
          h('button', { class: 'btn small', onclick: () => this.edit(item) }, 'Bewerken'),
          h('button', { class: 'btn small danger', onclick: () => this.remove(item) }, 'Verwijderen'))))))));
  }
}
