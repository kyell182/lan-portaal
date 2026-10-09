# VIVES LAN-portaal

Portaal om LAN-party's te organiseren: events (edities), toernooien vanuit templates, live brackets en
klassementen, games, teams, spelers, zitplan, prijzen/shop en plugins (Discord). Alleen admins melden aan;
het publiek ziet alles live (handig op een beamer in de zaal). Installeerbaar als PWA en werkt volledig
offline op het LAN-netwerk: lettertypes en alle bestanden worden lokaal gehost.

## Starten met Docker

```bash
cp .env.example .env        # vul ADMIN_PASSWORD en JWT_SECRET in
docker compose up -d --build
```

- Publieke site: `http://<server>:3000`
- Beheer: `http://<server>:3000/admin` (eerste admin komt uit `.env`)
- Data staat in het volume `lan-data` (`/app/data`, JSON-bestanden). Back-up = die map kopiëren.

Achter een reverse proxy met HTTPS: zet `COOKIE_SECURE=true`. Laat de proxy `/api/live`
niet bufferen (Server-Sent Events), bv. in nginx `proxy_buffering off;`.

## Lokaal ontwikkelen

```bash
npm install
ADMIN_PASSWORD=geheim123 npm run dev
npm test                    # test alle toernooivormen
```

## Events (LAN-edities)

Elke editie (bv. "VIVES LAN Herfst 2026") heeft eigen toernooien, zitplan en prijzen.
Games, teams, spelers en templates zijn gedeeld, zodat je ze niet elke keer opnieuw moet invoeren.

- Er is altijd één **actief** event: dat toont de publieke site met een aftelling tot de start.
- Bezoekers kunnen oude edities bekijken via de keuzelijst bovenaan.
- In het beheer kies je bovenaan aan welk event je werkt; nieuwe toernooien, zones en prijzen komen daarin.
- Het eerste event dat je aanmaakt neemt alle bestaande toernooien, plaatsen en prijzen over.
- Een event met inhoud kan niet per ongeluk verwijderd worden.

## Plugins

Onder **Beheer → Plugins**. Elke plugin kies je aan/uit en per plugin stel je in welke meldingen hij stuurt:
event actief, toernooi gestart, elke uitslag, winnaar.

- **Discord**: post berichten (embeds) in een kanaal via een webhook. Geen bot nodig.
  In Discord: kanaalinstellingen → Integraties → Webhooks → Nieuwe webhook → URL kopiëren.
  Mentions staan uit, dus niemand wordt per ongeluk gepingd. Zet `PUBLIC_URL` in `.env` zodat de
  berichten naar de juiste toernooipagina linken.
- **Algemene webhook**: elke melding als JSON naar een eigen URL (eigen bot, n8n, Home Assistant...),
  optioneel ondertekend met HMAC-SHA256 in `X-Lan-Signature`.

Webhook-URL's en geheimen gaan nooit terug naar de browser. Een event krijgt ook een Discord-uitnodiging
die als knop op de publieke site verschijnt.

Een nieuwe plugin toevoegen: een klasse die `Plugin` uitbreidt (`src/features/plugins/`) met `ownFields`
en `send(message, settings)`, en registreren in `PluginRegistry`. Het instellingenformulier verschijnt vanzelf.

## Toernooivormen

| Vorm | Wat |
|---|---|
| Single elimination | Knock-out, byes automatisch, optionele kleine finale |
| Double elimination | Winners- en losers-bracket, grand final met optionele reset |
| Round robin | Iedereen tegen iedereen, heen/terug instelbaar, eigen puntensysteem |
| Poules + knock-out | Slangseeding in poules, daarna knock-out met de besten per poule |
| Swiss | Koppeling op punten zonder herkansingen, Buchholz als tiebreak |
| Puntentoernooi | Free-for-all (battle royale, racing): punten per plaats + bonus (kills) |
| Scorebord | Vrije punten: de admin kent zelf punten toe per criterium (social gelikt, aanwezigheid...). Criteria blijven aanpasbaar |

Templates bewaren een vorm met instellingen (best of, puntentabel, aantal poules...). Bij een nieuw
toernooi kies je een template; zolang het toernooi niet gestart is, blijven instellingen, deelnemers
en seeding aanpasbaar. Namen van deelnemers kan je altijd aanpassen. Uitslagen kan je corrigeren
zolang de volgende match nog niet gespeeld is.

## Structuur

```
src/
  core/            gedeelde bouwstenen (opslag, validatie, generieke CRUD, live-events)
  features/        één map per domein
    auth/ admins/ events/ games/ players/ teams/ prizes/ seats/ templates/
    plugins/
      Plugin.js               abstracte basis voor integraties
      PluginRegistry.js       alle plugins geregistreerd
      NotificationHub.js      stuurt domeinmeldingen door naar ingeschakelde plugins
      discord/ webhook/
    tournaments/
      formats/
        TournamentFormat.js     abstracte basisklasse
        FormatRegistry.js       alle vormen geregistreerd
        elimination/ league/ points/ scoreboard/ shared/
  app/             Container (dependency injection), App en ApiRouter
public/
  css/             fonts, base, layout, tournament, event (gamer-stijl: VIVES-rood vs cyaan)
  fonts/           Chakra Petch + Barlow (lokaal, OFL-licentie)
  js/core/         DOM-helper, API, router, live, formulieren
  js/views/        bracket, klassement, zitplan, prijzen (gedeeld publiek/admin)
  js/public/       publieke pagina's
  js/admin/        beheerpagina's (+ resources/ met configuratie per entiteit)
tests/             tests voor de toernooi-engine
```

### Een nieuwe toernooivorm toevoegen

1. Maak een klasse die `TournamentFormat` uitbreidt (`key`, `label`, `settingsFields`, `create`, `report`, `standings`, en eventueel `advance`/`canAdvance`).
2. Registreer ze in `FormatRegistry.defaults()`.

De instellingen verschijnen automatisch in het template-formulier.

### Een nieuw soort item toevoegen

Backend: een service die `CrudService` uitbreidt met een `Schema`, en één regel in `ApiRouter`.
Frontend: een resource-config in `public/js/admin/resources/` en één route in `admin/main.js`.

## API (kort)

Alle `GET`-routes zijn publiek (gevoelige velden zoals e-mail worden verborgen), schrijven vereist een admin.

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `/api/games`, `/api/players`, `/api/teams`, `/api/prizes`, `/api/seats`, `/api/templates`: CRUD
- `POST /api/seats/grid`: zone als raster aanmaken
- `GET /api/templates/formats`: beschikbare vormen en hun instellingen
- `/api/tournaments`: CRUD, plus `PUT /:id/participants`, `POST /:id/start`,
  `POST /:id/matches/:matchId/result`, `POST /:id/advance`, `POST /:id/reset`, `GET /:id/standings`
- `/api/events`: CRUD, plus `GET /current` en `POST /:id/activate`
- Lijsten van toernooien, plaatsen en prijzen filter je met `?eventId=...`
- `/api/plugins` (admin): `GET`, `PUT /:key`, `POST /:key/test`
- `GET /api/live`: Server-Sent Events bij elke wijziging
