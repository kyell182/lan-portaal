import { h } from '../core/dom.js';
import { BracketView } from './BracketView.js';
import { MatchListView } from './MatchListView.js';
import { PointsRoundsView } from './PointsRoundsView.js';
import { ScoreboardView } from './ScoreboardView.js';
import { BYE } from './MatchCard.js';

const BRACKET_TITLES = { W: 'Winners-bracket', L: 'Losers-bracket', GF: 'Grand final', '3P': null };

/**
 * Kiest per toernooivorm de juiste weergave van het speelschema.
 * Gebruikt door zowel de publieke pagina als het admin-paneel (met klik-handlers).
 */
export class TournamentView {
  constructor(tournament, { onMatchClick, onRoundClick } = {}) {
    this.t = tournament;
    this.names = new Map(tournament.participants.map((p) => [p.id, p.name]));
    this.onMatchClick = onMatchClick;
    this.onRoundClick = onRoundClick;
    this.brackets = [];
  }

  render() {
    const { state, formatKey } = this.t;
    if (!state) return h('div', { class: 'empty' }, 'Het schema verschijnt zodra het toernooi gestart is.');
    if (formatKey === 'points') return new PointsRoundsView({ rounds: state.rounds, names: this.names, onRoundClick: this.onRoundClick }).render();
    if (formatKey === 'scoreboard') return new ScoreboardView(state.criteria).render();
    if (formatKey === 'single-elimination' || formatKey === 'double-elimination') return this.#brackets(state.matches);
    if (formatKey === 'groups-knockout') return this.#groupsKnockout(state);
    return this.#list(state.matches);
  }

  redraw() {
    this.brackets.forEach((b) => b.drawCables());
  }

  #brackets(matches) {
    const parts = ['W', 'L', 'GF'].map((key) => {
      const subset = matches.filter((m) => m.bracket === key || (key === 'W' && m.bracket === '3P'));
      if (!subset.length) return null;
      const title = matches.some((m) => m.bracket === 'L') ? BRACKET_TITLES[key] : null;
      return this.#bracket(title, subset.filter((m) => m.status !== 'skipped' || m.bracket !== 'GF'));
    });
    return h('div', {}, parts);
  }

  #bracket(title, all) {
    // Byes worden automatisch afgehandeld; ze tonen maakt de bracket enkel onoverzichtelijk.
    const matches = all.filter((m) => !m.slots.some((s) => s.pid === BYE));
    const view = new BracketView({ title, matches, names: this.names, onMatchClick: this.onMatchClick });
    this.brackets.push(view);
    return view.render();
  }

  #groupsKnockout(state) {
    const groups = state.matches.filter((m) => m.stage === 'groups');
    const knockout = state.matches.filter((m) => m.stage === 'knockout');
    return h('div', {},
      knockout.length ? this.#bracket('Knock-out', knockout) : null,
      h('h2', {}, 'Poulefase'),
      new MatchListView({ matches: groups, names: this.names, onMatchClick: this.onMatchClick, groupBy: (m) => `Poule ${m.group}` }).render());
  }

  #list(matches) {
    return new MatchListView({ matches, names: this.names, onMatchClick: this.onMatchClick }).render();
  }
}
