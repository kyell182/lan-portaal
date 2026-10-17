import { h } from '../../core/dom.js';

const FIELDS = [
  { key: 'code', label: 'Code' },
  { key: 'link', label: 'Link' },
  { key: 'password', label: 'Wachtwoord' },
  { key: 'note', label: 'Opmerking' },
];

/** Roominfo van de groep: iedereen leest ze, de host vult ze in. */
export class RoomPanel {
  /** Wat de host aan het typen is blijft bewaard bij een live-update. */
  static #drafts = new Map();

  constructor(room, iAmHost, run, draftKey) {
    this.room = room;
    this.draftKey = draftKey;
    this.iAmHost = iAmHost;
    this.run = run;
  }

  render() {
    return h('section', { class: 'panel' }, h('h3', {}, 'Room'),
      this.iAmHost ? this.#form() : this.#readOnly());
  }

  #readOnly() {
    const filled = FIELDS.filter((f) => this.room[f.key]);
    if (!filled.length) return h('p', { class: 'muted' }, 'De host heeft de roominfo nog niet ingevuld.');
    return h('dl', { class: 'room-info' }, filled.flatMap((f) => [h('dt', {}, f.label), h('dd', {}, RoomPanel.#value(f.key, this.room[f.key]))]));
  }

  #form() {
    const draft = RoomPanel.#drafts.get(this.draftKey) ?? {};
    const inputs = Object.fromEntries(FIELDS.map((f) => [f.key, h('input', {
      value: draft[f.key] ?? this.room[f.key] ?? '',
      'aria-label': f.label,
      oninput: (e) => RoomPanel.#drafts.set(this.draftKey, { ...RoomPanel.#drafts.get(this.draftKey), [f.key]: e.target.value }),
    })]));
    return h('form', { onsubmit: (e) => { e.preventDefault(); this.#save(inputs); } },
      FIELDS.map((f) => h('label', { class: 'field' }, h('span', {}, f.label), inputs[f.key])),
      h('button', { class: 'btn primary', type: 'submit' }, 'Roominfo opslaan'));
  }

  #save(inputs) {
    const room = Object.fromEntries(FIELDS.map((f) => [f.key, inputs[f.key].value]));
    RoomPanel.#drafts.delete(this.draftKey);
    this.run((api) => api.put('/rounds/me/room', room));
  }

  /** Alleen echte web-links worden klikbaar. */
  static #value(key, value) {
    if (key === 'link' && /^https?:\/\//i.test(value)) return h('a', { href: value, target: '_blank', rel: 'noopener noreferrer' }, value);
    return value;
  }
}
