import { h, mount } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { ServerTilesView } from '../views/ServerTilesView.js';
import { eventContext } from './context.js';

/** Servers en gegevens buiten de toernooien, van het bekeken event. */
export class ServersPage extends Page {
  get watches() { return ['servers']; }

  load() {
    return api.get(`/servers${eventContext.query()}`);
  }

  draw(servers) {
    mount(this.container, h('div', { class: 'page-head' }, h('h1', {}, 'Servers')), new ServerTilesView(servers).render());
  }
}
