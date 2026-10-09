import { h, mount, formatDate } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { TournamentView } from '../views/TournamentView.js';
import { StandingsView } from '../views/StandingsView.js';
import { STATUS_LABEL } from '../views/TournamentRows.js';

/** Publieke detailpagina: schema en klassement, live bijgewerkt. */
export class TournamentPage extends Page {
  get watches() { return ['tournaments']; }

  render(container, params) {
    this.onResize = () => this.view?.redraw();
    window.addEventListener('resize', this.onResize);
    super.render(container, params);
  }

  destroy() {
    super.destroy();
    window.removeEventListener('resize', this.onResize);
  }

  async load() {
    const id = this.params.id;
    const [tournament, standings, games] = await Promise.all([
      api.get(`/tournaments/${id}`), api.get(`/tournaments/${id}/standings`), api.get('/games'),
    ]);
    return { tournament, standings, game: games.find((g) => g.id === tournament.gameId) };
  }

  draw({ tournament, standings, game }) {
    this.tab = this.tab || (tournament.formatKey === 'scoreboard' ? 'stand' : 'schema');
    this.view = new TournamentView(tournament);
    const meta = [game?.name, formatDate(tournament.startTime), tournament.location].filter(Boolean).join(', ');
    const body = this.tab === 'schema' ? this.view.render() : new StandingsView(standings).render();

    mount(this.container,
      h('a', { href: '#/toernooien', class: 'back' }, 'Alle toernooien'),
      h('div', { class: 'page-head' },
        h('div', {}, h('h1', {}, tournament.name), h('div', { class: 'meta' }, meta)),
        h('span', { class: `status ${tournament.status}` }, STATUS_LABEL[tournament.status])),
      tournament.description ? h('p', {}, tournament.description) : null,
      h('div', { class: 'tabs', role: 'tablist' },
        this.#tab('schema', tournament.formatKey === 'scoreboard' ? 'Criteria' : 'Speelschema'),
        this.#tab('stand', 'Klassement'),
        this.#tab('deelnemers', `Deelnemers (${tournament.participants.length})`)),
      this.tab === 'deelnemers' ? this.#participants(tournament) : body);
  }

  #tab(key, label) {
    return h('button', { role: 'tab', class: this.tab === key ? 'active' : '', 'aria-selected': String(this.tab === key), onclick: () => { this.tab = key; this.reload(); } }, label);
  }

  #participants(t) {
    if (!t.participants.length) return h('div', { class: 'empty' }, 'Nog geen deelnemers ingeschreven.');
    return h('ol', {}, t.participants.map((p) => h('li', {}, p.name)));
  }
}
