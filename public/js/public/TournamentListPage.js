import { h, mount } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { TournamentRows } from '../views/TournamentRows.js';
import { eventContext } from './context.js';

/** Overzicht van alle toernooien van het bekeken event. */
export class TournamentListPage extends Page {
  get watches() { return ['tournaments', 'games']; }

  async load() {
    const [tournaments, games] = await Promise.all([api.get(`/tournaments${eventContext.query()}`), api.get('/games')]);
    return { tournaments, games };
  }

  draw({ tournaments, games }) {
    mount(this.container,
      h('div', { class: 'page-head' },
        h('div', {}, h('h1', {}, 'Toernooien'), h('div', { class: 'meta' }, eventContext.current?.name || 'Brackets en klassementen worden live bijgewerkt.'))),
      new TournamentRows(tournaments, games).render('Er zijn nog geen toernooien. Kom later terug!'));
  }
}
