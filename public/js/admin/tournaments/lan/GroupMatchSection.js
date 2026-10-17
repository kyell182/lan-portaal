import { h } from '../../../core/dom.js';
import { playerLabel } from '../../../views/playerLabel.js';
import { OrderPicker } from '../../../views/OrderPicker.js';
import { MATCH_STATUS_LABEL } from './lanApi.js';

const CHECK_LABEL = { ok: 'OK', report: 'Gemeld' };
const CONFIRMED_BY_LABEL = { players: 'de groep', auto: 'automatisch', crew: 'de crew' };

/** Eén match van een groep in het beheer: uitslag, wie OK/Melden drukte, bevestigen of corrigeren door de crew. */
export class GroupMatchSection {
  /** @param run (actie, payload, melding) => Promise */
  constructor({ tournament, group, match, roster, run }) {
    this.t = tournament;
    this.group = group;
    this.match = match;
    this.roster = roster;
    this.run = run;
  }

  render() {
    const { match } = this;
    return h('section', { class: 'panel' },
      h('h3', {}, `Match ${match.no} `, h('span', { class: `status ${match.status}` }, MATCH_STATUS_LABEL[match.status])),
      match.confirmedBy ? h('p', { class: 'muted' }, `Bevestigd door ${CONFIRMED_BY_LABEL[match.confirmedBy]}.`) : null,
      match.order.length ? this.#order() : null,
      match.status === 'open' ? null : this.#checks(),
      this.#confirmButton(),
      h('h4', {}, match.status === 'open' ? 'Uitslag invoeren als crew' : 'Uitslag corrigeren als crew'),
      this.#picker(),
      this.#log());
  }

  #order() {
    return h('ol', { class: 'result-order' }, this.match.order.map((pid) => h('li', {}, playerLabel(this.roster.member(pid)))));
  }

  #checks() {
    const reviewers = this.group.pids.filter((p) => !this.group.removed.includes(p) && p !== this.group.hostPid);
    const reasons = new Map(this.match.reports.map((r) => [r.pid, r.reason]));
    return h('ul', { class: 'member-list' }, reviewers.map((pid) => {
      const choice = this.match.checks[pid];
      return h('li', {}, playerLabel(this.roster.member(pid)),
        h('span', { class: choice === 'report' ? 'report' : 'muted' }, choice ? `${CHECK_LABEL[choice]}${reasons.get(pid) ? `: ${reasons.get(pid)}` : ''}` : 'Nog niet gekozen'));
    }));
  }

  #confirmButton() {
    if (!['submitted', 'disputed'].includes(this.match.status)) return null;
    return h('button', { class: 'btn primary', type: 'button', onclick: () => this.run(`confirm:${this.group.id}:${this.match.no}`, {}, 'Uitslag bevestigd') }, 'Bevestigen als crew');
  }

  #picker() {
    const members = this.roster.members(this.group.pids.filter((p) => !this.group.removed.includes(p)));
    return new OrderPicker(members, {
      draftKey: `admin:${this.t.id}:${this.group.id}:${this.match.no}`,
      submitLabel: 'Uitslag opslaan (bevestigd)',
      onSubmit: (order) => this.run(`submit:${this.group.id}:${this.match.no}`, { order }, 'Uitslag opgeslagen'),
    }).el;
  }

  #log() {
    if (!this.match.log.length) return null;
    return h('details', {}, h('summary', {}, `Logboek (${this.match.log.length})`),
      h('ul', { class: 'log' }, this.match.log.map((entry) => h('li', { class: 'muted' },
        `${new Date(entry.at).toLocaleTimeString('nl-BE')}: ${this.#who(entry.by)} ${entry.type}${entry.detail ? ` (${entry.detail})` : ''}`))));
  }

  #who(by) {
    return by === 'crew' ? 'crew' : this.roster.member(by).nickname;
  }
}
