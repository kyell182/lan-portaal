import { h, mount, formatDate } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { FormBuilder } from '../core/FormBuilder.js';
import { Toast } from '../core/Toast.js';

const HELP = {
  discord: 'In Discord: kanaalinstellingen → Integraties → Webhooks → Nieuwe webhook → Webhook-URL kopiëren.',
  webhook: 'Elke melding wordt als JSON gepost. Met een geheim krijg je een HMAC-SHA256-handtekening in de header X-Lan-Signature.',
};

/** Plugins (integraties) instellen, aanzetten en testen. */
export class PluginsPage extends Page {
  async load() {
    return api.get('/plugins');
  }

  draw(plugins) {
    mount(this.container,
      h('div', { class: 'page-head' },
        h('div', {}, h('h2', {}, 'Plugins'), h('div', { class: 'meta' }, 'Koppel het portaal aan andere apps. Meldingen gaan automatisch de deur uit.'))),
      h('div', { class: 'grid-2' }, plugins.map((p) => this.#panel(p))));
  }

  #panel(plugin) {
    const form = new FormBuilder(this.#fields(plugin), plugin.settings);
    const enabled = h('input', { type: 'checkbox', checked: plugin.enabled });
    const save = async () => {
      try {
        await api.put(`/plugins/${plugin.key}`, { enabled: enabled.checked, settings: form.values() });
        Toast.show(`${plugin.label} opgeslagen`);
        this.reload();
      } catch (err) { Toast.error(err); }
    };
    const testIt = async () => {
      try {
        await api.post(`/plugins/${plugin.key}/test`);
        Toast.show('Testbericht verstuurd');
        this.reload();
      } catch (err) { Toast.error(err); }
    };

    return h('section', { class: 'panel' },
      h('div', { class: 'page-head', style: { marginBottom: '12px' } },
        h('h3', { style: { margin: 0 } }, plugin.label),
        h('span', { class: `status ${plugin.enabled ? 'active' : ''}` }, plugin.enabled ? 'Aan' : 'Uit')),
      h('p', { class: 'muted' }, plugin.description),
      HELP[plugin.key] ? h('p', { class: 'muted', style: { fontSize: '.9rem' } }, HELP[plugin.key]) : null,
      form.el,
      h('label', { class: 'field check' }, enabled, h('span', {}, 'Plugin ingeschakeld')),
      this.#statusLine(plugin),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', onclick: save }, 'Opslaan'),
        h('button', { class: 'btn', onclick: testIt }, 'Testbericht sturen')));
  }

  #fields(plugin) {
    return plugin.fields.map((f) => {
      const secret = plugin.secretFields.includes(f.key);
      return {
        key: f.key,
        label: secret && plugin.secretsSet[f.key] ? `${f.label} (ingesteld, laat leeg om te behouden)` : f.label,
        type: f.type === 'boolean' ? 'checkbox' : (secret ? 'password' : 'text'),
        default: f.default,
      };
    });
  }

  #statusLine(plugin) {
    if (plugin.lastError) return h('p', { style: { color: '#ff8a95' } }, `Laatste fout: ${plugin.lastError}`);
    if (plugin.lastSentAt) return h('p', { class: 'muted' }, `Laatst verstuurd: ${formatDate(plugin.lastSentAt)}`);
    return null;
  }
}
