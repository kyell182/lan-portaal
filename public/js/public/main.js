import { Router } from '../core/Router.js';
import { Live } from '../core/Live.js';
import { EventSwitcher } from '../views/EventSwitcher.js';
import { eventContext } from './context.js';
import { HomePage } from './HomePage.js';
import { TournamentListPage } from './TournamentListPage.js';
import { TournamentPage } from './TournamentPage.js';
import { SeatsPage } from './SeatsPage.js';
import { PrizesPage } from './PrizesPage.js';

/** Publieke app: event in de kijker, toernooien, zitplan en prijzen, live bijgewerkt. */
class PublicApp {
  async start() {
    await eventContext.init();

    this.router = new Router(document.getElementById('app'), [
      ['/', HomePage],
      ['/toernooien', TournamentListPage],
      ['/toernooien/:id', TournamentPage],
      ['/zitplan', SeatsPage],
      ['/prijzen', PrizesPage],
    ], '/');

    const switcher = new EventSwitcher(eventContext, { label: 'Andere LAN-editie bekijken' });
    document.getElementById('event-switch').append(switcher.render());
    eventContext.addEventListener('change', () => this.router.reload());

    this.live = new Live(document.getElementById('live'));
    this.live.subscribe(async (entities) => {
      if (entities.has('events')) await eventContext.reload();
      this.router.refresh(entities);
    });
    document.addEventListener('route', (e) => this.#markNav(e.detail));

    this.router.start();
    this.live.start();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  #markNav(path) {
    for (const link of document.querySelectorAll('.nav a')) {
      const target = link.getAttribute('href').slice(1);
      link.classList.toggle('active', target === '/' ? path === '/' : path.startsWith(target));
    }
  }
}

new PublicApp().start();
