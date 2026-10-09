import { h, mount } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { Modal } from '../core/Modal.js';
import { FormBuilder } from '../core/FormBuilder.js';
import { Toast } from '../core/Toast.js';
import { SeatMapView } from '../views/SeatMapView.js';
import { toOptions } from './resources/options.js';
import { adminEventContext } from './context.js';

/** Zitplan beheren: zones als raster aanmaken en spelers op plaatsen zetten. */
export class SeatsAdminPage extends Page {
  get watches() { return ['seats', 'players']; }

  async load() {
    const [seats, players] = await Promise.all([api.get(`/seats${adminEventContext.query()}`), api.get('/players')]);
    return { seats, players };
  }

  draw({ seats, players }) {
    this.players = players;
    this.seats = seats;
    const map = new SeatMapView({ seats, players, onSeatClick: (s) => this.#editSeat(s) });
    mount(this.container,
      h('div', { class: 'page-head' },
        h('div', {}, h('h2', {}, 'Zitplan'), h('div', { class: 'meta' }, 'Klik op een plaats om er een speler op te zetten.')),
        h('button', { class: 'btn primary', onclick: () => this.#createZone() }, 'Zone toevoegen')),
      map.render((zone) => h('button', { class: 'btn small danger', onclick: () => this.#removeZone(zone) }, 'Zone verwijderen')));
  }

  #createZone() {
    const form = new FormBuilder([
      { key: 'zone', label: 'Naam zone (bv. lokaal B.104)', required: true },
      { key: 'rows', label: 'Rijen', type: 'number', min: 1, max: 50, required: true, default: 4 },
      { key: 'cols', label: 'Plaatsen per rij', type: 'number', min: 1, max: 50, required: true, default: 6 },
      { key: 'prefix', label: 'Voorvoegsel label (optioneel)' },
    ]);
    new Modal({
      title: 'Zone toevoegen',
      body: h('div', {}, h('p', { class: 'muted' }, 'Plaatsen krijgen labels zoals A1, A2, B1...'), form.el),
      submitLabel: 'Zone aanmaken',
      onSubmit: async () => {
        await api.post('/seats/grid', { ...form.values(), eventId: adminEventContext.id });
        Toast.show('Zone aangemaakt');
      },
      onError: (err) => Toast.error(err),
    }).open();
  }

  #editSeat(seat) {
    const seatedElsewhere = new Set(this.seats.filter((s) => s.playerId && s.id !== seat.id).map((s) => s.playerId));
    const free = this.players.filter((p) => !seatedElsewhere.has(p.id));
    const form = new FormBuilder([
      { key: 'playerId', label: 'Speler', type: 'select', options: toOptions(free, (p) => p.nickname) },
      { key: 'label', label: 'Label', required: true },
      { key: 'note', label: 'Notitie (bv. stroom, scherm)' },
    ], seat);
    new Modal({
      title: `Plaats ${seat.label}`,
      body: form.el,
      onSubmit: async () => {
        await api.put(`/seats/${seat.id}`, form.values());
        Toast.show('Plaats opgeslagen');
      },
      onError: (err) => Toast.error(err),
    }).open();
  }

  async #removeZone(zone) {
    if (!confirm(`Zone "${zone}" met alle plaatsen verwijderen?`)) return;
    try {
      await api.delete(`/seats/zone/${encodeURIComponent(zone)}${adminEventContext.query()}`);
    } catch (err) { Toast.error(err); }
  }
}
