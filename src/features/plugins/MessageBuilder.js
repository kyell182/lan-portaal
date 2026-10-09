/**
 * Zet een domeinmelding om in een neutraal bericht { type, title, text, fields, url, color }.
 * Plugins vertalen dat bericht naar hun eigen formaat (Discord-embed, JSON...).
 */
class MessageBuilder {
  constructor(publicUrl = '') {
    this.publicUrl = publicUrl.replace(/\/$/, '');
  }

  build(notification) {
    const builder = this.#builders[notification.type];
    return builder ? { type: notification.type, ...builder(notification) } : null;
  }

  #link(path) {
    return this.publicUrl ? `${this.publicUrl}/#${path}` : null;
  }

  #builders = {
    'event.activated': ({ event }) => ({
      title: `🎮 ${event.name}`,
      text: [event.tagline, event.location && `📍 ${event.location}`, event.startDate && `🕒 ${MessageBuilder.date(event.startDate)}`].filter(Boolean).join('\n'),
      url: this.#link('/'),
      color: 'vives',
    }),
    'tournament.started': ({ tournament, game }) => ({
      title: `▶️ ${tournament.name} is gestart`,
      text: `${tournament.participants.length} deelnemers${game ? ` in ${game.name}` : ''}. Veel succes iedereen!`,
      url: this.#link(`/toernooien/${tournament.id}`),
      color: 'cyan',
    }),
    'match.reported': ({ tournament, match, names }) => {
      const [a, b] = match.slots;
      const score = a.score !== null && b.score !== null ? `${a.score} – ${b.score}` : 'forfait';
      const name = (pid) => names[pid] || '?';
      return {
        title: `${tournament.name}: ${match.label || 'uitslag'}`,
        text: match.draw
          ? `${name(a.pid)} en ${name(b.pid)} spelen gelijk (${score})`
          : `**${name(match.winner)}** wint van ${name(match.loser)} (${score})`,
        url: this.#link(`/toernooien/${tournament.id}`),
        color: 'neutral',
      };
    },
    'round.reported': ({ tournament, round, names }) => ({
      title: `${tournament.name}: ${round.label}`,
      text: [...round.entries].sort((x, y) => x.place - y.place).slice(0, 5)
        .map((e) => `${e.place}. ${names[e.pid] || '?'} (${e.points} ptn)`).join('\n'),
      url: this.#link(`/toernooien/${tournament.id}`),
      color: 'neutral',
    }),
    'tournament.finished': ({ tournament, podium }) => ({
      title: `🏆 ${podium[0]?.name || 'Winnaar'} wint ${tournament.name}!`,
      text: podium.map((row) => `${['🥇', '🥈', '🥉'][row.place - 1] || `${row.place}.`} ${row.name}`).join('\n'),
      url: this.#link(`/toernooien/${tournament.id}`),
      color: 'gold',
    }),
  };

  static date(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });
  }
}

module.exports = MessageBuilder;
