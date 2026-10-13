import { DEFAULT_THEME, themeCatalog } from './ThemeCatalog.js';

const CHOICE_KEY = 'lan:theme';
const APPLIED_KEY = 'lan:theme:applied';
const CSS_LINK_ID = 'theme-css';
export const AUTO = 'auto';

/**
 * Bepaalt en past het thema toe: de keuze van de bezoeker wint,
 * anders het thema van het event, anders het standaardthema.
 * Enkel de CSS van het actieve thema wordt geladen.
 */
export class ThemeSelector extends EventTarget {
  constructor(storage = localStorage) {
    super();
    this.storage = storage;
    this.eventTheme = null;
  }

  /** Keuze van de bezoeker: een thema-id of AUTO (= volg het event). */
  get choice() {
    const stored = this.#read(CHOICE_KEY);
    return themeCatalog.find(stored) ? stored : AUTO;
  }

  get active() {
    return this.choice !== AUTO ? this.choice : (themeCatalog.find(this.eventTheme)?.id || DEFAULT_THEME);
  }

  choose(choice) {
    if (choice === AUTO) this.#remove(CHOICE_KEY);
    else if (themeCatalog.find(choice)) this.#write(CHOICE_KEY, choice);
    this.apply();
  }

  /** Thema dat het huidige event meegeeft (mag leeg zijn). */
  setEventTheme(themeId) {
    this.eventTheme = themeId || null;
    this.apply();
  }

  apply() {
    const theme = themeCatalog.resolve(this.active);
    const cssUrl = theme.hasCss ? `${theme.base}/theme.css` : null;
    document.documentElement.dataset.theme = theme.id;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.color);
    this.#swapStylesheet(cssUrl);
    this.#write(APPLIED_KEY, JSON.stringify({ id: theme.id, css: cssUrl }));
    this.dispatchEvent(new Event('change'));
  }

  /** Nieuwe CSS eerst laden en pas daarna de oude weghalen, zodat er geen kaal tussenbeeld is. */
  #swapStylesheet(cssUrl) {
    const current = document.getElementById(CSS_LINK_ID);
    if (current?.getAttribute('href') === cssUrl) return;
    if (!cssUrl) return current?.remove();
    const next = document.createElement('link');
    next.rel = 'stylesheet';
    next.href = cssUrl;
    const swap = () => { current?.remove(); next.id = CSS_LINK_ID; };
    next.addEventListener('load', swap, { once: true });
    next.addEventListener('error', swap, { once: true });
    document.head.append(next);
  }

  #read(key) {
    try { return this.storage.getItem(key); } catch { return null; }
  }

  #write(key, value) {
    try { this.storage.setItem(key, value); } catch { /* keuze geldt dan enkel voor deze pagina */ }
  }

  #remove(key) {
    try { this.storage.removeItem(key); } catch { /* idem */ }
  }
}

export const themeSelector = new ThemeSelector();
