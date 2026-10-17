import { h } from '../core/dom.js';

/** Gamertag groot, echte naam klein en gedempt erbij. Overal hetzelfde tonen. */
export function playerLabel(player) {
  const name = [player.firstName, player.lastName].filter(Boolean).join(' ');
  return h('span', { class: 'player-label' },
    h('strong', {}, player.nickname),
    name ? h('small', { class: 'muted', style: { marginLeft: '8px' } }, name) : null);
}
