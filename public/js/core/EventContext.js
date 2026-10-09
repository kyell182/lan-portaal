import { api } from './Api.js';

/**
 * Houdt bij welk event (LAN-editie) er bekeken wordt.
 * Standaard het actieve event; een andere keuze wordt per browser onthouden.
 * Pagina's gebruiken query() om hun data op dat event te filteren.
 */
export class EventContext extends EventTarget {
  constructor(storage, key) {
    super();
    this.storage = storage;
    this.key = key;
    this.events = [];
    this.current = null;
  }

  async init() {
    await this.reload();
    return this;
  }

  /** Lijst opnieuw ophalen (bv. na een live-update) en de keuze geldig houden. */
  async reload() {
    const [events, active] = await Promise.all([api.get('/events'), api.get('/events/current')]);
    this.events = events.sort((a, b) => String(b.startDate || b.createdAt).localeCompare(String(a.startDate || a.createdAt)));
    const previous = this.current?.id;
    this.current = this.events.find((e) => e.id === this.#stored()) || this.events.find((e) => e.id === active?.id) || null;
    this.dispatchEvent(new Event('list'));
    if (previous !== this.current?.id) this.#notify();
  }

  get id() {
    return this.current?.id || null;
  }

  get isActive() {
    return !!this.current?.active;
  }

  select(id) {
    this.current = this.events.find((e) => e.id === id) || null;
    try {
      if (this.current && !this.current.active) this.storage.setItem(this.key, id);
      else this.storage.removeItem(this.key);
    } catch { /* opslag niet beschikbaar: keuze geldt enkel voor deze pagina */ }
    this.#notify();
  }

  /** '?eventId=...' of '' als er nog geen events zijn. */
  query(extra = '') {
    const params = new URLSearchParams(extra);
    if (this.id) params.set('eventId', this.id);
    const text = params.toString();
    return text ? `?${text}` : '';
  }

  #stored() {
    try { return this.storage.getItem(this.key); } catch { return null; }
  }

  #notify() {
    this.dispatchEvent(new Event('change'));
  }
}
