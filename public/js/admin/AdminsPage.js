import { h, mount } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { Modal } from '../core/Modal.js';
import { FormBuilder } from '../core/FormBuilder.js';
import { Toast } from '../core/Toast.js';

/** Admin-accounts beheren. */
export class AdminsPage extends Page {
  async load() {
    return api.get('/admins');
  }

  draw(admins) {
    mount(this.container,
      h('div', { class: 'page-head' },
        h('div', {}, h('h2', {}, 'Admins'), h('div', { class: 'meta' }, 'Iedereen hier kan alles beheren. Wachtwoorden zijn minstens 8 tekens.')),
        h('button', { class: 'btn primary', onclick: () => this.#create() }, 'Admin toevoegen')),
      h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Gebruikersnaam'), h('th', {}))),
        h('tbody', {}, admins.map((a) => h('tr', {},
          h('td', {}, a.username),
          h('td', { class: 'num' }, h('div', { class: 'actions', style: { justifyContent: 'flex-end' } },
            h('button', { class: 'btn small', onclick: () => this.#password(a) }, 'Wachtwoord wijzigen'),
            h('button', { class: 'btn small danger', onclick: () => this.#remove(a) }, 'Verwijderen'))))))));
  }

  #create() {
    const form = new FormBuilder([
      { key: 'username', label: 'Gebruikersnaam', required: true },
      { key: 'password', label: 'Wachtwoord', type: 'password', required: true },
    ]);
    this.#modal('Admin toevoegen', form, () => api.post('/admins', form.values()));
  }

  #password(admin) {
    const form = new FormBuilder([{ key: 'password', label: 'Nieuw wachtwoord', type: 'password', required: true }]);
    this.#modal(`Wachtwoord van ${admin.username}`, form, () => api.put(`/admins/${admin.id}/password`, form.values()));
  }

  #modal(title, form, save) {
    new Modal({
      title,
      body: form.el,
      onSubmit: async () => {
        await save();
        Toast.show('Opgeslagen');
        this.reload();
      },
      onError: (err) => Toast.error(err),
    }).open();
  }

  async #remove(admin) {
    if (!confirm(`Admin "${admin.username}" verwijderen?`)) return;
    try {
      await api.delete(`/admins/${admin.id}`);
      this.reload();
    } catch (err) { Toast.error(err); }
  }
}
