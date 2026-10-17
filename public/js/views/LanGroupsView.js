import { h } from '../core/dom.js';

const STATUS_LABEL = { open: 'Open', submitted: 'Ingestuurd', confirmed: 'Bevestigd', disputed: 'Betwist' };

/** Publieke weergave van een LAN-ronde: de groepen met hun spelers, of bij een zaalronde de room-info voor de tv's. */
export class LanGroupsView {
  constructor(tournament) {
    this.t = tournament;
    this.names = new Map(tournament.participants.map((p) => [p.id, p.name]));
  }

  render() {
    const { state } = this.t;
    if (state.mode === 'room') return this.#room(state.room.info);
    if (!state.groups.length) return h('div', { class: 'empty' }, 'De groepen verschijnen zodra de crew ze gemaakt heeft.');
    return h('div', { class: 'group-cards' }, state.groups.map((group) => this.#group(group)));
  }

  #room(info) {
    const filled = [['Code', info.code], ['Link', info.link], ['Wachtwoord', info.password], ['Opmerking', info.note]].filter(([, value]) => value);
    return h('section', { class: 'panel' }, h('h3', {}, 'Iedereen speelt tegelijk in dezelfde room'),
      filled.length
        ? h('dl', { class: 'room-info' }, filled.flatMap(([label, value]) => [h('dt', {}, label), h('dd', {}, value)]))
        : h('p', { class: 'muted' }, 'De roominfo verschijnt hier zodra de crew ze invult.'));
  }

  #group(group) {
    const active = group.pids.filter((pid) => !group.removed.includes(pid));
    return h('section', { class: 'panel' },
      h('h3', {}, group.name, ' ', ...group.matches.map((m) => h('span', { class: `status ${m.status}`, style: { marginLeft: '6px' } }, STATUS_LABEL[m.status]))),
      h('ul', { class: 'member-list' }, active.map((pid) => h('li', {},
        this.names.get(pid) ?? '?', pid === group.hostPid ? h('span', { class: 'status active host-badge' }, 'Host') : null))));
  }
}
