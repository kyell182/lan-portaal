import { h, mount } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Page } from '../../core/Page.js';
import { Toast } from '../../core/Toast.js';
import { adminEventContext } from '../context.js';
import { playerLabel } from '../../views/playerLabel.js';

/** Check-in aan de deur: zoeken op gamertag of naam, inchecken, gekozen naam vrijgeven. */
export class CheckInPage extends Page {
  get watches() { return ['players']; }

  async load() {
    const players = await api.get(`/players${adminEventContext.query()}`);
    return players.sort((a, b) => a.nickname.localeCompare(b.nickname));
  }

  draw(players) {
    this.players = players;
    this.search ??= h('input', { type: 'search', placeholder: 'Zoek op gamertag of naam', 'aria-label': 'Zoeken', oninput: () => this.#drawList() });
    this.counter = h('div', { class: 'meta' });
    this.list = h('div', {});
    mount(this.container,
      h('div', { class: 'page-head' }, h('div', {}, h('h2', {}, 'Check-in'), this.counter),
        h('div', { class: 'actions' },
          h('a', { class: 'btn', href: '#/spelers/importeren' }, 'Importeren'),
          h('button', { class: 'btn danger', onclick: () => this.#wipe() }, 'Alle spelersgegevens wissen'))),
      h('div', { class: 'field' }, this.search),
      this.list);
    this.#drawList();
  }

  #drawList() {
    const query = this.search.value.trim().toLowerCase();
    const shown = this.players.filter((p) => `${p.nickname} ${p.firstName ?? ''} ${p.lastName ?? ''}`.toLowerCase().includes(query));
    const checkedIn = this.players.filter((p) => p.checkedIn).length;
    this.counter.textContent = `${checkedIn} van ${this.players.length} ingecheckt`;
    mount(this.list, shown.length ? this.#table(shown) : h('div', { class: 'empty' }, 'Geen spelers gevonden.'));
  }

  #table(players) {
    return h('div', { class: 'table-scroll' }, h('table', { class: 'data' },
      h('tbody', {}, players.map((p) => this.#row(p)))));
  }

  #row(player) {
    return h('tr', {},
      h('td', {}, playerLabel(player)),
      h('td', {}, player.claimedAt ? h('span', { class: 'muted' }, 'Naam gekozen op een toestel') : ''),
      h('td', { class: 'num' }, h('div', { class: 'actions', style: { justifyContent: 'flex-end' } },
        player.claimedAt ? h('button', { class: 'btn small', onclick: () => this.#release(player) }, 'Naam vrijgeven') : null,
        h('button', { class: `btn small${player.checkedIn ? '' : ' primary'}`, onclick: () => this.#toggle(player) },
          player.checkedIn ? 'Uitchecken' : 'Inchecken'))));
  }

  async #toggle(player) {
    await this.#run(() => api.put(`/players/${player.id}`, { checkedIn: !player.checkedIn }));
  }

  async #release(player) {
    if (!confirm(`Naam "${player.nickname}" vrijgeven? Het toestel dat de naam koos verliest de koppeling.`)) return;
    await this.#run(() => api.post(`/players/${player.id}/release`));
  }

  async #wipe() {
    if (!confirm('Alle spelersgegevens van dit event wissen? Dit kan niet ongedaan gemaakt worden.')) return;
    await this.#run(() => api.delete(`/players${adminEventContext.query()}`));
  }

  async #run(action) {
    try { await action(); } catch (err) { Toast.error(err); }
  }
}
