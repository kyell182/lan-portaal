import { h } from '../../core/dom.js';
import { playerLabel } from '../../views/playerLabel.js';
import { OrderPicker } from './OrderPicker.js';

const STATUS_LABEL = { open: 'Wacht op uitslag', submitted: 'Ingestuurd, wacht op controle', confirmed: 'Bevestigd', disputed: 'Betwist' };
const EDITABLE = new Set(['open', 'submitted', 'disputed']);

/** Eén match van mijn groep: de host stuurt de volgorde in, de anderen drukken OK of Melden. */
export class ResultCard {
  /** @param run functie die een API-aanroep uitvoert en daarna herlaadt */
  constructor(match, round, run) {
    this.match = match;
    this.round = round;
    this.run = run;
    this.members = new Map(round.group.members.map((m) => [m.pid, m]));
  }

  render() {
    const { match } = this;
    return h('section', { class: 'panel result-card' },
      h('div', { class: 'page-head' }, h('h3', {}, `Match ${match.no}`), h('span', { class: `status ${match.status}` }, STATUS_LABEL[match.status])),
      match.order.length ? this.#order() : null,
      this.round.iAmHost ? this.#hostPart() : this.#playerPart());
  }

  #order() {
    return h('ol', { class: 'result-order' }, this.match.order.map((pid) => h('li', {}, this.members.has(pid) ? playerLabel(this.members.get(pid)) : '?')));
  }

  #hostPart() {
    const { match } = this;
    return h('div', {},
      match.status === 'open' ? null : this.#progress(),
      ...match.reports.map((r) => h('p', { class: 'report' }, `Melding van ${this.members.get(r.pid)?.nickname ?? '?'}: ${r.reason || 'geen reden opgegeven'}`)),
      EDITABLE.has(match.status) && !this.round.closed
        ? new OrderPicker(this.round.group.members, this.#pickerOptions()).el
        : null);
  }

  #playerPart() {
    const { match } = this;
    if (match.status === 'open') return h('p', { class: 'muted' }, 'De host stuurt de uitslag zo meteen in.');
    return h('div', {}, this.#progress(), match.canCheck && EDITABLE.has(match.status) && !this.round.closed ? this.#buttons() : null);
  }

  #progress() {
    const { match } = this;
    if (match.status === 'confirmed') return h('p', { class: 'muted' }, 'Bevestigd, de punten zijn definitief.');
    return h('p', { class: 'muted' }, `${match.okCount} van ${match.reviewerCount} OK${match.reportCount ? `, ${match.reportCount} gemeld` : ''}`);
  }

  #buttons() {
    const { match } = this;
    return h('div', { class: 'actions check-buttons' },
      h('button', { class: `btn primary big${match.myCheck === 'ok' ? ' chosen' : ''}`, type: 'button', onclick: () => this.run((api) => api.post(`/rounds/me/matches/${match.no}/confirm`)) }, 'OK, klopt'),
      h('button', { class: `btn danger big${match.myCheck === 'report' ? ' chosen' : ''}`, type: 'button', onclick: () => this.#dispute() }, 'Melden, fout'));
  }

  #pickerOptions() {
    return {
      draftKey: `${this.round.tournamentId}:${this.match.no}`,
      submitLabel: this.match.status === 'open' ? 'Uitslag insturen' : 'Opnieuw insturen',
      onSubmit: (order) => this.#submit(order),
    };
  }

  #submit(order) {
    this.run((api) => api.post(`/rounds/me/matches/${this.match.no}/result`, { order }));
  }

  #dispute() {
    const reason = prompt('Wat klopt er niet? (optioneel)');
    if (reason === null) return;
    this.run((api) => api.post(`/rounds/me/matches/${this.match.no}/dispute`, { reason }));
  }
}
