import { h, mount } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { Toast } from '../core/Toast.js';
import { Brand } from '../core/Brand.js';

/** Instellingen > Site: de merknaam in de topbalk, het tabblad en de app-naam op telefoons. */
export class SitePage extends Page {
  async load() {
    return api.get('/site');
  }

  draw(site) {
    const mark = h('input', { value: site.mark, maxlength: 12, required: true, 'aria-label': 'Korte naam' });
    const name = h('input', { value: site.name, maxlength: 30, 'aria-label': 'Naam' });
    mount(this.container,
      h('div', { class: 'page-head' }, h('div', {}, h('h2', {}, 'Site'),
        h('div', { class: 'meta' }, 'De naam van jullie LAN-portaal. Leeg laten zet de standaardnaam terug.'))),
      h('form', { class: 'panel', onsubmit: (e) => { e.preventDefault(); this.#save(mark.value, name.value); } },
        h('label', { class: 'field' }, h('span', {}, 'Korte naam (het "logo", max. 12 tekens)'), mark),
        h('label', { class: 'field' }, h('span', {}, 'Naam (max. 30 tekens)'), name),
        h('button', { class: 'btn primary', type: 'submit' }, 'Opslaan')));
  }

  async #save(mark, name) {
    try {
      const saved = await api.put('/site', { mark, name });
      new Brand(' beheer').apply(saved);
      Toast.show('Naam opgeslagen');
      this.reload();
    } catch (err) {
      Toast.error(err);
    }
  }
}
