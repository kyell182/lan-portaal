import { h, mount } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { SeatMapView } from '../views/SeatMapView.js';
import { eventContext } from './context.js';

/** Publiek zitplan van het bekeken event: wie zit waar, met zoekfunctie. */
export class SeatsPage extends Page {
  get watches() { return ['seats', 'players']; }

  async load() {
    const [seats, players] = await Promise.all([api.get(`/seats${eventContext.query()}`), api.get('/players')]);
    return { seats, players };
  }

  draw({ seats, players }) {
    this.query = this.query || '';
    const input = h('input', { type: 'search', placeholder: 'Zoek een speler', value: this.query, 'aria-label': 'Zoek een speler', oninput: (e) => this.#highlight(e.target.value) });
    mount(this.container,
      h('div', { class: 'page-head' },
        h('div', {}, h('h1', {}, 'Zitplan'), h('div', { class: 'meta' }, 'Typ je nickname om je plaats te vinden.')),
        h('label', { class: 'field', style: { margin: 0, minWidth: '260px' } }, input)),
      new SeatMapView({ seats, players }).render());
    this.#highlight(this.query);
  }

  #highlight(query) {
    this.query = query;
    const q = query.trim().toLowerCase();
    for (const seat of this.container.querySelectorAll('.seat')) {
      const hit = !!q && seat.classList.contains('taken') && seat.querySelector('.who').textContent.toLowerCase().includes(q);
      seat.classList.toggle('hit', hit);
      seat.classList.toggle('dim', !!q && !hit);
    }
  }
}
