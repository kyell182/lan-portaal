const Config = require('./core/Config');
const Container = require('./app/Container');
const App = require('./app/App');

async function main() {
  const config = new Config();
  const container = new Container(config);
  await container.seed();
  const app = new App(container).build();
  app.listen(config.port, () => console.log(`[lan-portaal] draait op poort ${config.port}`));
}

main().catch((err) => {
  console.error('[lan-portaal] kon niet starten:', err);
  process.exit(1);
});
