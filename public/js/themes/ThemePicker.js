import { h } from '../core/dom.js';
import { themeCatalog } from './ThemeCatalog.js';
import { AUTO } from './ThemeSelector.js';

/** Keuzelijst in de topbar om zelf een thema te kiezen, of het thema van het event te volgen. */
export class ThemePicker {
  constructor(selector) {
    this.selector = selector;
  }

  render() {
    const options = [
      h('option', { value: AUTO, selected: this.selector.choice === AUTO }, 'Thema: automatisch'),
      ...themeCatalog.themes.map((theme) => h('option', { value: theme.id, selected: this.selector.choice === theme.id }, theme.name)),
    ];
    return h('select', { 'aria-label': 'Thema kiezen', onchange: (e) => this.selector.choose(e.target.value) }, options);
  }
}
