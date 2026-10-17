import { h, mount } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { Toast } from '../core/Toast.js';
import { SeatMapView } from '../views/SeatMapView.js';
import { eventContext } from './context.js';

/** Publiek zitplan: wie zit waar, met zoekfunctie. Een aangemelde speler kiest hier zelf zijn plaats. */
export class SeatsPage extends Page {
  get watches() { return ['seats', 'players']; }

  async load() {
    const [seats, players, me] = await Promise.all([
      api.get(`/seats${eventContext.query()}`), api.get(`/players${eventContext.query()}`), api.get('/player-auth/me'),
    ]);
    return { seats, players, me: me.player };
  }

  draw({ seats, players, me }) {
    this.query = this.query || '';
    const mine = me ? seats.find((s) => s.playerId === me.id) : null;
    const input = h('input', { type: 'search', placeholder: 'Zoek een speler', value: this.query, 'aria-label': 'Zoek een speler', oninput: (e) => this.#highlight(e.target.value) });
    const onSeatClick = me ? (seat) => this.#choose(seat, me, mine) : undefined;
    mount(this.container,
      h('div', { class: 'page-head' },
        h('div', {}, h('h1', {}, 'Zitplan'), h('div', { class: 'meta' }, this.#intro(me, mine))),
        h('div', { class: 'actions' },
          mine ? h('button', { class: 'btn', onclick: () => this.#release() }, 'Mijn plaats vrijgeven') : null,
          h('label', { class: 'field', style: { margin: 0, minWidth: '260px' } }, input))),
      new SeatMapView({ seats, players, onSeatClick, mineId: me?.id }).render());
    this.#highlight(this.query);
  }

  #intro(me, mine) {
    if (!me) return 'Typ je gamertag om je plaats te vinden. Kies eerst je naam onder "Mijn ronde" om zelf een plaats te kiezen.';
    return mine ? `Je zit op ${mine.label}. Tik op een vrije plaats om te verhuizen.` : 'Tik op een vrije plaats om te gaan zitten.';
  }

  async #choose(seat, me, mine) {
    if (seat.playerId) return;
    if (!confirm(`Plaats ${seat.label} kiezen${mine ? ` in plaats van ${mine.label}` : ''}?`)) return;
    await this.#run(() => api.post(`/seats/${seat.id}/claim`));
  }

  async #release() {
    await this.#run(() => api.post('/seats/release'));
  }

  async #run(call) {
    try { await call(); } catch (err) { Toast.error(err); }
    this.reload();
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
