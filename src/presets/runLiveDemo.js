const LiveDemo = require('./live/LiveDemo');

/**
 * Laat dummy-spelers rondes spelen tegen een draaiend portaal, zodat het bord en de tv live bewegen.
 * Eerst de demo-data klaarzetten (npm run seed:demo) en het portaal starten, dan in een tweede venster:
 *
 *   npm run demo:live -- --password=geheim123 --speed=0.5
 *
 * Opties: --url=http://localhost:3000, --user=admin, --password=... (of ADMIN_PASSWORD),
 * --speed=1 (0.5 = dubbel zo snel, 0 = zonder wachttijd), --disputes=0.1 (kans op een melding), --rounds=N.
 * Kies je zelf een dummy-naam op #/spelen, dan slaat het script die speler over en wacht het op jou.
 */
async function main() {
  const option = (name) => process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
  const number = (name, fallback) => (option(name) === undefined ? fallback : Number(option(name)));
  const password = option('password') ?? process.env.ADMIN_PASSWORD;
  if (!password) {
    console.log('[live] Geef het admin-wachtwoord mee: --password=... (of ADMIN_PASSWORD).');
    process.exitCode = 1;
    return;
  }
  const demo = new LiveDemo({
    url: option('url') ?? 'http://localhost:3000',
    username: option('user') ?? 'admin',
    password,
    speed: number('speed', 1),
    disputeChance: number('disputes', 0.1),
    rounds: number('rounds', Infinity),
  });
  try {
    await demo.run();
  } catch (err) {
    console.log(`[live] Gestopt: ${err.message}`);
    process.exitCode = 1;
  }
}

main();
