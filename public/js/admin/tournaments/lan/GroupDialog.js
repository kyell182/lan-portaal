import { h } from '../../../core/dom.js';
import { Modal } from '../../../core/Modal.js';
import { Toast } from '../../../core/Toast.js';
import { lanAction } from './lanApi.js';
import { LanRoster } from './LanRoster.js';
import { GroupInfoSection } from './GroupInfoSection.js';
import { GroupMatchSection } from './GroupMatchSection.js';

/** Dialoog voor één groep: uitslagen, host, roominfo en no-shows. Blijft open en ververst zichzelf na elke actie. */
export class GroupDialog {
  constructor(tournament, groupId, players, onChanged) {
    this.t = tournament;
    this.groupId = groupId;
    this.players = players;
    this.onChanged = onChanged;
  }

  open() {
    this.body = h('div', { class: 'group-dialog' });
    this.modal = new Modal({ title: this.#group().name, body: this.body, closeLabel: 'Sluiten' }).open();
    this.#draw();
  }

  #group() {
    return this.t.state.groups.find((g) => g.id === this.groupId);
  }

  #draw() {
    const group = this.#group();
    const roster = new LanRoster(this.t, this.players);
    const context = { tournament: this.t, group, roster, run: (action, payload, message) => this.#run(action, payload, message) };
    this.body.replaceChildren(
      ...group.matches.map((match) => new GroupMatchSection({ ...context, match }).render()),
      new GroupInfoSection(context).render());
  }

  async #run(action, payload, message) {
    try {
      this.t = await lanAction(this.t.id, action, payload);
      Toast.show(message);
      this.#draw();
      this.onChanged();
    } catch (err) {
      Toast.error(err);
    }
  }
}
