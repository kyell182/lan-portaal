import { h } from '../core/dom.js';

/** Prijzen per toernooi en shop-items. */
export class PrizeListView {
  constructor({ prizes, tournaments }) {
    this.prizes = prizes;
    this.tournaments = new Map(tournaments.map((t) => [t.id, t.name]));
  }

  render() {
    const prizes = this.prizes.filter((p) => p.kind !== 'shop').sort((a, b) => (a.place || 99) - (b.place || 99));
    const shop = this.prizes.filter((p) => p.kind === 'shop');
    if (!this.prizes.length) return h('div', { class: 'empty' }, 'Er zijn nog geen prijzen aangekondigd.');
    return h('div', {},
      prizes.length ? h('section', {}, h('h2', {}, 'Te winnen'), h('div', { class: 'prize-list' }, prizes.map((p) => this.#prize(p)))) : null,
      shop.length ? h('section', { style: { marginTop: '32px' } }, h('h2', {}, 'Shop'), h('div', { class: 'prize-list' }, shop.map((p) => this.#shop(p)))) : null);
  }

  #prize(p) {
    const meta = [this.tournaments.get(p.tournamentId), p.sponsor && `gesponsord door ${p.sponsor}`].filter(Boolean).join(', ');
    return h('article', { class: 'prize' },
      this.#image(p),
      h('div', {}, h('h3', {}, p.name), meta ? h('div', { class: 'muted' }, meta) : null,
        p.description ? h('p', {}, p.description) : null,
        p.awardedTo ? h('div', {}, `Gewonnen door ${p.awardedTo}`) : null),
      h('div', { class: 'place' }, p.place ? `${p.place}e` : ''));
  }

  #shop(p) {
    const price = p.price !== null && p.price !== undefined ? `€ ${Number(p.price).toFixed(2).replace('.', ',')}` : '';
    return h('article', { class: 'prize' },
      this.#image(p),
      h('div', {}, h('h3', {}, p.name), p.description ? h('p', { class: 'muted' }, p.description) : null,
        h('div', { class: 'muted' }, p.quantity > 0 ? `Nog ${p.quantity} beschikbaar` : 'Uitverkocht')),
      h('div', { class: 'price' }, price));
  }

  #image(p) {
    return p.imageUrl ? h('img', { src: p.imageUrl, alt: '', loading: 'lazy' }) : h('div', { class: 'ph' });
  }
}
