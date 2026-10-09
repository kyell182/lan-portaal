/**
 * Hash-router: routes zoals '#/toernooien/:id'. Elke route geeft een Page-klasse
 * met render(container, params) en optioneel refresh(entities) en destroy().
 */
export class Router {
  constructor(outlet, routes, fallback) {
    this.outlet = outlet;
    this.routes = routes.map(([pattern, Page]) => ({ ...this.#compile(pattern), Page }));
    this.fallback = fallback;
    this.current = null;
  }

  start() {
    window.addEventListener('hashchange', () => this.#resolve());
    this.#resolve();
  }

  /** Laat de actieve pagina zichzelf vernieuwen na een live-update. */
  refresh(entities) {
    this.current?.refresh?.(entities);
  }

  /** Actieve pagina volledig herladen (bv. na het wisselen van event). */
  reload() {
    this.current?.reload?.();
  }

  #resolve() {
    const path = location.hash.slice(1) || this.fallback;
    for (const route of this.routes) {
      const match = path.match(route.regex);
      if (!match) continue;
      const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
      this.current?.destroy?.();
      this.current = new route.Page();
      this.current.render(this.outlet, params);
      document.dispatchEvent(new CustomEvent('route', { detail: path }));
      return;
    }
    location.hash = this.fallback;
  }

  #compile(pattern) {
    const keys = [];
    const source = pattern.replace(/:(\w+)/g, (_, key) => { keys.push(key); return '([^/]+)'; });
    return { regex: new RegExp(`^${source}$`), keys };
  }
}
