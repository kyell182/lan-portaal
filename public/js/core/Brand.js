import { api } from './Api.js';

const CACHE_KEY = 'lan:brand';

/** Merknaam van het portaal in de topbalk en het tabblad. De laatste naam wordt onthouden om flitsen te voorkomen. */
export class Brand {
  /** @param suffix extra tekst in de topbalk, bv. " beheer" */
  constructor(suffix = '') {
    this.suffix = suffix;
  }

  async start() {
    const cached = Brand.#cached();
    if (cached) this.apply(cached);
    try {
      const fresh = await api.get('/site');
      this.apply(fresh);
      Brand.#remember(fresh);
    } catch {
      // zonder verbinding blijft de laatst bekende naam staan
    }
  }

  apply({ mark, name }) {
    const markEl = document.querySelector('.brand-mark');
    const nameEl = document.querySelector('.brand-name');
    if (markEl) markEl.textContent = mark;
    if (nameEl) nameEl.textContent = `${name}${this.suffix}`;
    document.title = `${this.suffix ? 'Beheer – ' : ''}${mark} ${name}`.trim();
  }

  static #cached() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
  }

  static #remember(brand) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(brand)); } catch { /* opslag niet beschikbaar */ }
  }
}
