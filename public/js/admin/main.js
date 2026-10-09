import { api } from '../core/Api.js';
import { Router } from '../core/Router.js';
import { Live } from '../core/Live.js';
import { EventSwitcher } from '../views/EventSwitcher.js';
import { adminEventContext } from './context.js';
import { LoginView } from './LoginView.js';
import { CrudPage } from './CrudPage.js';
import { TemplatesPage } from './TemplatesPage.js';
import { SeatsAdminPage } from './SeatsAdminPage.js';
import { AdminsPage } from './AdminsPage.js';
import { PluginsPage } from './PluginsPage.js';
import { TournamentsAdminPage } from './tournaments/TournamentsAdminPage.js';
import { TournamentDetailPage } from './tournaments/TournamentDetailPage.js';
import { eventsResource } from './resources/events.js';
import { gamesResource } from './resources/games.js';
import { playersResource } from './resources/players.js';
import { teamsResource } from './resources/teams.js';
import { prizesResource } from './resources/prizes.js';

/** Beheer-app: aanmelden, event kiezen, dan alle beheerpagina's met live updates. */
class AdminApp {
  constructor() {
    this.shell = document.getElementById('shell');
    this.loginEl = document.getElementById('login');
    this.who = document.getElementById('who');
    this.logoutBtn = document.getElementById('logout');
  }

  async start() {
    this.logoutBtn.addEventListener('click', () => this.#logout());
    const { admin } = await api.get('/auth/me');
    if (admin) await this.#enter(admin);
    else this.#showLogin();
  }

  #showLogin() {
    this.shell.classList.add('hidden');
    this.loginEl.classList.remove('hidden');
    new LoginView(this.loginEl, (admin) => this.#enter(admin)).render();
  }

  async #enter(admin) {
    this.loginEl.classList.add('hidden');
    this.shell.classList.remove('hidden');
    this.logoutBtn.classList.remove('hidden');
    this.who.textContent = admin.username;
    await adminEventContext.init();

    const router = new Router(document.getElementById('app'), [
      ['/events', CrudPage.for(eventsResource)],
      ['/toernooien', TournamentsAdminPage],
      ['/toernooien/:id', TournamentDetailPage],
      ['/zitplan', SeatsAdminPage],
      ['/prijzen', CrudPage.for(prizesResource)],
      ['/templates', TemplatesPage],
      ['/games', CrudPage.for(gamesResource)],
      ['/teams', CrudPage.for(teamsResource)],
      ['/spelers', CrudPage.for(playersResource)],
      ['/plugins', PluginsPage],
      ['/admins', AdminsPage],
    ], adminEventContext.id ? '/toernooien' : '/events');

    const switcher = new EventSwitcher(adminEventContext, { label: 'Event om te beheren' }).showAlways();
    document.getElementById('event-switch').append(switcher.render());
    adminEventContext.addEventListener('change', () => router.reload());
    document.addEventListener('route', (e) => this.#markNav(e.detail));

    const live = new Live(document.getElementById('live'));
    live.subscribe(async (entities) => {
      if (entities.has('events')) await adminEventContext.reload();
      router.refresh(entities);
    });
    router.start();
    live.start();
  }

  #markNav(path) {
    for (const link of document.querySelectorAll('.admin-side a')) {
      link.classList.toggle('active', path.startsWith(link.getAttribute('href').slice(1)));
    }
  }

  async #logout() {
    await api.post('/auth/logout');
    location.href = '/admin';
  }
}

new AdminApp().start();
