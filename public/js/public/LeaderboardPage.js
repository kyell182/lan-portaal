import { h, mount } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { playerLabel } from '../views/playerLabel.js';
import { eventContext } from './context.js';

const TV_DEFAULT_ROWS = 15;
const TV_PAGE_SECONDS = 10;
const STATUS_FINISHED = 'finished';

/** Algemeen klassement. Met `?tv=1` schermvullend: grote letters, top N, en bladeren door de rest. */
export class LeaderboardPage extends Page {
  get watches() { return ['tournaments', 'players']; }

  get isTv() { return this.params.query?.get('tv') === '1'; }

  async load() {
    return api.get(`/leaderboard${eventContext.query()}`);
  }

  draw(board) {
    this.board = board;
    document.body.classList.toggle('tv', this.isTv);
    this.#stopPaging();
    this.#drawAll();
    if (this.isTv && board.rows.length > this.#pageSize()) this.pager = setInterval(() => this.#nextPage(), TV_PAGE_SECONDS * 1000);
  }

  destroy() {
    super.destroy();
    this.#stopPaging();
    document.body.classList.remove('tv');
  }

  #pageSize() {
    const wanted = Number(this.params.query?.get('n'));
    return wanted > 0 ? wanted : TV_DEFAULT_ROWS;
  }

  #nextPage() {
    const pages = Math.ceil(this.board.rows.length / this.#pageSize());
    this.pageIndex = ((this.pageIndex ?? 0) + 1) % pages;
    this.#drawAll();
  }

  #stopPaging() {
    clearInterval(this.pager);
    this.pager = null;
  }

  #drawAll() {
    const { rows } = this.board;
    const size = this.isTv ? this.#pageSize() : rows.length;
    const start = this.isTv ? ((this.pageIndex ?? 0) * size) % Math.max(rows.length, 1) : 0;
    mount(this.container,
      this.#head(),
      rows.length ? this.#table(rows.slice(start, start + size)) : h('div', { class: 'empty' }, 'Het klassement verschijnt zodra de eerste ronde gespeeld is.'),
      this.#foot());
  }

  #head() {
    return h('div', { class: 'page-head' },
      h('h1', {}, 'Klassement'),
      this.isTv ? null : h('a', { class: 'btn small', href: '#/klassement?tv=1' }, 'TV-weergave'));
  }

  #table(rows) {
    const { rounds } = this.board;
    return h('div', { class: 'table-scroll leaderboard' }, h('table', { class: 'data' },
      h('thead', {}, h('tr', {},
        h('th', {}, '#'), h('th', {}, 'Speler'),
        rounds.map((r) => h('th', { class: 'num' }, `R${r.roundNo}`)),
        h('th', { class: 'num' }, 'Social'), h('th', { class: 'num' }, 'Totaal'))),
      h('tbody', {}, rows.map((row) => this.#row(row)))));
  }

  #row(row) {
    return h('tr', { class: row.place === 1 ? 'first' : '' },
      h('td', {}, row.place),
      h('td', { class: 'player' }, playerLabel(row), row.provisional ? h('span', { class: 'provisional', title: 'Voorlopig' }, '*') : null),
      this.board.rounds.map((r) => h('td', { class: 'num' }, row.rounds[r.roundNo] ?? '–')),
      h('td', { class: 'num' }, row.social || '–'),
      h('td', { class: 'num' }, h('strong', {}, row.total)));
  }

  #foot() {
    const pending = this.board.unconfirmedGroups;
    const next = this.board.rounds.find((r) => r.status !== STATUS_FINISHED);
    return h('div', { class: 'leaderboard-foot' },
      h('span', {}, pending ? `${pending} ${pending === 1 ? 'groep' : 'groepen'} nog niet bevestigd (* = voorlopig)` : ''),
      next ? h('span', {}, LeaderboardPage.#nextRoundText(next)) : null);
  }

  static #nextRoundText(round) {
    const time = LeaderboardPage.#timeOf(round.startTime);
    return `Ronde ${round.roundNo}${time ? ` rond ${time}` : ''}: ${round.gameName ?? round.name}`;
  }

  static #timeOf(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  }
}
