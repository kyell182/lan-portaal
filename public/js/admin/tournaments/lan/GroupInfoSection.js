import { h } from '../../../core/dom.js';
import { playerLabel } from '../../../views/playerLabel.js';
import { OrderPicker } from '../../../views/OrderPicker.js';

const ROOM_FIELDS = [
  { key: 'code', label: 'Code' },
  { key: 'link', label: 'Link' },
  { key: 'password', label: 'Wachtwoord' },
  { key: 'note', label: 'Opmerking' },
];

/** Groep zelf beheren: host wisselen, roominfo, no-show verwijderen en gelijke stand beslissen. */
export class GroupInfoSection {
  constructor({ tournament, group, roster, run }) {
    this.t = tournament;
    this.group = group;
    this.roster = roster;
    this.run = run;
  }

  render() {
    return h('div', {}, this.#members(), this.#host(), this.#room(), this.group.matches.length > 1 ? this.#tieBreak() : null);
  }

  #active() {
    return this.group.pids.filter((pid) => !this.group.removed.includes(pid));
  }

  #members() {
    return h('section', { class: 'panel' }, h('h3', {}, 'Spelers'),
      h('ul', { class: 'member-list' }, this.#active().map((pid) => h('li', {},
        h('span', {}, playerLabel(this.roster.member(pid)), pid === this.group.hostPid ? h('span', { class: 'status active host-badge' }, 'Host') : null),
        h('button', { class: 'btn small danger', type: 'button', onclick: () => this.#remove(pid) }, 'No-show')))),
      this.group.removed.length ? h('p', { class: 'muted' }, `Verwijderd: ${this.group.removed.map((p) => this.roster.member(p).nickname).join(', ')}`) : null);
  }

  #host() {
    const select = h('select', { 'aria-label': 'Host' }, this.#active().map((pid) => h('option', { value: pid, selected: pid === this.group.hostPid }, this.roster.member(pid).nickname)));
    return h('section', { class: 'panel' }, h('h3', {}, 'Host'),
      h('div', { class: 'actions' }, select,
        h('button', { class: 'btn', type: 'button', onclick: () => this.run(`host:${this.group.id}`, { pid: select.value }, 'Host gewijzigd') }, 'Host wisselen')));
  }

  #room() {
    const inputs = Object.fromEntries(ROOM_FIELDS.map((f) => [f.key, h('input', { value: this.group.room[f.key] ?? '', 'aria-label': f.label })]));
    return h('section', { class: 'panel' }, h('h3', {}, 'Roominfo'),
      ROOM_FIELDS.map((f) => h('label', { class: 'field' }, h('span', {}, f.label), inputs[f.key])),
      h('button', { class: 'btn', type: 'button', onclick: () => this.run(`room:${this.group.id}`, Object.fromEntries(ROOM_FIELDS.map((f) => [f.key, inputs[f.key].value])), 'Roominfo opgeslagen') }, 'Roominfo opslaan'));
  }

  #tieBreak() {
    return h('details', { class: 'panel' }, h('summary', {}, 'Gelijke stand beslissen'),
      h('p', { class: 'muted' }, 'Zet de spelers die gelijk staan in de gewenste volgorde (beste eerst).'),
      new OrderPicker(this.roster.members(this.#active()), {
        draftKey: `admin:tiebreak:${this.t.id}:${this.group.id}`,
        submitLabel: 'Beslissing opslaan',
        onSubmit: (order) => this.run(`tiebreak:${this.group.id}`, { order }, 'Beslissing opgeslagen'),
      }).el);
  }

  #remove(pid) {
    if (!confirm(`${this.roster.member(pid).nickname} als no-show verwijderen? De groepen worden niet herschud.`)) return;
    this.run(`remove:${this.group.id}`, { pid }, 'Speler verwijderd');
  }
}
