import { h } from '../../core/dom.js';
import { playerLabel } from '../../views/playerLabel.js';

/** Naam kiezen: lijst van ingecheckte spelers die hun naam nog niet gekozen hebben, met zoekveld. */
export class ClaimView {
  constructor(onPick) {
    this.onPick = onPick;
    this.query = '';
    this.input = h('input', {
      type: 'search', placeholder: 'Zoek je gamertag of naam', 'aria-label': 'Zoek je gamertag', autocomplete: 'off',
      oninput: (e) => { this.query = e.target.value; this.#drawList(); },
    });
    this.list = h('div', { class: 'claim-list' });
  }

  render(players) {
    this.players = players;
    this.input.value = this.query;
    this.#drawList();
    return h('div', {},
      h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Wie ben jij?'),
        h('div', { class: 'meta' }, 'Kies je gamertag. Staat je naam er niet bij? Meld je bij de crew voor de check-in.'))),
      h('label', { class: 'field' }, this.input),
      this.list);
  }

  #drawList() {
    const query = this.query.trim().toLowerCase();
    const shown = this.players.filter((p) => `${p.nickname} ${p.firstName ?? ''} ${p.lastName ?? ''}`.toLowerCase().includes(query));
    this.list.replaceChildren(...(shown.length
      ? shown.map((p) => h('button', { class: 'btn claim-item', type: 'button', onclick: () => this.#confirm(p) }, playerLabel(p)))
      : [h('div', { class: 'empty' }, 'Geen namen gevonden.')]));
  }

  #confirm(player) {
    if (confirm(`Ben jij ${player.nickname}?`)) this.onPick(player.id);
  }
}
