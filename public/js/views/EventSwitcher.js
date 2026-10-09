import { h } from '../core/dom.js';

/**
 * Keuzelijst om tussen LAN-edities te wisselen (publiek: archief, beheer: werk-event).
 * Volgt de EventContext en tekent zich opnieuw bij wijzigingen.
 */
export class EventSwitcher {
  constructor(context, { label = 'Kies een editie' } = {}) {
    this.context = context;
    this.label = label;
    this.el = h('span', {});
    context.addEventListener('change', () => this.render());
    context.addEventListener('list', () => this.render());
  }

  render() {
    const { events, id } = this.context;
    if (events.length < 2 && !this.alwaysShow) {
      this.el.replaceChildren();
      return this.el;
    }
    const select = h('select', { 'aria-label': this.label, onchange: (e) => this.context.select(e.target.value) },
      events.map((ev) => h('option', { value: ev.id, selected: ev.id === id }, ev.active ? `${ev.name} (actief)` : ev.name)));
    this.el.replaceChildren(select);
    return this.el;
  }

  /** In het beheer altijd tonen, ook met één event. */
  showAlways() {
    this.alwaysShow = true;
    return this;
  }
}
