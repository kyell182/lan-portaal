import { h } from '../core/dom.js';

const UNITS = [
  ['dagen', 86400000],
  ['uren', 3600000],
  ['min', 60000],
  ['sec', 1000],
];

/** Aftelling tot de start van een event; wordt "Live nu" zodra het bezig is. */
export class Countdown {
  constructor(start, end) {
    this.start = start ? new Date(start) : null;
    this.end = end ? new Date(end) : null;
  }

  render() {
    this.el = h('div', {});
    this.#tick();
    this.timer = setInterval(() => this.#tick(), 1000);
    return this.el;
  }

  destroy() {
    clearInterval(this.timer);
  }

  #tick() {
    if (!this.el.isConnected && this.drawn) return this.destroy();
    this.drawn = true;
    const now = Date.now();
    if (!this.start || Number.isNaN(this.start.getTime())) return this.el.replaceChildren();
    if (this.end && now > this.end.getTime()) return this.el.replaceChildren(this.#banner('Afgelopen', 'Bedankt om erbij te zijn. Tot de volgende!'));
    if (now >= this.start.getTime()) return this.el.replaceChildren(this.#banner('Live nu', 'De LAN is bezig, volg de toernooien hieronder.'));
    this.el.replaceChildren(h('div', { class: 'countdown-caption' }, 'Start over'), this.#units(this.start.getTime() - now));
  }

  #units(ms) {
    let rest = ms;
    return h('div', { class: 'countdown', role: 'timer', 'aria-live': 'off' }, UNITS.map(([name, size]) => {
      const value = Math.floor(rest / size);
      rest -= value * size;
      return h('div', { class: 'unit' }, h('span', { class: 'value' }, String(value).padStart(2, '0')), h('span', { class: 'name' }, name));
    }));
  }

  #banner(title, text) {
    return h('div', { class: 'live-now' }, h('strong', {}, title), h('span', {}, text));
  }
}
