import { h } from '../../../core/dom.js';
import { LanRoster } from './LanRoster.js';
import { GroupsBoard } from './GroupsBoard.js';
import { GroupDialog } from './GroupDialog.js';
import { RoomAdminPanel } from './RoomAdminPanel.js';

/** Beheerweergave van een LAN-ronde: de groepenpagina of, voor een zaalronde, het zaalpaneel. */
export class LanRoundAdmin {
  /** @param players alle spelers van het event (voor de echte namen) @param onChanged herlaadt de pagina */
  constructor(tournament, players, onChanged) {
    this.t = tournament;
    this.players = players;
    this.onChanged = onChanged;
    this.roster = new LanRoster(tournament, players);
  }

  render() {
    if (this.t.status === 'draft') return h('div', { class: 'empty' }, 'Start het toernooi om groepen te maken of de uitslag in te vullen.');
    if (this.t.state.mode === 'room') return new RoomAdminPanel(this.t, this.roster, this.onChanged).render();
    return new GroupsBoard(this.t, this.roster, {
      onOpen: (group) => new GroupDialog(this.t, group.id, this.players, this.onChanged).open(),
      onChanged: this.onChanged,
    }).render();
  }
}
