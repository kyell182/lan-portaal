# Eigen thema's maken

Elke map in `custom-themes/` is een thema. Zet een nieuwe map neer en het thema staat meteen in het
keuzemenu van de site en in het veld "Thema" bij Beheer → Events. Je hoeft niets te herstarten of te bouwen
(ververs de pagina). Mappen die met `_` beginnen worden genegeerd, handig voor werk in uitvoering.

```
custom-themes/
  _voorbeeld/          ← kopieer deze map en hernoem hem, bv. "kerst"
    theme.json         ← naam, kleur en welke sprites rondzweven
    theme.css          ← kleuren en effecten
    sprites/
      ster.svg         ← afbeeldingen (svg, png, webp of gif)
```

De mapnaam is de id van het thema: enkel kleine letters, cijfers en streepjes (`kerst`, `zomer-2026`).
Een ingebouwd thema (vives, gamer, halloween, pasen) kan je niet overschrijven.

## theme.json

```json
{
  "name": "Kerst",
  "description": "Sneeuw en kerstlichtjes",
  "color": "#0b1a2e",
  "sprites": [
    { "motion": "fall", "files": ["sneeuwvlok.svg"], "count": 20, "size": [14, 30], "duration": [12, 24] }
  ]
}
```

| Veld | Betekenis |
|------|-----------|
| `name` | Naam in het keuzemenu |
| `color` | Kleur van de browserbalk op mobiel (`#rrggbb`) |
| `sprites` | Lijst groepen. Laat leeg of weg voor een thema zonder figuurtjes |

Per sprite-groep:

| Veld | Betekenis |
|------|-----------|
| `files` | Bestanden uit de map `sprites/`, ze worden om de beurt gebruikt |
| `motion` | `fly` (links→rechts met golfje), `float` (omhoog), `fall` (omlaag), `hop` (huppelt over de onderkant), `dangle` (hangt aan een draad van boven, teken de draad in de afbeelding), `twinkle` (blijft staan en pulseert), `bob` (wipt op zijn plek op en neer), `stand` (staat stil op de onderrand) |
| `count` | Aantal figuurtjes (1–30) |
| `size` | `[min, max]` breedte in pixels |
| `duration` | `[min, max]` seconden per rondje |

Animatie in de afbeelding zelf kan ook: een SVG mag zijn eigen `<animate>`/`<animateTransform>` bevatten
(zie de vleermuis en de vlinder in `public/themes`).

## theme.css

Je CSS wordt enkel geladen als jouw thema actief is, dus je schrijft gewoon `:root { ... }` zonder iets te scopen.
Het makkelijkst is de kleurvariabelen overschrijven. Kijk naar `public/css/base.css` voor de volledige lijst;
de belangrijkste:

| Variabele | Gebruik |
|-----------|---------|
| `--bg`, `--surface`, `--surface-2` | Achtergrond, panelen, verhoogde vlakken |
| `--text`, `--muted` | Tekst en gedempte tekst |
| `--vives` (+ `-hot`, `-glow`, `-soft`) | Hoofdaccent: knoppen, actieve tab |
| `--cyan` (+ `-glow`, `-soft`) | Tweede accent: focus, hover |
| `--win` | Winnaar-kleur |
| `--on-accent` | Tekstkleur op de hoofdaccentkleur |
| `--sprite-opacity`, `--sprite-filter` | Doorzichtigheid of gloed van de figuurtjes |

Voor lichte thema's pas je ook `--topbar-bg`, `--side-bg`, `--unit-bg`, `--empty-bg`, `--overlay` en `--shadow` aan
(zie `public/themes/pasen/theme.css`).

Extra effecten zijn gewone CSS: `body::before` en `body::after` zijn vrij te gebruiken (vast, achter de inhoud, of
met `z-index: 150+` en `pointer-events: none` erboven), `.sprite-layer::before/::after` voor lagen
net onder de inhoud, en alle bestaande klassen (`.hero`, `.panel`, `.btn`, ...) kan je restylen.
Houd animaties rustig: geen snel flitsende effecten, dat is onprettig voor mensen met epilepsie of migraine.
Mensen die "minder beweging" aan hebben staan, krijgen de figuurtjes niet te zien.

## Controleren

Een fout in `theme.json` wordt in de serverlog gemeld en het thema valt terug op standaardwaarden.
Zie je je thema niet in de lijst, controleer dan de mapnaam (geen hoofdletters of spaties) en of de map niet met `_` begint.

Bij Docker staat deze map als alleen-lezen koppeling in de container (`./custom-themes`). Draai je zonder Docker,
dan zoekt de server in `custom-themes` naast de app (of in de map uit `THEMES_DIR`).
