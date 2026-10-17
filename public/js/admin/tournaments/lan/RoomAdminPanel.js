import { h } from '../../../core/dom.js';
import { Toast } from '../../../core/Toast.js';
import { lanAction } from './lanApi.js';
import { RankListEditor } from './RankListEditor.js';

const ROOM_FIELDS = [
  { key: 'code', label: 'Code' },
  { key: 'link', label: 'Link' },
  { key: 'password', label: 'Wachtwoord' },
  { key: 'note', label: 'Opmerking' },
];

/** Beheer van een zaalronde (iedereen speelt tegelijk): roominfo, uitslag invullen, meldingen, sluiten en plan B. */
export class RoomAdminPanel {
  constructor(tournament, roster, onChanged) {
    this.t = tournament;
    this.roster = roster;
    this.onChanged = onChanged;
  }

  render() {
    const { room, closed } = this.t.state;
    return h('div', {},
      closed ? h('p', { class: 'status finished' }, 'Deze ronde is gesloten') : null,
      this.#info(room.info),
      this.#result(room),
      this.#reports(room.reports),
      this.#footer(room, closed));
  }

  #info(info) {
    const inputs = Object.fromEntries(ROOM_FIELDS.map((f) => [f.key, h('input', { value: info[f.key] ?? '', 'aria-label': f.label })]));
    return h('section', { class: 'panel' }, h('h3', {}, 'Roominfo voor de zaal'),
      ROOM_FIELDS.map((f) => h('label', { class: 'field' }, h('span', {}, f.label), inputs[f.key])),
      h('button', { class: 'btn', type: 'button', onclick: () => this.#run('room', Object.fromEntries(ROOM_FIELDS.map((f) => [f.key, inputs[f.key].value])), 'Roominfo opgeslagen') }, 'Roominfo opslaan'));
  }

  #result(room) {
    return h('section', { class: 'panel' }, h('h3', {}, 'Uitslag'),
      h('p', { class: 'muted' }, 'Vul de top in van 1e naar laatste. Wie niet vermeld is, krijgt de "rest"-punten.'),
      new RankListEditor({
        draftKey: `room-${this.t.id}`,
        roster: this.roster,
        saved: room.order,
        onSave: (order) => this.#run('roomresult', { order }, 'Uitslag opgeslagen'),
      }).el);
  }

  #reports(reports) {
    if (!reports.length) return null;
    return h('section', { class: 'panel' }, h('h3', {}, `Meldingen (${reports.length})`),
      reports.map((r) => h('p', { class: 'report' }, `${this.roster.member(r.pid).nickname}: ${r.reason || 'Mijn plaats klopt niet'}`)),
      h('p', { class: 'muted' }, 'Pas de uitslag aan en sla hem opnieuw op: dat wist de meldingen.'));
  }

  #footer(room, closed) {
    return h('div', { class: 'actions' },
      closed
        ? h('button', { class: 'btn', onclick: () => this.#run('reopen', {}, 'Ronde heropend') }, 'Ronde heropenen')
        : h('button', { class: 'btn', disabled: !room.order.length, onclick: () => this.#close(room) }, 'Ronde sluiten'),
      closed || room.order.length ? null : h('button', { class: 'btn danger', onclick: () => this.#convert() }, 'Zaal werkt niet: omzetten naar groepen van 8'));
  }

  async #close(room) {
    if (room.reports.length && !confirm(`${room.reports.length} melding(en) staan nog open. Toch sluiten?`)) return;
    await this.#run('close', { force: true }, 'Ronde gesloten');
  }

  async #convert() {
    if (!confirm('De zaalronde wordt omgezet naar willekeurige groepen met een host per groep. Doorgaan?')) return;
    await this.#run('convertToGroups', {}, 'Omgezet naar groepen');
  }

  async #run(action, payload, message) {
    try {
      await lanAction(this.t.id, action, payload);
      Toast.show(message);
      this.onChanged();
    } catch (err) {
      Toast.error(err);
    }
  }
}
