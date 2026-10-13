import { api } from '../core/Api.js';

export const DEFAULT_THEME = 'vives';

/** Lijst van beschikbare thema's (ingebouwd en eigen), opgehaald bij de server. */
class ThemeCatalog {
  constructor() {
    this.themes = [];
  }

  async load() {
    try {
      this.themes = await api.get('/themes');
    } catch {
      this.themes = [];
    }
    return this;
  }

  find(id) {
    return this.themes.find((theme) => theme.id === id) || null;
  }

  /** Het thema met deze id, of anders het standaardthema (of een leeg thema als niets geladen is). */
  resolve(id) {
    return this.find(id) || this.find(DEFAULT_THEME) || { id: DEFAULT_THEME, name: 'VIVES', color: '#0b0e1c', sprites: [], hasCss: false };
  }
}

export const themeCatalog = new ThemeCatalog();
