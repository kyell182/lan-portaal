const Config = require('../core/Config');
const Container = require('../app/Container');
const LanEventSeeder = require('./LanEventSeeder');

/**
 * Richt het Halloween-toernooi in op de bestaande data (veilig om meerdere keren te draaien).
 * Lokaal: npm run seed:lan. In Docker: docker compose exec app node src/seed/seedLan.js
 */
function main() {
  const container = new Container(new Config());
  const report = new LanEventSeeder(container).run();
  console.log(`[seed] ${report.templates} templates, ${report.games} games en ${report.tournaments} toernooien toegevoegd.`);
}

main();
