import { h } from '../../core/dom.js';

const HIGHLIGHT = '*';
const COLUMN_SEPARATOR = '|';
const JOIN_HINT = {
  link: 'Spelers komen binnen via een link.',
  code: 'Spelers komen binnen met een code.',
  'code+password': 'Spelers komen binnen met een code en een wachtwoord.',
  'link+password': 'Spelers komen binnen via een link en een wachtwoord.',
};

/** Host-kaart: de stappen en roominstellingen van de game. Instellingen met een * vooraan wijken af en lichten op (goud). */
export class HostCard {
  constructor(game) {
    this.game = game;
  }

  /** null als de game geen host-informatie heeft. */
  render() {
    const steps = HostCard.#lines(this.game?.hostSteps);
    const settings = HostCard.#lines(this.game?.hostSettings);
    if (!steps.length && !settings.length) return null;
    return h('section', { class: 'panel host-card' },
      h('h3', {}, `Host-kaart: ${this.game.name}`),
      this.game.joinMethod ? h('p', { class: 'muted' }, JOIN_HINT[this.game.joinMethod]) : null,
      steps.length ? h('ol', { class: 'host-steps' }, steps.map((step) => h('li', {}, step))) : null,
      settings.length ? this.#settings(settings) : null);
  }

  #settings(lines) {
    return h('table', { class: 'data host-settings' }, h('tbody', {}, lines.map((line) => HostCard.#settingRow(line))));
  }

  static #settingRow(line) {
    const changed = line.startsWith(HIGHLIGHT);
    const [label, value, note] = (changed ? line.slice(1) : line).split(COLUMN_SEPARATOR).map((part) => part.trim());
    return h('tr', { class: changed ? 'changed' : '' },
      h('td', {}, label),
      h('td', {}, h('strong', {}, value ?? '')),
      h('td', { class: 'muted' }, note ?? ''));
  }

  static #lines(text) {
    return String(text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);
  }
}
