import { h } from '../core/dom.js';

/** Zitplan per zone als raster van plaatsen. */
export class SeatMapView {
  constructor({ seats, players, onSeatClick }) {
    this.seats = seats;
    this.players = new Map(players.map((p) => [p.id, p]));
    this.onSeatClick = onSeatClick;
  }

  render(extraPerZone = () => null) {
    if (!this.seats.length) return h('div', { class: 'empty' }, 'Er is nog geen zitplan.');
    return h('div', {}, this.#zones().map(([zone, seats]) => this.#zone(zone, seats, extraPerZone(zone))));
  }

  #zones() {
    const zones = new Map();
    for (const seat of this.seats) {
      if (!zones.has(seat.zone)) zones.set(seat.zone, []);
      zones.get(seat.zone).push(seat);
    }
    return [...zones.entries()].sort(([a], [b]) => a.localeCompare(b));
  }

  #zone(zone, seats, extra) {
    const cols = Math.max(...seats.map((s) => s.col));
    const taken = seats.filter((s) => s.playerId).length;
    return h('section', { class: 'zone' },
      h('div', { class: 'page-head' }, h('div', {}, h('h3', {}, zone), h('div', { class: 'muted' }, `${taken} van ${seats.length} plaatsen bezet`)), extra),
      h('div', { class: 'seat-grid', style: { gridTemplateColumns: `repeat(${cols}, 92px)` } },
        seats.map((s) => this.#seat(s))));
  }

  #seat(seat) {
    const player = seat.playerId ? this.players.get(seat.playerId) : null;
    const clickable = !!this.onSeatClick;
    return h('div', {
      class: `seat${player ? ' taken' : ''}${clickable ? ' clickable' : ''}`,
      style: { gridRow: seat.row, gridColumn: seat.col },
      tabindex: clickable ? 0 : null,
      role: clickable ? 'button' : null,
      title: seat.note || null,
      onclick: clickable ? () => this.onSeatClick(seat) : null,
      onkeydown: clickable ? (e) => { if (e.key === 'Enter') this.onSeatClick(seat); } : null,
    }, h('span', { class: 'label' }, seat.label), h('span', { class: 'who' }, player ? player.nickname : 'vrij'));
  }
}
