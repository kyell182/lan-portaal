import { h } from '../core/dom.js';

const COPIED_LABEL_MS = 1500;

/** Tegels met servergegevens: afbeelding, adres met kopieerknop en extra regels "label: waarde". */
export class ServerTilesView {
  constructor(servers) {
    this.servers = [...servers].sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
  }

  render() {
    if (!this.servers.length) return h('div', { class: 'empty' }, 'Er zijn nog geen servers toegevoegd.');
    return h('div', { class: 'server-grid' }, this.servers.map((server) => this.#tile(server)));
  }

  #tile(server) {
    return h('article', { class: 'server-tile' },
      server.imageUrl ? h('img', { src: server.imageUrl, alt: '', loading: 'lazy' }) : h('div', { class: 'ph' }),
      h('div', { class: 'server-body' },
        h('h3', {}, server.name),
        server.description ? h('p', { class: 'muted' }, server.description) : null,
        server.address ? this.#address(server.address) : null,
        this.#password(server),
        this.#details(server.details)));
  }

  #password(server) {
    if (server.password) return h('div', { class: 'server-address' }, h('span', { class: 'muted' }, 'Wachtwoord'), h('code', {}, server.password));
    if (server.hasPassword) return h('div', { class: 'muted' }, h('a', { href: '#/spelen' }, 'Kies je naam'), ' om het wachtwoord te zien.');
    return null;
  }

  #address(address) {
    const button = h('button', { class: 'btn small', type: 'button' }, 'Kopieer');
    button.addEventListener('click', () => this.#copy(address, button));
    return h('div', { class: 'server-address' }, h('code', {}, address), button);
  }

  async #copy(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Gekopieerd';
    } catch {
      button.textContent = 'Kopiëren mislukt';
    }
    setTimeout(() => { button.textContent = 'Kopieer'; }, COPIED_LABEL_MS);
  }

  #details(details) {
    const rows = (details || '').split('\n').map((line) => line.trim()).filter(Boolean);
    if (!rows.length) return null;
    return h('dl', { class: 'server-details' }, rows.flatMap((row) => this.#row(row)));
  }

  #row(row) {
    const split = row.indexOf(':');
    if (split === -1) return [h('dd', { class: 'wide' }, row)];
    return [h('dt', {}, row.slice(0, split).trim()), h('dd', {}, row.slice(split + 1).trim())];
  }
}
