import { h, mount, formatDate } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Page } from '../../core/Page.js';
import { Toast } from '../../core/Toast.js';
import { TournamentView } from '../../views/TournamentView.js';
import { StandingsView } from '../../views/StandingsView.js';
import { STATUS_LABEL } from '../../views/TournamentRows.js';
import { ParticipantEditor } from './ParticipantEditor.js';
import { ResultDialog } from './ResultDialog.js';
import { PointsResultDialog } from './PointsResultDialog.js';
import { ScoreboardEditor } from './ScoreboardEditor.js';
import { ScoreboardView } from '../../views/ScoreboardView.js';
import { TournamentEditDialog } from './TournamentEditDialog.js';
import { TournamentActions } from './TournamentActions.js';

/** Beheer van één toernooi: deelnemers, start, uitslagen, volgende ronde en klassement. */
export class TournamentDetailPage extends Page {
  get watches() { return ['tournaments', 'teams', 'players']; }

  render(container, params) {
    this.onResize = () => this.view?.redraw();
    window.addEventListener('resize', this.onResize);
    super.render(container, params);
  }

  destroy() {
    super.destroy();
    window.removeEventListener('resize', this.onResize);
  }

  refresh(entities) {
    if (this.editor?.dirty) return; // onbewaarde deelnemers niet overschrijven
    super.refresh(entities);
  }

  async load() {
    const id = this.params.id;
    const [tournament, standings, games, teams, players, formats] = await Promise.all([
      api.get(`/tournaments/${id}`), api.get(`/tournaments/${id}/standings`), api.get('/games'),
      api.get('/teams'), api.get('/players'), api.get('/templates/formats'),
    ]);
    return { tournament, standings, games, teams, players, formats };
  }

  draw(data) {
    const { tournament: t, games, formats } = data;
    this.tab = this.tab || (t.status === 'draft' ? 'deelnemers' : 'schema');
    const game = games.find((g) => g.id === t.gameId);
    const format = formats.find((f) => f.key === t.formatKey);
    const meta = [format?.label, game?.name, formatDate(t.startTime), t.location].filter(Boolean).join(', ');
    const actions = new TournamentActions(t, {
      onEdit: () => new TournamentEditDialog(t, { games, formats }).open(),
      onDeleted: () => { location.hash = '#/toernooien'; },
    });

    mount(this.container,
      h('a', { href: '#/toernooien', class: 'back' }, 'Alle toernooien'),
      h('div', { class: 'page-head' },
        h('div', {}, h('h2', {}, t.name, ' ', h('span', { class: `status ${t.status}` }, STATUS_LABEL[t.status])), h('div', { class: 'meta' }, meta)),
        actions.render()),
      h('div', { class: 'tabs', role: 'tablist' },
        this.#tab('deelnemers', `Deelnemers (${t.participants.length})`),
        this.#tab('schema', t.formatKey === 'scoreboard' ? 'Punten' : 'Speelschema'),
        this.#tab('stand', 'Klassement')),
      this.#body(data));
  }

  #body({ tournament: t, standings, teams, players }) {
    this.editor = null;
    if (this.tab === 'deelnemers') {
      this.editor = new ParticipantEditor(t, { teams, players });
      return this.editor.render();
    }
    if (this.tab === 'stand') return new StandingsView(standings).render();
    if (t.formatKey === 'scoreboard' && t.state) return this.#scoreboard(t);
    const names = new Map(t.participants.map((p) => [p.id, p.name]));
    this.view = new TournamentView(t, {
      onMatchClick: (m) => new ResultDialog(t, m, names).open(),
      onRoundClick: (r) => new PointsResultDialog(t, r).open(),
    });
    return h('div', {},
      t.status !== 'draft' ? h('p', { class: 'muted' }, 'Klik op een match om de uitslag in te geven of aan te passen.') : null,
      this.view.render());
  }

  #scoreboard(t) {
    this.editor = new ScoreboardEditor(t);
    return h('div', {}, this.editor.render(), h('h3', {}, 'Criteria'), new ScoreboardView(t.state.criteria).render());
  }

  #tab(key, label) {
    return h('button', {
      role: 'tab',
      class: this.tab === key ? 'active' : '',
      'aria-selected': String(this.tab === key),
      onclick: () => {
        if (this.editor?.dirty && !confirm('Je hebt onbewaarde wijzigingen. Toch verdergaan?')) return;
        this.tab = key;
        this.editor = null;
        this.reload();
      },
    }, label);
  }

  onUnauthorized() {
    Toast.show('Je sessie is verlopen, meld opnieuw aan', { error: true });
    location.reload();
  }
}
