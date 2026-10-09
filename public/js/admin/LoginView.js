import { h, mount } from '../core/dom.js';
import { api } from '../core/Api.js';

/** Aanmeldscherm voor admins. */
export class LoginView {
  constructor(container, onLoggedIn) {
    this.container = container;
    this.onLoggedIn = onLoggedIn;
  }

  render() {
    const username = h('input', { autocomplete: 'username', required: true });
    const password = h('input', { type: 'password', autocomplete: 'current-password', required: true });
    const error = h('p', { class: 'muted', role: 'alert' });
    const submit = h('button', { class: 'btn primary', type: 'submit' }, 'Aanmelden');

    const form = h('form', { class: 'panel login', onsubmit: async (e) => {
      e.preventDefault();
      submit.disabled = true;
      error.textContent = '';
      try {
        const admin = await api.post('/auth/login', { username: username.value, password: password.value });
        this.onLoggedIn(admin);
      } catch (err) {
        error.textContent = err.status === 429 ? 'Te veel pogingen. Probeer het over enkele minuten opnieuw.' : err.message;
      } finally {
        submit.disabled = false;
      }
    } },
    h('h2', {}, 'Beheer aanmelden'),
    h('label', { class: 'field' }, h('span', {}, 'Gebruikersnaam'), username),
    h('label', { class: 'field' }, h('span', {}, 'Wachtwoord'), password),
    error,
    submit);

    mount(this.container, form);
    username.focus();
  }
}
