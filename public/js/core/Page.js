import { h, mount } from './dom.js';

/**
 * Basis voor elke pagina: data laden, tekenen en opnieuw laden
 * wanneer een entiteit verandert die de pagina "bekijkt" (watches).
 */
export class Page {
  /** Entiteiten waarvoor de pagina live herlaadt, bv. ['tournaments']. */
  get watches() { return []; }

  render(container, params = {}) {
    this.container = container;
    this.params = params;
    this.reload();
  }

  async reload() {
    try {
      const data = await this.load();
      if (!this.destroyed) this.draw(data);
    } catch (err) {
      if (err.status === 401) return this.onUnauthorized();
      mount(this.container, h('div', { class: 'empty' }, err.message || 'Laden mislukt.'));
    }
  }

  refresh(entities) {
    if (this.watches.some((e) => entities.has(e))) this.reload();
  }

  destroy() {
    this.destroyed = true;
  }

  /** Sessie verlopen: herladen toont het aanmeldscherm. */
  onUnauthorized() {
    location.reload();
  }

  async load() { return null; }

  // eslint-disable-next-line no-unused-vars
  draw(data) {}
}
