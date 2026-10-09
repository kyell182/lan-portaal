import { h, mount } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { Modal } from '../core/Modal.js';
import { FormBuilder } from '../core/FormBuilder.js';
import { Toast } from '../core/Toast.js';
import { SettingsForm } from './tournaments/SettingsForm.js';

/** Templates: een toernooivorm met vooraf ingestelde, aanpasbare instellingen. */
export class TemplatesPage extends Page {
  get watches() { return ['templates']; }

  async load() {
    const [templates, formats] = await Promise.all([api.get('/templates'), api.get('/templates/formats')]);
    return { templates, formats };
  }

  draw({ templates, formats }) {
    this.formats = formats;
    const label = (key) => formats.find((f) => f.key === key)?.label || key;
    mount(this.container,
      h('div', { class: 'page-head' },
        h('div', {}, h('h2', {}, 'Templates'), h('div', { class: 'meta' }, 'Kies bij een nieuw toernooi een template; de instellingen blijven daarna nog aanpasbaar.')),
        h('button', { class: 'btn primary', onclick: () => this.edit() }, 'Template toevoegen')),
      h('div', { class: 'table-scroll' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Naam'), h('th', {}, 'Vorm'), h('th', {}, 'Deelnemers'), h('th', {}))),
        h('tbody', {}, templates.map((t) => h('tr', {},
          h('td', {}, h('strong', {}, t.name), t.description ? h('div', { class: 'muted' }, t.description) : null),
          h('td', {}, label(t.formatKey)),
          h('td', {}, t.participantType === 'team' ? 'Teams' : 'Spelers'),
          h('td', { class: 'num' }, h('div', { class: 'actions', style: { justifyContent: 'flex-end' } },
            h('button', { class: 'btn small', onclick: () => this.#duplicate(t) }, 'Dupliceren'),
            h('button', { class: 'btn small', onclick: () => this.edit(t) }, 'Bewerken'),
            h('button', { class: 'btn small danger', onclick: () => this.#remove(t) }, 'Verwijderen')))))))));
  }

  edit(template = null) {
    const formatOptions = this.formats.map((f) => ({ value: f.key, label: f.label }));
    const base = new FormBuilder([
      { key: 'name', label: 'Naam', required: true },
      { key: 'formatKey', label: 'Toernooivorm', type: 'select', required: true, options: formatOptions },
      { key: 'participantType', label: 'Deelnemers zijn', type: 'select', required: true, default: 'team', options: [{ value: 'team', label: 'Teams' }, { value: 'player', label: 'Spelers' }] },
      { key: 'description', label: 'Beschrijving', type: 'textarea' },
    ], template || { formatKey: this.formats[0].key });
    const settings = new SettingsForm(this.formats, template?.formatKey || this.formats[0].key, template?.settings);
    base.inputs.get('formatKey').addEventListener('change', (e) => settings.show(e.target.value));

    new Modal({
      title: template ? 'Template bewerken' : 'Template toevoegen',
      body: h('div', {}, base.el, settings.el),
      onSubmit: async () => {
        const body = { ...base.values(), settings: settings.values() };
        if (template) await api.put(`/templates/${template.id}`, body);
        else await api.post('/templates', body);
        Toast.show('Template opgeslagen');
        this.reload();
      },
      onError: (err) => Toast.error(err),
    }).open();
  }

  async #duplicate(t) {
    try {
      await api.post(`/templates/${t.id}/duplicate`);
      this.reload();
    } catch (err) { Toast.error(err); }
  }

  async #remove(t) {
    if (!confirm(`Template "${t.name}" verwijderen? Bestaande toernooien blijven ongewijzigd.`)) return;
    try {
      await api.delete(`/templates/${t.id}`);
      this.reload();
    } catch (err) { Toast.error(err); }
  }
}
