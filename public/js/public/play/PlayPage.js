import { mount } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Page } from '../../core/Page.js';
import { Toast } from '../../core/Toast.js';
import { ClaimView } from './ClaimView.js';
import { MyRoundView } from './MyRoundView.js';

/** "Mijn ronde": eerst je gamertag kiezen, daarna je groep, host, roominfo en uitslag van de lopende ronde. */
export class PlayPage extends Page {
  get watches() { return ['players', 'tournaments', 'seats', 'games']; }

  async load() {
    const { player } = await api.get('/player-auth/me');
    if (!player) return { player: null, available: await api.get('/player-auth/available') };
    return { player, me: await api.get('/rounds/me') };
  }

  draw({ player, available, me }) {
    this.tournamentId = me?.round?.tournamentId ?? null;
    this.roundClosed = !!me?.round?.closed;
    if (!player) {
      this.claimView ??= new ClaimView((id) => this.#claim(id));
      mount(this.container, this.claimView.render(available));
      return;
    }
    this.claimView = null;
    mount(this.container, new MyRoundView(me, (call) => this.#run(call)).render());
  }

  /** 70 telefoons mogen niet bij elke wijziging herladen: enkel als het hun eigen toernooi is, of als hun ronde afgelopen is (dan kan de volgende starten). */
  refresh(entities, changes = []) {
    if (this.#affectsMe(entities, changes)) this.reload();
  }

  #affectsMe(entities, changes) {
    if (['players', 'seats', 'games'].some((entity) => entities.has(entity))) return true;
    const mine = (c) => !this.tournamentId || this.roundClosed || !c.id || c.id === this.tournamentId;
    return changes.some((c) => c.entity === 'tournaments' && mine(c));
  }

  async #claim(playerId) {
    try {
      await api.post('/player-auth/claim', { playerId });
      this.reload();
    } catch (err) {
      Toast.error(err);
      this.reload();
    }
  }

  async #run(call) {
    try {
      await call(api);
    } catch (err) {
      Toast.error(err);
    }
    this.reload();
  }
}
