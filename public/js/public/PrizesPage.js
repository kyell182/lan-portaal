import { h, mount } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { PrizeListView } from '../views/PrizeListView.js';
import { eventContext } from './context.js';

/** Prijzen en shop van het bekeken event. */
export class PrizesPage extends Page {
  get watches() { return ['prizes', 'tournaments']; }

  async load() {
    const query = eventContext.query();
    const [prizes, tournaments] = await Promise.all([api.get(`/prizes${query}`), api.get(`/tournaments${query}`)]);
    return { prizes, tournaments };
  }

  draw(data) {
    mount(this.container, h('div', { class: 'page-head' }, h('h1', {}, 'Prijzen')), new PrizeListView(data).render());
  }
}
