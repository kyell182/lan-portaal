import { h, formatDate } from '../core/dom.js';

export const STATUS_LABEL = { draft: 'Gepland', running: 'Live', finished: 'Afgelopen' };
const ORDER = { running: 0, draft: 1, finished: 2 };

/** Lijst van toernooien als klikbare rijen: lopende bovenaan, dan op starttijd. */
export class TournamentRows {
  constructor(tournaments, games, { href = (t) => `#/toernooien/${t.id}` } = {}) {
    this.tournaments = [...tournaments].sort((a, b) => ORDER[a.status] - ORDER[b.status] || String(a.startTime).localeCompare(String(b.startTime)));
    this.games = new Map(games.map((g) => [g.id, g]));
    this.href = href;
  }

  render(emptyText = 'Er zijn nog geen toernooien.') {
    if (!this.tournaments.length) return h('div', { class: 'empty' }, emptyText);
    return h('div', { class: 't-list' }, this.tournaments.map((t) => this.#row(t)));
  }

  #row(t) {
    const game = this.games.get(t.gameId);
    const sub = [game?.name, formatDate(t.startTime), t.location, `${t.participants.length} deelnemers`].filter(Boolean).join(', ');
    return h('a', { class: 't-row', href: this.href(t) },
      h('span', { class: 'stripe', style: { background: game?.color || 'var(--line)', boxShadow: `0 0 14px ${game?.color || 'transparent'}` } }),
      h('div', {}, h('div', { class: 'name' }, t.name), h('div', { class: 'sub' }, sub)),
      h('span', { class: `status ${t.status}` }, STATUS_LABEL[t.status]));
  }
}
