const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { pathToFileURL } = require('url');

/** De frontend-modules zijn ES-modules zonder buildstap; voor de test laden we een kopie als .mjs. */
async function loadBrowserModule(relativePath) {
  const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lan-esm-')), 'module.mjs');
  fs.copyFileSync(path.join(__dirname, '..', 'public', 'js', 'admin', 'players', relativePath), target);
  return import(pathToFileURL(target).href);
}

/** Bouwt een minimale zip (zoals Excel er een maakt). deflate=false bewaart bestanden onbewerkt. */
function zip(files, { deflate = true } = {}) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = Buffer.from(name);
    const raw = Buffer.from(content);
    const data = deflate ? zlib.deflateRawSync(raw) : raw;
    const method = deflate ? 8 : 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, data);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  const all = Buffer.concat([...locals, centralBuffer, end]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.length);
}

const SHEET = `<?xml version="1.0"?><worksheet><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="D1" t="inlineStr"><is><t>Toestel</t></is></c></row>
<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>42</v></c><c r="C2" s="3"/><c r="D2" t="str"><v>laptop &amp; muis</v></c></row>
<row r="3"><c r="A3" t="s"><v>3</v></c></row>
<row r="4"/>
</sheetData></worksheet>`;

const SHARED = `<?xml version="1.0"?><sst>
<si><t>Gamertag</t></si>
<si><t xml:space="preserve">Voor naam</t></si>
<si><r><t>Kyell</t></r><r><t>_X</t></r></si>
<si><t>Jos&#233; &lt;3</t></si>
</sst>`;

test('xlsx: leest gedeelde tekst, getallen, inline tekst, lege cellen en entiteiten', async () => {
  const { XlsxReader } = await loadBrowserModule('XlsxReader.js');
  const file = zip({ 'xl/sharedStrings.xml': SHARED, 'xl/worksheets/sheet1.xml': SHEET, '[Content_Types].xml': '<Types/>' });
  assert.deepStrictEqual(await XlsxReader.read(file), [
    ['Gamertag', 'Voor naam', '', 'Toestel'],
    ['Kyell_X', '42', '', 'laptop & muis'],
    ['José <3', '', '', ''],
  ]);
});

test('xlsx: werkt ook met onbewerkte (niet gecomprimeerde) bestanden en kiest het laagste werkblad', async () => {
  const { XlsxReader } = await loadBrowserModule('XlsxReader.js');
  const other = '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>tweede</t></is></c></row></sheetData></worksheet>';
  const first = '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>eerste</t></is></c></row></sheetData></worksheet>';
  const file = zip({ 'xl/worksheets/sheet2.xml': other, 'xl/worksheets/sheet1.xml': first }, { deflate: false });
  assert.deepStrictEqual(await XlsxReader.read(file), [['eerste']]);
});

test('xlsx: een kolom voorbij Z (AA) staat op de juiste plaats', async () => {
  const { XlsxReader } = await loadBrowserModule('XlsxReader.js');
  const sheet = '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>a</t></is></c><c r="AA1" t="inlineStr"><is><t>z</t></is></c></row></sheetData></worksheet>';
  const [row] = await XlsxReader.read(zip({ 'xl/worksheets/sheet1.xml': sheet }));
  assert.strictEqual(row.length, 27);
  assert.deepStrictEqual([row[0], row[26]], ['a', 'z']);
});

test('xlsx: een bestand dat geen xlsx is geeft een duidelijke fout', async () => {
  const { XlsxReader } = await loadBrowserModule('XlsxReader.js');
  await assert.rejects(() => XlsxReader.read(new TextEncoder().encode('naam;mail\nA;b').buffer), /geldig \.xlsx/);
  await assert.rejects(() => XlsxReader.read(zip({ 'readme.txt': 'hoi' })), /geen werkblad/);
});

test('csv: scheidingsteken, aanhalingstekens, BOM en regelbreuk in een cel', async () => {
  const { CsvParser } = await loadBrowserModule('CsvParser.js');
  assert.deepStrictEqual(CsvParser.parse('﻿naam;mail;x\r\n"A; b";a@b.be;"zeg ""hoi""\nregel2"\r\nC;;\r\n'), [
    ['naam', 'mail', 'x'], ['A; b', 'a@b.be', 'zeg "hoi"\nregel2'], ['C', '', ''],
  ]);
  assert.deepStrictEqual(CsvParser.parse('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
  assert.deepStrictEqual(CsvParser.parse('a\tb\n1\t2\n\n'), [['a', 'b'], ['1', '2']]);
});
