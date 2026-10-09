import { h, svg } from '../core/dom.js';
import { MatchCard } from './MatchCard.js';

/**
 * Tekent een knock-outbracket als kolommen per ronde,
 * met de verbindingen als "netwerkkabels" in een SVG-laag erachter.
 */
export class BracketView {
  constructor({ title, matches, names, onMatchClick }) {
    this.title = title;
    this.matches = matches;
    this.names = names;
    this.onMatchClick = onMatchClick;
  }

  render() {
    const rounds = this.#groupByRound();
    this.cards = new Map();
    const columns = rounds.map(([, matches]) => h('div', { class: 'round' },
      h('div', { class: 'round-name' }, matches[0].label),
      h('div', { class: 'round-matches' }, matches.map((m) => this.#card(m)))));
    this.cables = svg('svg', { class: 'cables', 'aria-hidden': 'true' });
    this.board = h('div', { class: 'bracket' }, this.cables, columns);
    const wrap = h('div', { class: 'bracket-wrap' }, this.title ? h('div', { class: 'bracket-title' }, this.title) : null, this.board);
    requestAnimationFrame(() => this.drawCables());
    return wrap;
  }

  /** Lijnen opnieuw tekenen (na render of bij resize). */
  drawCables() {
    if (!this.board.isConnected) return;
    this.cables.replaceChildren();
    const origin = this.board.getBoundingClientRect();
    this.cables.setAttribute('width', origin.width);
    this.cables.setAttribute('height', origin.height);
    for (const match of this.matches) {
      if (!match.next || !this.cards.has(match.next.matchId)) continue;
      this.#cable(origin, this.cards.get(match.id), this.cards.get(match.next.matchId), match);
    }
  }

  #cable(origin, fromEl, toEl, match) {
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();
    const x1 = a.right - origin.left;
    const y1 = a.top + a.height / 2 - origin.top;
    const x2 = b.left - origin.left;
    const y2 = b.top + b.height / 2 - origin.top;
    const mid = x1 + (x2 - x1) / 2;
    const live = match.status === 'done' && !match.auto;
    this.cables.append(
      svg('path', { d: `M${x1},${y1} H${mid - 8} Q${mid},${y1} ${mid},${y1 + Math.sign(y2 - y1) * 8} V${y2 - Math.sign(y2 - y1) * 8} Q${mid},${y2} ${mid + 8},${y2} H${x2}`, class: live ? 'live' : '' }),
      svg('circle', { cx: x1, cy: y1, r: 3 }),
      svg('circle', { cx: x2, cy: y2, r: 3 }),
    );
  }

  #card(match) {
    const el = new MatchCard(match, this.names, this.onMatchClick).render();
    this.cards.set(match.id, el);
    return el;
  }

  #groupByRound() {
    const map = new Map();
    for (const m of this.matches) {
      const key = `${m.bracket}-${m.round}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return [...map.entries()];
  }
}
