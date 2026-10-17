import { h } from '../../core/dom.js';
import { playerLabel } from '../../views/playerLabel.js';
import { ResultCard } from './ResultCard.js';
import { RoomPanel } from './RoomPanel.js';

/** Alles over mijn lopende ronde: groep, host, room, eigen spelnaam, uitslag en punten. */
export class MyRoundView {
  constructor(me, run) {
    this.me = me;
    this.round = me.round;
    this.run = run;
  }

  render() {
    if (!this.round) return this.#waiting();
    if (this.round.mode === 'room') return this.#roomRound();
    return h('div', {},
      this.#head(),
      this.#groupPanel(),
      new RoomPanel(this.round.group.room, this.round.iAmHost, this.run, this.round.tournamentId).render(),
      this.round.game?.needsOwnName ? this.#gameName() : null,
      this.round.matches.map((match) => new ResultCard(match, this.round, this.run).render()),
      this.#points());
  }

  /** Zaalronde: iedereen speelt tegelijk, de crew vult de uitslag in. */
  #roomRound() {
    return h('div', {},
      this.#head(),
      new RoomPanel(this.round.room, false, this.run, this.round.tournamentId).render(),
      this.round.game?.needsOwnName ? this.#gameName() : null,
      this.#roomPlace());
  }

  #roomPlace() {
    const { round } = this;
    if (!round.hasResult) return h('section', { class: 'panel' }, h('h3', {}, 'Uitslag'), h('p', { class: 'muted' }, 'De crew vult de uitslag in na afloop.'));
    const result = round.myResult;
    return h('section', { class: 'panel' }, h('h3', {}, 'Mijn plaats'),
      result ? h('p', {}, `Plaats ${result.place}: `, h('strong', {}, `${result.points} punten`)) : null,
      round.iReported
        ? h('p', { class: 'muted' }, 'Je melding is doorgegeven aan de crew.')
        : h('button', { class: 'btn danger', type: 'button', disabled: round.closed, onclick: () => this.#reportPlace() }, 'Mijn plaats klopt niet'));
  }

  #reportPlace() {
    const reason = prompt('Wat klopt er niet? (optioneel)');
    if (reason === null) return;
    this.run((api) => api.post('/rounds/me/room/report', { reason }));
  }

  #waiting() {
    return h('div', {},
      h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, playerLabel(this.me.player)))),
      h('div', { class: 'empty' }, 'Je zit nog niet in een groep. Zodra de crew de groepen maakt, verschijnt je ronde hier.'));
  }

  #head() {
    const { round } = this;
    const sub = [round.game?.name, round.startTime].filter(Boolean).join(' · ');
    return h('div', { class: 'page-head' },
      h('div', {}, h('h1', {}, round.roundNo ? `Ronde ${round.roundNo}` : round.name), h('div', { class: 'meta' }, sub || round.name)),
      h('div', {}, playerLabel(this.me.player)));
  }

  #groupPanel() {
    const { group, seat } = this.round;
    return h('section', { class: 'panel' },
      h('h3', {}, group.name),
      seat ? h('p', { class: 'muted' }, `Jouw plaats: ${seat.zone} ${seat.label}${seat.table ? `, tafel ${seat.table}${seat.side ?? ''}` : ''}`) : null,
      this.round.iAmHost ? h('p', {}, h('span', { class: 'status active' }, 'Jij bent de host')) : null,
      h('ul', { class: 'member-list' }, group.members.map((m) => h('li', {}, playerLabel(m), m.isHost ? h('span', { class: 'status active host-badge' }, 'Host') : null))));
  }

  #gameName() {
    const input = h('input', { value: this.round.myGameName, 'aria-label': 'Mijn naam in dit spel', maxlength: 40 });
    return h('section', { class: 'panel' }, h('h3', {}, 'Mijn naam in dit spel'),
      h('p', { class: 'muted' }, 'Alleen invullen als het spel je een andere naam geeft (bv. Naam#1234).'),
      h('form', { onsubmit: (e) => { e.preventDefault(); this.run((api) => api.put('/rounds/me/game-name', { name: input.value })); } },
        h('label', { class: 'field' }, input), h('button', { class: 'btn', type: 'submit' }, 'Opslaan')));
  }

  #points() {
    const result = this.round.myResult;
    if (!result) return null;
    return h('section', { class: 'panel' }, h('h3', {}, 'Mijn punten'),
      h('p', {}, `Plaats ${result.place} in je groep: `, h('strong', {}, `${result.points} punten`),
        result.provisional ? h('span', { class: 'status active', style: { marginLeft: '8px' } }, 'voorlopig') : null));
  }
}
