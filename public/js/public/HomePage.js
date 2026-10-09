import { h, mount, formatDate } from '../core/dom.js';
import { api } from '../core/Api.js';
import { Page } from '../core/Page.js';
import { Countdown } from '../views/Countdown.js';
import { TournamentRows } from '../views/TournamentRows.js';
import { eventContext } from './context.js';

/** Startpagina: het event in de kijker met aftelling, Discord-link en de toernooien. */
export class HomePage extends Page {
  get watches() { return ['tournaments', 'games', 'events']; }

  destroy() {
    super.destroy();
    this.countdown?.destroy();
  }

  async load() {
    const [tournaments, games] = await Promise.all([api.get(`/tournaments${eventContext.query()}`), api.get('/games')]);
    return { tournaments, games, event: eventContext.current };
  }

  draw({ tournaments, games, event }) {
    this.countdown?.destroy();
    const running = tournaments.filter((t) => t.status === 'running').length;
    mount(this.container,
      event ? this.#hero(event) : this.#noEvent(),
      h('div', { class: 'section-title' },
        h('h2', {}, 'Toernooien'),
        running ? h('span', { class: 'status running' }, `${running} live`) : null),
      new TournamentRows(tournaments, games).render('De toernooien worden binnenkort aangekondigd.'));
  }

  #hero(event) {
    this.countdown = new Countdown(event.startDate, event.endDate);
    const dates = [formatDate(event.startDate), event.endDate ? `tot ${formatDate(event.endDate)}` : null].filter(Boolean).join(' ');
    return h('section', { class: 'hero' },
      h('div', {},
        h('h1', {}, event.name),
        event.tagline ? h('p', { class: 'tagline' }, event.tagline) : null,
        h('div', { class: 'facts' }, dates ? h('span', {}, dates) : null, event.location ? h('span', {}, event.location) : null),
        event.description ? h('p', { class: 'muted' }, event.description) : null,
        h('div', { class: 'actions' },
          event.discordUrl ? h('a', { class: 'btn discord', href: event.discordUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Join de Discord') : null,
          h('a', { class: 'btn', href: '#/zitplan' }, 'Zoek je plaats'),
          h('a', { class: 'btn', href: '#/prijzen' }, 'Bekijk de prijzen'))),
      h('div', {}, this.countdown.render()));
  }

  #noEvent() {
    return h('section', { class: 'hero' },
      h('div', {}, h('h1', {}, 'VIVES LAN'), h('p', { class: 'tagline' }, 'De volgende LAN-party wordt binnenkort aangekondigd.')),
      h('div', {}));
  }
}
