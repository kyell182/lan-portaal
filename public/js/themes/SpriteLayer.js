import { h } from '../core/dom.js';
import { themeCatalog } from './ThemeCatalog.js';

/** Toont de zwevende sprites van het actieve thema en ververst ze bij een themawissel. */
export class SpriteLayer {
  constructor(selector) {
    this.selector = selector;
    this.el = h('div', { class: 'sprite-layer', 'aria-hidden': 'true' });
  }

  start() {
    document.body.prepend(this.el);
    this.selector.addEventListener('change', () => this.#render());
    this.#render();
  }

  #render() {
    const theme = themeCatalog.resolve(this.selector.active);
    const sprites = theme.sprites.flatMap((group) => Array.from({ length: group.count }, (_, index) => this.#sprite(theme, group, index)));
    this.el.replaceChildren(...sprites);
  }

  #sprite(theme, group, index) {
    const file = group.files[index % group.files.length];
    const duration = randomBetween(...group.duration);
    const img = h('img', { class: `sprite ${group.motion}`, src: `${theme.base}/sprites/${file}`, alt: '' });
    const properties = {
      '--x': `${randomBetween(2, 94)}vw`,
      '--y': `${randomBetween(4, 82)}vh`,
      '--size': `${randomBetween(...group.size)}px`,
      '--duration': `${duration}s`,
      '--delay': `-${randomBetween(0, duration)}s`,
      '--sway': `${randomBetween(-8, 8)}vw`,
    };
    for (const [name, value] of Object.entries(properties)) img.style.setProperty(name, value);
    return img;
  }
}

function randomBetween(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}
