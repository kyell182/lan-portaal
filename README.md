<div align="center">

# VIVES LAN-portaal

**Brackets, klassementen, zitplan en prijzen: alles live op je beamer.**

![Node](https://img.shields.io/badge/Node-22-5fa04e?logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ed?logo=docker&logoColor=white)
![Offline](https://img.shields.io/badge/Werkt-offline%20op%20LAN-e4002b)
![PWA](https://img.shields.io/badge/PWA-installeerbaar-00d4ff)

</div>

Met dit portaal organiseer je een complete LAN-party: edities (events), toernooien vanuit templates,
live brackets en klassementen, games, teams, spelers, zitplan, prijzen/shop en Discord-meldingen.
Alleen admins melden aan; het publiek ziet alles live bijwerken. Handig op een beamer in de zaal.

> Het portaal werkt **volledig offline** op het LAN-netwerk: lettertypes en alle bestanden worden lokaal gehost.

---

## Wat kan het?

| Onderdeel | Omschrijving |
|---|---|
| **Toernooien** | Knock-out, double elimination, competitie, poules, Swiss, puntentoernooi en scorebord |
| **Live** | Elke uitslag verschijnt meteen bij iedereen (Server-Sent Events) |
| **Events** | Elke editie heeft eigen toernooien, zitplan en prijzen, met een aftelling op de startpagina |
| **Zitplan** | Zones als raster, bezoekers zoeken hun plaats |
| **Prijzen & shop** | Prijzenlijst per event |
| **Plugins** | Discord-embeds en algemene webhooks |
| **PWA** | Installeerbaar op telefoon of desktop |

---

## Zo ziet het eruit

### Publieke site

| Startpagina met aftelling | Live bracket |
|---|---|
| ![Startpagina](docs/screenshots/startpagina.png) | ![Bracket](docs/screenshots/bracket.png) |

| Klassement van een scorebord |
|---|
| ![Klassement](docs/screenshots/klassement.png) |

### Beheer

| Punten toekennen | Criteria beheren |
|---|---|
| ![Scorebord beheren](docs/screenshots/beheer-scorebord.png) | ![Criteria beheren](docs/screenshots/beheer-criteria.png) |

---

## Snel starten (Docker)

```bash
cp .env.example .env        # vul ADMIN_PASSWORD en JWT_SECRET in
docker compose up -d --build
```

| Wat | Waar |
|---|---|
| Publieke site | `http://<server>:3000` |
| Beheer | `http://<server>:3000/admin` (of de knop **Beheer** rechtsboven) |
| Data | volume `lan-data` (`/app/data`, JSON-bestanden). Back-up = die map kopiëren |

Het eerste admin-account komt uit `.env`. Je beheert admins daarna onder **Beheer → Admins**.

### Instellingen (`.env`)

| Variabele | Betekenis |
|---|---|
| `PORT` | Poort waarop het portaal luistert (standaard `3000`) |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Eerste admin, enkel aangemaakt als er nog geen admins bestaan |
| `JWT_SECRET` | Lange willekeurige string, bv. `openssl rand -hex 32` |
| `DATA_DIR` | Map waar de JSON-data staat |
| `COOKIE_SECURE` | `true` als het portaal achter HTTPS draait |
| `PUBLIC_URL` | Publiek adres, voor links in Discord-berichten (optioneel) |

> Achter een reverse proxy met HTTPS: zet `COOKIE_SECURE=true` en laat de proxy `/api/live`
> niet bufferen, bv. in nginx `proxy_buffering off;`.

---

## Lokaal ontwikkelen

```bash
npm install
ADMIN_PASSWORD=geheim123 npm run dev
npm test                    # test alle toernooivormen
```

---

## Events (LAN-edities)

Elke editie (bv. *"VIVES LAN Herfst 2026"*) heeft eigen toernooien, zitplan en prijzen.
**Games, teams, spelers en templates zijn gedeeld**, zodat je ze niet telkens opnieuw invoert.
Een team is niet aan één game gebonden en kan in elk toernooi meedoen.

| Onderwerp | Hoe het werkt |
|---|---|
| Actief event | Er is altijd één actief event: dat toont de publieke site met een aftelling tot de start |
| Oude edities | Bezoekers bekijken ze via de keuzelijst bovenaan |
| Beheer | Bovenaan kies je aan welk event je werkt |
| Eerste event | Neemt alle bestaande toernooien, plaatsen en prijzen over |
| Verwijderen | Een event met inhoud kan niet per ongeluk verwijderd worden |

```mermaid
flowchart LR
    Event["Event"] --> Toernooien["Toernooien"]
    Event --> Zitplan["Zitplan"]
    Event --> Prijzen["Prijzen"]
    Gedeeld["Gedeeld"] --> Games["Games"]
    Gedeeld --> Teams["Teams"]
    Gedeeld --> Spelers["Spelers"]
    Gedeeld --> Templates["Templates"]
    Templates -. "startpunt van" .-> Toernooien
    Teams -. "deelnemers van" .-> Toernooien
```

---

## Toernooivormen

| Vorm | Wat |
|---|---|
| Single elimination | Knock-out, byes automatisch, optionele kleine finale |
| Double elimination | Winners- en losers-bracket, grand final met optionele reset |
| Round robin | Iedereen tegen iedereen, heen/terug instelbaar, eigen puntensysteem |
| Poules + knock-out | Slangseeding in poules, daarna knock-out met de besten per poule |
| 🇨🇭 Swiss | Koppeling op punten zonder herkansingen, Buchholz als tiebreak |
| Puntentoernooi | Free-for-all (battle royale, racing): punten per plaats + bonus (kills) |
| Scorebord | Vrije punten: de admin kent zelf punten toe per criterium |

Templates bewaren een vorm met instellingen (best of, puntentabel, aantal poules...). Bij een nieuw
toernooi kies je een template.

| Fase | Wat kan je aanpassen? |
|---|---|
| Voorbereiding | Instellingen, deelnemers en seeding |
| Gestart | Namen van deelnemers; uitslagen corrigeren zolang de volgende match niet gespeeld is |
| Afgelopen | Uitslagen corrigeren of het toernooi terugzetten naar de voorbereiding |

```mermaid
stateDiagram-v2
    [*] --> Voorbereiding
    Voorbereiding --> Gestart: Toernooi starten
    Gestart --> Gestart: Uitslag ingeven / volgende ronde
    Gestart --> Afgelopen: Laatste uitslag
    Afgelopen --> Gestart: Uitslag corrigeren
    Gestart --> Voorbereiding: Terugzetten
    Afgelopen --> Voorbereiding: Terugzetten
```

### Scorebord in detail

Voor alles wat geen wedstrijd is: social media-acties, aanwezigheid, bonusopdrachten...

| Onderdeel | Uitleg |
|---|---|
| Criteria | Bv. *Social gelikt* (5 punten per eenheid) of *Social gevolgd* (3 punten, max. 1) |
| Aantal | Per deelnemer geef je het aantal in; het portaal rekent aantal × punten per eenheid uit |
| Maximum | Kapt het aantal af, zodat niemand eindeloos punten kan sprokkelen |
| Aanpasbaar | Criteria wijzig je altijd, ook tijdens het toernooi. Verwijderde criteria wissen hun punten |
| Publiek | Klassement met een kolom per criterium |
| Afsluiten | **Toernooi afsluiten** en **Heropenen** |
| Startcriteria | In de template als `naam=punten; naam=punten` |

```mermaid
flowchart LR
    Aantal["Aantal per criterium"] --> Cap{"Maximum?"}
    Cap -- "ja" --> Afkappen["Afkappen op max."]
    Cap -- "nee" --> Vermenigvuldigen
    Afkappen --> Vermenigvuldigen["× punten per eenheid"]
    Vermenigvuldigen --> Totaal["Totaal per deelnemer"]
    Totaal --> Klassement["Klassement"]
```

---

## Plugins

Onder **Beheer → Plugins**. Per plugin kies je aan/uit en welke meldingen hij stuurt:
event actief, toernooi gestart, elke uitslag, winnaar.

| Plugin | Wat doet ze? | Instellen |
|---|---|---|
| Discord | Post embeds in een kanaal via een webhook, geen bot nodig. Mentions staan uit | Kanaalinstellingen → Integraties → Webhooks → Nieuwe webhook → URL kopiëren. Zet `PUBLIC_URL` in `.env` voor correcte links |
| Algemene webhook | Elke melding als JSON naar een eigen URL (eigen bot, n8n, Home Assistant...) | Optioneel ondertekend met HMAC-SHA256 in `X-Lan-Signature` |

Webhook-URL's en geheimen gaan nooit terug naar de browser. Een event krijgt ook een Discord-uitnodiging
die als knop op de publieke site verschijnt.

```mermaid
flowchart LR
    Actie["Admin geeft uitslag in"] --> Service["TournamentService"]
    Service --> Hub["NotificationHub"]
    Hub --> Discord["Discord"]
    Hub --> Webhook["Webhook"]
    Service --> Live["Live (SSE)"] --> Publiek["Publiek ziet het meteen"]
```

---

## Structuur

Het project is opgedeeld per domein (feature), niet per technisch type: alles wat bij toernooien hoort,
staat in één map. De Container in `src/app/` koppelt de services aan elkaar (dependency injection).

```mermaid
flowchart TB
    Browser["Browser (public/)"] -->|"REST + SSE"| Router["ApiRouter"]
    Router --> Controllers["Controllers (per feature)"]
    Controllers --> Services["Services"]
    Services --> Formats["Toernooivormen"]
    Services --> Store[("JSON-opslag")]
    Services --> Bus["EventBus"]
    Bus --> Browser
    Bus --> Plugins["Plugins"]
```

### Backend (`src/`)

| Map | Verantwoordelijkheid | Hangt af van |
|---|---|---|
| `server.js` | Startpunt van de app | `app/` |
| `app/` | Container (dependency injection), Express-app en `ApiRouter` | alle features |
| `core/` | Opslag, validatie, generieke CRUD, live-events (SSE), HTTP-fouten | niets |
| `features/auth/`, `admins/` | Aanmelden en adminbeheer | `core/` |
| `features/events/` | LAN-edities; bundelt toernooien, plaatsen en prijzen | `core/` |
| `features/games/`, `players/`, `teams/` | Gedeelde basisgegevens | `core/` |
| `features/templates/` | Voorgedefinieerde toernooi-instellingen | `tournaments/formats` |
| `features/tournaments/` | Toernooien en hun levensloop | `templates/`, `games/`, `events/` |
| `features/prizes/`, `seats/` | Prijzen en zitplan | `core/`, `players/` |
| `features/plugins/` | Meldingen naar Discord en webhooks | `core/events` |

### Toernooivormen (`src/features/tournaments/formats/`)

| Map | Vormen |
|---|---|
| `elimination/` | Single en double elimination |
| `league/` | Round robin, poules + knock-out, Swiss |
| `points/` | Puntentoernooi (free-for-all) |
| `scoreboard/` | Scorebord met vrije criteria |
| `shared/` | Gedeelde bouwstenen: klassementstabel, match-factory, constanten |

`TournamentFormat.js` is de abstracte basisklasse en `FormatRegistry.js` houdt alle vormen bij.

### Frontend (`public/`)

Geen buildstap: gewone ES-modules die de browser rechtstreeks laadt.

| Map | Inhoud |
|---|---|
| `css/` | Stijlen in gamer-look (VIVES-rood tegenover cyaan) |
| `fonts/` | Chakra Petch en Barlow, lokaal gehost (OFL-licentie) |
| `js/core/` | DOM-helper, API-client, router, live-verbinding, formulieren, modals |
| `js/views/` | Gedeelde weergaves: bracket, klassement, zitplan, prijzen |
| `js/public/` | Publieke pagina's |
| `js/admin/` | Beheerpagina's, met `resources/` voor de configuratie per entiteit |

### Overig

| Pad | Inhoud |
|---|---|
| `tests/` | Tests voor de toernooi-engine en plugins |
| `docs/screenshots/` | Screenshots voor deze README |
| `Dockerfile`, `docker-compose.yml` | Containerisatie met een volume voor de data |

### Uitbreiden

| Wat toevoegen? | Backend | Frontend |
|---|---|---|
| Toernooivorm | Klasse die `TournamentFormat` uitbreidt (`key`, `label`, `settingsFields`, `create`, `report`, `standings`, eventueel `advance`/`canAdvance`) en registreren in `FormatRegistry.defaults()` | Instellingen verschijnen vanzelf in het template-formulier |
| Nieuw soort item | Service die `CrudService` uitbreidt met een `Schema`, plus één regel in `ApiRouter` | Resource-config in `public/js/admin/resources/` en één route in `admin/main.js` |
| Plugin | Klasse die `Plugin` uitbreidt (`ownFields`, `send(message, settings)`) in `src/features/plugins/` en registreren in `PluginRegistry` | Instellingenformulier verschijnt vanzelf |

---

## API (kort)

Alle `GET`-routes zijn publiek (gevoelige velden zoals e-mail worden verborgen), schrijven vereist een admin.

| Route | Doel |
|---|---|
| `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` | Aanmelden |
| `/api/games`, `/players`, `/teams`, `/prizes`, `/seats`, `/templates` | CRUD |
| `POST /api/seats/grid` | Zone als raster aanmaken |
| `GET /api/templates/formats` | Beschikbare vormen en hun instellingen |
| `/api/tournaments` | CRUD, plus `PUT /:id/participants`, `POST /:id/start`, `POST /:id/advance`, `POST /:id/reset`, `GET /:id/standings` |
| `POST /api/tournaments/:id/matches/:matchId/result` | Uitslag ingeven. Bij een scorebord is `matchId` de actie: `scores`, `criteria` of `status` |
| `/api/events` | CRUD, plus `GET /current` en `POST /:id/activate` |
| `/api/plugins` (admin) | `GET`, `PUT /:key`, `POST /:key/test` |
| `GET /api/live` | Server-Sent Events bij elke wijziging |

Lijsten van toernooien, plaatsen en prijzen filter je met `?eventId=...`.

---

<div align="center">

Gemaakt voor de VIVES LAN-party's · Veel plezier en **GG!**

</div>
