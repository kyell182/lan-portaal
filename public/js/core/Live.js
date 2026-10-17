/** Luistert naar /api/live en roept subscribers op bij wijzigingen (gebundeld per 300 ms).
 * Luisteraars krijgen de entiteiten en de ruwe meldingen ({ entity, id }), zodat een pagina kan filteren op id. */
export class Live {
  #listeners = new Set();
  #timer = null;
  #pending = new Set();
  #changes = [];

  constructor(indicator) {
    this.indicator = indicator;
  }

  start() {
    const source = new EventSource('/api/live');
    source.onopen = () => this.indicator?.classList.add('on');
    source.onerror = () => this.indicator?.classList.remove('on');
    source.onmessage = (event) => this.#queue(JSON.parse(event.data));
  }

  subscribe(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  #queue(payload) {
    this.#pending.add(payload.entity);
    this.#changes.push(payload);
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      const entities = new Set(this.#pending);
      const changes = this.#changes;
      this.#pending.clear();
      this.#changes = [];
      this.#listeners.forEach((fn) => fn(entities, changes));
    }, 300);
  }
}
