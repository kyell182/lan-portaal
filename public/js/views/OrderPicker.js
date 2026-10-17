import { h } from '../core/dom.js';
import { playerLabel } from './playerLabel.js';

/** De host tikt de spelers aan in volgorde van eindklassering (1e eerst). Wie afwezig is, tikt hij niet aan. */
export class OrderPicker {
  /** Halve keuzes blijven bewaard als de pagina door een live-update opnieuw getekend wordt. */
  static #drafts = new Map();

  constructor(members, { draftKey, submitLabel, onSubmit }) {
    this.members = members;
    this.draftKey = draftKey;
    this.submitLabel = submitLabel;
    this.onSubmit = onSubmit;
    const known = new Set(members.map((m) => m.pid));
    this.order = (OrderPicker.#drafts.get(draftKey) ?? []).filter((pid) => known.has(pid));
    this.el = h('div', { class: 'order-picker' });
    this.#draw();
  }

  #draw() {
    this.el.replaceChildren(
      h('div', { class: 'muted' }, 'Tik de spelers aan van 1e naar laatste. Afwezigen laat je weg.'),
      h('div', { class: 'order-grid' }, this.members.map((m) => this.#button(m))),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', disabled: !this.order.length, onclick: () => { this.#set([]); } }, 'Wissen'),
        h('button', { class: 'btn primary', type: 'button', disabled: !this.order.length, onclick: () => { const order = this.order; OrderPicker.#drafts.delete(this.draftKey); this.onSubmit(order); } }, this.submitLabel)));
  }

  #button(member) {
    const place = this.order.indexOf(member.pid) + 1;
    return h('button', { class: `btn order-item${place ? ' picked' : ''}`, type: 'button', onclick: () => this.#toggle(member.pid) },
      h('span', { class: 'order-place' }, place || '·'), playerLabel(member));
  }

  #toggle(pid) {
    this.#set(this.order.includes(pid) ? this.order.filter((p) => p !== pid) : [...this.order, pid]);
  }

  #set(order) {
    this.order = order;
    OrderPicker.#drafts.set(this.draftKey, order);
    this.#draw();
  }
}
