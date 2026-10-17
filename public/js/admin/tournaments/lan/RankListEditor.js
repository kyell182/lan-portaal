import { h } from '../../../core/dom.js';
import { playerLabel } from '../../../views/playerLabel.js';

/** Uitslag van een zaalronde invullen: typ een gamertag (met suggesties), de volgorde bepaalt de plaats. Geen limiet op de lengte. */
export class RankListEditor {
  /** Onbewaarde lijsten blijven bewaard als de pagina door een live-update opnieuw getekend wordt. */
  static #drafts = new Map();

  constructor({ draftKey, roster, saved, onSave }) {
    this.draftKey = draftKey;
    this.roster = roster;
    this.onSave = onSave;
    this.order = RankListEditor.#drafts.get(draftKey) ?? [...saved];
    this.el = h('div', {});
    this.#draw(false);
  }

  #draw(focus = true) {
    const taken = new Set(this.order);
    const free = this.roster.all().filter((m) => !taken.has(m.pid));
    const input = h('input', { list: `ranklist-${this.draftKey}`, placeholder: 'Typ een gamertag en druk Enter', 'aria-label': 'Gamertag toevoegen', onkeydown: (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      this.#add(free, input.value);
    } });
    this.el.replaceChildren(
      h('datalist', { id: `ranklist-${this.draftKey}` }, free.map((m) => h('option', { value: m.nickname }, [m.firstName, m.lastName].filter(Boolean).join(' ')))),
      h('div', { class: 'actions' }, input, h('button', { class: 'btn', type: 'button', onclick: () => this.#add(free, input.value) }, 'Toevoegen')),
      this.order.length ? h('ol', { class: 'rank-list' }, this.order.map((pid, i) => this.#row(pid, i))) : h('p', { class: 'muted' }, 'Nog niemand in de uitslag. Wie niet vermeld is, krijgt de "rest"-punten.'),
      h('button', { class: 'btn primary', type: 'button', disabled: !this.order.length, onclick: () => this.#save() }, `Uitslag opslaan (${this.order.length} namen)`));
    if (focus) input.focus();
  }

  #row(pid, index) {
    return h('li', {}, playerLabel(this.roster.member(pid)),
      h('span', { class: 'actions' },
        h('button', { class: 'btn small', type: 'button', 'aria-label': 'Hoger', disabled: index === 0, onclick: () => this.#move(index, -1) }, '▲'),
        h('button', { class: 'btn small', type: 'button', 'aria-label': 'Lager', disabled: index === this.order.length - 1, onclick: () => this.#move(index, 1) }, '▼'),
        h('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Verwijderen', onclick: () => this.#set(this.order.filter((p) => p !== pid)) }, '✕')));
  }

  #add(free, text) {
    const wanted = text.trim().toLowerCase();
    const match = free.find((m) => m.nickname.toLowerCase() === wanted);
    if (match) this.#set([...this.order, match.pid]);
  }

  #move(index, delta) {
    const next = [...this.order];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    this.#set(next);
  }

  #save() {
    RankListEditor.#drafts.delete(this.draftKey);
    this.onSave(this.order);
  }

  #set(order) {
    this.order = order;
    RankListEditor.#drafts.set(this.draftKey, order);
    this.#draw();
  }
}
