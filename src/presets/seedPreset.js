const Config = require('../core/Config');
const Container = require('../app/Container');
const PresetSeeder = require('./PresetSeeder');
const presets = require('./index');

/**
 * Richt een LAN in met een preset (veilig om meerdere keren te draaien).
 * Lokaal: npm run seed:preset -- <id>. In Docker: docker compose exec app node src/presets/seedPreset.js <id>
 * Zonder id toont het de beschikbare presets. Dit is optioneel: een LAN kan ook volledig in de admin ingericht worden.
 */
function main() {
  const id = process.argv[2];
  const preset = id ? presets.get(id) : null;
  if (!preset) {
    console.log(id ? `[preset] Onbekende preset "${id}".` : '[preset] Kies een preset:');
    presets.list().forEach((p) => console.log(`  ${p.id}  ${p.label}`));
    process.exitCode = 1;
    return;
  }
  const report = new PresetSeeder(new Container(new Config())).run(preset);
  console.log(`[preset] ${preset.id}: ${report.templates} templates, ${report.games} games en ${report.tournaments} toernooien toegevoegd.`);
}

main();
