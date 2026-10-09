const FormatRegistry = require('../src/features/tournaments/formats/FormatRegistry');

const registry = new FormatRegistry();

function participants(n) {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Speler ${i + 1}`, seed: i + 1 }));
}

/** Speelt alle speelbare matches; de deelnemer met de laagste seed wint (of random als random=true). */
function playAll(format, state, settings, list, { random = false } = {}) {
  for (let guard = 0; guard < 1000; guard += 1) {
    const ready = (state.matches || []).filter((m) => m.status === 'ready');
    if (!ready.length) {
      if (format.canAdvance(state, settings) && !format.isFinished(state, settings)) {
        state = format.advance(state, list, settings);
        continue;
      }
      return state;
    }
    const m = ready[0];
    const [a, b] = m.slots.map((s) => Number(s.pid.slice(1)));
    const aWins = random ? Math.random() < 0.5 : a < b;
    state = format.report(state, m.id, { scores: aWins ? [2, 1] : [1, 2] }, settings, list);
  }
  throw new Error('oneindige lus');
}

module.exports = { registry, participants, playAll };
