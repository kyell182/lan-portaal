import { h, mount } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Page } from '../../core/Page.js';
import { Toast } from '../../core/Toast.js';
import { adminEventContext } from '../context.js';
import { CsvParser } from './CsvParser.js';
import { IMPORT_FIELDS } from './ImportFields.js';
import { ColumnMapping } from './ColumnMapping.js';
import { ImportRowChecker } from './ImportRowChecker.js';
import { ImportPreviewTable } from './ImportPreviewTable.js';

// Grote lijsten gaan in delen naar de server, zodat er geen vaste grens op het aantal spelers is.
const BATCH_SIZE = 200;
const SAMPLE_ROWS = 5;

/** Spelers importeren uit een CSV-export (bv. Microsoft Forms): bestand, kolommen koppelen, controleren, importeren. */
export class PlayerImportPage extends Page {
  async load() {
    const players = await api.get(`/players${adminEventContext.query()}`);
    return { taken: new Set(players.map((p) => p.nickname.toLowerCase())) };
  }

  draw({ taken }) {
    this.checker = new ImportRowChecker(taken);
    this.table = [];
    this.#renderStart();
  }

  #renderStart() {
    mount(this.container,
      this.#head(),
      h('label', { class: 'field' }, h('span', {}, 'CSV-bestand (Excel: Opslaan als, CSV UTF-8)'),
        h('input', { type: 'file', accept: '.csv,text/csv', onchange: (e) => this.#readFile(e.target.files[0]) })));
  }

  #head() {
    return h('div', { class: 'page-head' },
      h('div', {}, h('h2', {}, 'Spelers importeren'),
        h('div', { class: 'meta' }, 'Een speler met hetzelfde e-mailadres wordt bijgewerkt in plaats van dubbel aangemaakt.')),
      h('a', { class: 'btn', href: '#/spelers' }, 'Terug naar spelers'));
  }

  async #readFile(file) {
    if (!file) return;
    const rows = CsvParser.parse(await file.text());
    if (rows.length < 2) return Toast.show('Het bestand bevat geen gegevensrijen', { error: true });
    [this.headers, ...this.dataRows] = rows;
    this.mapping = ColumnMapping.suggest(this.headers);
    return this.#renderMapping();
  }

  #renderMapping() {
    mount(this.container, this.#head(),
      h('h3', {}, `${this.dataRows.length} rijen gevonden. Koppel de kolommen.`),
      this.#mappingForm(),
      h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => this.#toPreview() }, 'Controleer rijen')),
      this.#sample());
  }

  #mappingForm() {
    return h('div', {}, IMPORT_FIELDS.map((field) => h('label', { class: 'field' },
      h('span', {}, field.label + (field.required ? ' *' : '')),
      h('select', { onchange: (e) => { this.mapping[field.key] = e.target.value === '' ? null : Number(e.target.value); } },
        h('option', { value: '' }, '— niet importeren —'),
        this.headers.map((header, i) => h('option', { value: i, selected: this.mapping[field.key] === i }, header))))));
  }

  #sample() {
    return h('div', { class: 'table-scroll' }, h('table', { class: 'data' },
      h('thead', {}, h('tr', {}, this.headers.map((header) => h('th', {}, header)))),
      h('tbody', {}, this.dataRows.slice(0, SAMPLE_ROWS).map((row) => h('tr', {}, this.headers.map((_, i) => h('td', {}, row[i] ?? '')))))));
  }

  #toPreview() {
    ColumnMapping.remember(this.mapping, this.headers);
    this.table = this.dataRows.map((cells) => ({ skip: false, values: this.#valuesOf(cells) }));
    this.#renderPreview();
  }

  #valuesOf(cells) {
    const values = {};
    for (const [key, index] of Object.entries(this.mapping)) values[key] = index === null ? '' : (cells[index] ?? '').trim();
    return values;
  }

  #renderPreview() {
    const problems = this.checker.check(this.table);
    const bad = problems.filter((p) => p.length).length;
    const ready = this.table.filter((r) => !r.skip).length - bad;
    const preview = new ImportPreviewTable(this.table, problems, {
      onChange: () => this.#renderPreview(),
      onRename: (row) => {
        row.values.nickname = this.checker.suggestFree(row.values.nickname, this.table);
        this.#renderPreview();
      },
    });
    mount(this.container, this.#head(),
      h('h3', {}, `${ready} rijen klaar, ${bad} met een probleem`),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => this.#renderMapping() }, 'Kolommen aanpassen'),
        h('button', { class: 'btn primary', disabled: bad > 0 || ready === 0, onclick: () => this.#import() }, `${ready} spelers importeren`)),
      preview.render());
  }

  async #import() {
    const rows = this.table.filter((r) => !r.skip).map((r) => r.values);
    const total = { created: 0, updated: 0, skipped: 0, errors: [] };
    try {
      for (let start = 0; start < rows.length; start += BATCH_SIZE) {
        const batch = rows.slice(start, start + BATCH_SIZE);
        const result = await api.post('/players/import', { rows: batch, eventId: adminEventContext.id });
        PlayerImportPage.#add(total, result, start);
      }
    } catch (err) {
      Toast.error(err);
      return;
    }
    this.#renderDone(total);
  }

  static #add(total, result, offset) {
    total.created += result.created;
    total.updated += result.updated;
    total.skipped += result.skipped;
    total.errors.push(...result.errors.map((e) => ({ ...e, row: e.row + offset })));
  }

  #renderDone(total) {
    mount(this.container, this.#head(),
      h('h3', {}, `Klaar: ${total.created} nieuw, ${total.updated} bijgewerkt, ${total.skipped} overgeslagen`),
      total.errors.length ? h('ul', {}, total.errors.map((e) => h('li', {}, `Rij ${e.row}: ${e.message}`))) : null,
      h('a', { class: 'btn primary', href: '#/checkin' }, 'Naar check-in'));
  }
}
