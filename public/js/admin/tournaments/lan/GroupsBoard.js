import { h } from '../../../core/dom.js';
import { Toast } from '../../../core/Toast.js';
import { lanAction, MATCH_STATUS_LABEL } from './lanApi.js';

const COLUMNS = ['open', 'submitted', 'confirmed', 'disputed'];

/** Overzicht van alle groepen in vier kolommen (open, ingestuurd, bevestigd, betwist) met knoppen voor de ronde. */
export class GroupsBoard {
  /** @param handlers { onOpen(group), onChanged() } */
  constructor(tournament, roster, handlers) {
    this.t = tournament;
    this.roster = roster;
    this.handlers = handlers;
  }

  render() {
    const { state } = this.t;
    return h('div', {},
      state.closed ? h('p', { class: 'status finished' }, 'Deze ronde is gesloten') : null,
      this.#toolbar(),
      this.#conflicts(),
      this.#disputes(),
      h('div', { class: 'board' }, COLUMNS.map((status) => this.#column(status))));
  }

  #toolbar() {
    const { state } = this.t;
    const started = state.groups.some((g) => g.matches.some((m) => m.status !== 'open'));
    return h('div', { class: 'actions board-actions' },
      state.closed ? null : h('button', { class: 'btn primary', disabled: started, title: started ? 'Er is al een uitslag ingestuurd' : '', onclick: () => this.#generate() },
        state.groups.length ? 'Groepen opnieuw genereren' : 'Genereer groepen'),
      state.closed
        ? h('button', { class: 'btn', onclick: () => this.#run('reopen', {}, 'Ronde heropend') }, 'Ronde heropenen')
        : h('button', { class: 'btn', disabled: !state.groups.length, onclick: () => this.#close() }, 'Ronde sluiten'));
  }

  #conflicts() {
    const { seatConflicts } = this.t.state;
    if (!seatConflicts) return null;
    return h('p', { class: 'report' }, `${seatConflicts} ${seatConflicts === 1 ? 'koppel zit' : 'koppels zitten'} nog naast of tegenover elkaar. Wissel ter plaatse of genereer opnieuw.`);
  }

  #disputes() {
    const disputed = this.#cards().filter(({ match }) => match.status === 'disputed');
    if (!disputed.length) return null;
    return h('section', { class: 'panel' }, h('h3', {}, 'Betwiste uitslagen'),
      disputed.map(({ group, match }) => h('p', { class: 'report' }, `${group.name}, match ${match.no}: `,
        match.reports.map((r) => `${this.roster.member(r.pid).nickname}: ${r.reason || 'geen reden'}`).join(' · '))));
  }

  #column(status) {
    const cards = this.#cards().filter(({ match }) => match.status === status);
    return h('div', { class: `board-column ${status}` },
      h('h3', {}, `${MATCH_STATUS_LABEL[status]} (${cards.length})`),
      cards.map(({ group, match }) => this.#card(group, match)));
  }

  #card(group, match) {
    const reviewers = group.pids.filter((p) => !group.removed.includes(p) && p !== group.hostPid);
    const ok = reviewers.filter((p) => match.checks[p] === 'ok').length;
    return h('button', { class: 'board-card', type: 'button', onclick: () => this.handlers.onOpen(group) },
      h('strong', {}, `${group.name}, match ${match.no}`),
      h('span', { class: 'muted' }, `Host: ${group.hostPid ? this.roster.member(group.hostPid).nickname : 'geen'}`),
      match.status === 'open' ? null : h('span', { class: 'muted' }, `${ok} van ${reviewers.length} OK${match.reports.length ? `, ${match.reports.length} gemeld` : ''}`));
  }

  #cards() {
    return this.t.state.groups.flatMap((group) => group.matches.map((match) => ({ group, match })));
  }

  async #generate() {
    if (this.t.state.groups.length && !confirm('De groepen worden opnieuw willekeurig verdeeld. Doorgaan?')) return;
    await this.#run('generate', {}, 'Groepen gegenereerd');
  }

  async #close() {
    const open = this.#cards().filter(({ match }) => match.status !== 'confirmed').length;
    if (open && !confirm(`${open} uitslag(en) zijn nog niet bevestigd. Toch sluiten?`)) return;
    await this.#run('close', { force: true }, 'Ronde gesloten');
  }

  async #run(action, payload, message) {
    try {
      await lanAction(this.t.id, action, payload);
      Toast.show(message);
      this.handlers.onChanged();
    } catch (err) {
      Toast.error(err);
    }
  }
}
