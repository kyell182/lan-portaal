const Config = require('../core/Config');
const Container = require('../app/Container');
const DemoSeeder = require('./DemoSeeder');
const presets = require('./index');

const DEFAULT_PRESET = 'ieee-halloween-2026';

/**
 * Vult een lege data-map met dummy-spelers en gespeelde rondes om het portaal uit te proberen.
 * Gebruik NOOIT de data-map van een echt event: kies een aparte map.
 *
 *   DATA_DIR=./demo-data npm run seed:demo -- 60 --played=2
 *   DATA_DIR=./demo-data ADMIN_PASSWORD=geheim123 npm start
 * In PowerShell: eerst $env:DATA_DIR = "./demo-data", dan het commando (zie README).
 *
 * Opties: een getal = aantal spelers (standaard 60), --played=N = aantal rondes dat al gespeeld is,
 * --preset=<id>, --force = ook uitvoeren als er al spelers zijn.
 */
function main() {
  const args = process.argv.slice(2);
  const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  const preset = presets.get(option('preset') ?? DEFAULT_PRESET);
  if (!preset) {
    console.log('[demo] Onbekende preset. Beschikbaar:', presets.list().map((p) => p.id).join(', '));
    process.exitCode = 1;
    return;
  }
  const options = {
    count: Number(args.find((a) => /^\d+$/.test(a))) || 60,
    playedRounds: Number(option('played')) || 0,
    force: args.includes('--force'),
  };
  const config = new Config();
  try {
    const report = new DemoSeeder(new Container(config)).run(preset, options);
    console.log(`[demo] ${report.players} dummy-spelers, ${report.playedRounds} gespeelde ronde(s). Data-map: ${config.dataDir}`);
  } catch (err) {
    console.log(`[demo] ${err.message}`);
    process.exitCode = 1;
  }
}

main();
