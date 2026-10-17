const test = require('node:test');
const assert = require('node:assert');
const BalancedGroups = require('../src/features/tournaments/formats/lan/BalancedGroups');
const GroupSizeScale = require('../src/features/tournaments/formats/lan/GroupSizeScale');

const pids = (n) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

test('groepsgroottes: som klopt, verschil max 1, grootste eerst', () => {
  for (const n of [3, 9, 17, 49, 56, 57, 60, 65, 70, 80, 250, 1000]) {
    const sizes = BalancedGroups.sizes(n, 8);
    assert.strictEqual(sizes.reduce((a, b) => a + b, 0), n, `som bij ${n}`);
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `verschil bij ${n}`);
    assert.ok(Math.max(...sizes) <= 8, `maximum bij ${n}`);
    assert.deepStrictEqual(sizes, [...sizes].sort((a, b) => b - a));
  }
});

test('65 spelers = twee groepen van 8 en zeven van 7; nooit minder dan 7 vanaf 49', () => {
  assert.deepStrictEqual(BalancedGroups.sizes(65, 8), [8, 8, 7, 7, 7, 7, 7, 7, 7]);
  for (let n = 49; n <= 400; n += 1) assert.ok(Math.min(...BalancedGroups.sizes(n, 8)) >= 7, `n=${n}`);
});

test('kleine LAN: een handvol spelers geeft geen groepen van 1', () => {
  assert.deepStrictEqual(BalancedGroups.sizes(9, 8), [5, 4]);
  assert.deepStrictEqual(BalancedGroups.sizes(5, 8), [5]);
});

test('groupCount en maxGroupSize zijn instelbaar', () => {
  assert.deepStrictEqual(BalancedGroups.sizes(20, 8, 4), [5, 5, 5, 5]);
  assert.deepStrictEqual(BalancedGroups.sizes(3, 8, 10), [1, 1, 1]);
  assert.deepStrictEqual(BalancedGroups.sizes(100, 20), [20, 20, 20, 20, 20]);
});

test('willekeurige verdeling bevat iedereen precies één keer', () => {
  const groups = BalancedGroups.build({ pids: pids(65), maxGroupSize: 8 });
  assert.deepStrictEqual(groups.flat().sort(), pids(65).sort());
});

test('verdeling op stand: groep 1 = beste spelers, grote groepen eerst', () => {
  const standing = pids(17).reverse();
  const groups = BalancedGroups.build({ pids: pids(17), maxGroupSize: 8, seeding: 'standing', standingOrder: standing });
  assert.deepStrictEqual(groups.map((g) => g.length), [6, 6, 5]);
  assert.deepStrictEqual(groups[0], standing.slice(0, 6));
});

test('punten per groepsgrootte: 8, 7 en 6 spelers', () => {
  const scale = new GroupSizeScale('8=10,7,5,3,1,1,1,1; 7=10,6,4,2,1,1,1; 6=10,6,3,1,1,1');
  assert.deepStrictEqual([1, 2, 3, 4, 5, 8].map((p) => scale.pointsFor(8, p)), [10, 7, 5, 3, 1, 1]);
  assert.deepStrictEqual([1, 2, 3, 4, 7].map((p) => scale.pointsFor(7, p)), [10, 6, 4, 2, 1]);
  assert.deepStrictEqual([1, 2, 3, 6].map((p) => scale.pointsFor(6, p)), [10, 6, 3, 1]);
});

test('ontbrekende tabel: grotere tabel afgekapt, anders grootste tabel verlengd', () => {
  const scale = new GroupSizeScale('8=10,7,5,3,1,1,1,1; 4=10,5,2,1');
  assert.deepStrictEqual([1, 2, 3, 4].map((p) => scale.pointsFor(5, p)), [10, 7, 5, 3]);
  assert.strictEqual(scale.pointsFor(12, 12), 1);
});

test('een lege of ongeldige puntentabel wordt geweigerd', () => {
  for (const bad of ['', '8=', '8=0,0,0', 'x=10,5', '8=10,abc']) {
    assert.throws(() => GroupSizeScale.validate(bad), /Ongeldige invoer/, bad);
  }
});
