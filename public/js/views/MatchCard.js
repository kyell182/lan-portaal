import { h } from '../core/dom.js';

export const BYE = '__BYE__';

/** Eén match in een bracket: twee regels met naam en score. */
export class MatchCard {
  constructor(match, names, onClick) {
    this.match = match;
    this.names = names;
    this.onClick = onClick;
  }

  render() {
    const m = this.match;
    const clickable = this.onClick && (m.status === 'ready' || (m.status === 'done' && !m.auto));
    return h('div', {
      class: `match ${m.status}${clickable ? ' clickable' : ''}`,
      tabindex: clickable ? 0 : null,
      role: clickable ? 'button' : null,
      onclick: clickable ? () => this.onClick(m) : null,
      onkeydown: clickable ? (e) => { if (e.key === 'Enter') this.onClick(m); } : null,
    },
    m.status === 'ready' && this.onClick ? h('span', { class: 'tag' }, 'speelbaar') : null,
    m.slots.map((slot) => this.#slot(slot)));
  }

  #slot(slot) {
    const m = this.match;
    const name = MatchCard.label(slot.pid, this.names);
    let state = '';
    if (slot.pid === null) state = 'tbd';
    else if (m.status === 'done' && m.winner === slot.pid) state = 'winner';
    else if (m.status === 'done') state = 'loser';
    return h('div', { class: `slot ${state}` }, h('span', {}, name), h('span', { class: 'score' }, slot.score ?? ''));
  }

  static label(pid, names) {
    if (pid === null || pid === undefined) return 'nog te bepalen';
    if (pid === BYE) return 'vrij (bye)';
    return names.get(pid) || '?';
  }
}
