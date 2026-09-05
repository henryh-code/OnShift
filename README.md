# OnShift

**Een privacy-first Progressive Web App voor dienstoverdracht in de zorg- en begeleidingssector.**

OnShift bundelt overdrachtsnotities, aandachtsdossiers, dagtaken, bewonersaanwezigheid, sancties, agenda en contacten in één overzichtelijk dashboard. De app draait volledig **offline-first en lokaal in de browser**: er is geen server, geen account en geen cloud. Alle gegevens staan versleuteld op het toestel zelf, ontsloten met één pincode.

🔗 **Live:** <https://henryh-code.github.io/OnShift/>

---

## Inhoud

- [Kernfunctionaliteiten](#kernfunctionaliteiten)
- [Beveiliging & privacy](#beveiliging--privacy)
- [Interface & interactie](#interface--interactie)
- [Technische architectuur](#technische-architectuur)
- [Datamodel & opslag](#datamodel--opslag)
- [Projectstructuur](#projectstructuur)
- [Lokaal draaien](#lokaal-draaien)
- [Deployment](#deployment)
- [Browserondersteuning](#browserondersteuning)
- [Belangrijke aandachtspunten](#belangrijke-aandachtspunten)

---

## Kernfunctionaliteiten

### Dashboard
| Onderdeel | Omschrijving |
|---|---|
| **Dienstoverdracht & bijzonderheden** | Vrije notitieruimte voor de overdracht, met automatische versleutelde opslag tijdens het typen. |
| **Aandachtsdossiers & alertheid** | Gemarkeerde bewoners die extra observatie vragen, met toelichting en directe ZorgNed-doorkoppeling. |
| **Dagplanning & taken** | Checklist met standaardrondes (medicatie, rapportage, veiligheidscheck) en ruimte voor ad-hoc taken. |
| **Bewoners & aanwezigheid** | Compacte stat-tegels (*Gezien / Afwezig / Nog niet gezien*), zoekbalk en detailkaart per bewoner met kamer-, kluis- en cliëntnummer. |
| **Agenda vandaag** | Snel overzicht van de afspraken van vandaag, met inplanknop. |
| **Noodcontacten & Stadsteam Backup** | Belangrijke nummers plus een op team gegroepeerd adresboek met directe bel- en mailacties. |

### Aanwezigheidsregistratie
Statusstip met drie standen — *Nog niet gezien → Gezien → Afwezig / verlof* — per bewoner, met een dienstnotitie en optionele aandachtsvlag.

### Sancties & pandverboden
- Registratie van officiële waarschuwingen (1e t/m laatste waarschuwing) gekoppeld aan een bewoner.
- Beheer van pandverboden en schorsingen met einddatum/-tijd en automatische *actief / verlopen*-status.
- **Live waarschuwing**: zoekt een collega naar iemand met een actief pandverbod, dan verschijnt dat direct prominent in de zoekresultaten.

### Agenda
Volwaardige maand- en dagweergave. Afspraken zijn optioneel aan een bewoner te koppelen; de maandweergave toont per dag het aantal afspraken.

### ZorgNed-integratie
Cliëntdossiers openen via een directe deeplink. In een geïnstalleerde iOS-PWA wordt de link geforceerd in de volledige Safari-app geopend (`x-safari-https://`), zodat de bestaande 2FA-/Authenticator-sessie behouden blijft.

### Dienstbeheer
- **Reset voor nieuwe dienst**: wist in één handeling de overdrachtsnotitie, afgevinkte taken en bewonersstatussen/-notities. Bewonerslijst, contacten, Stadsteam Backup, agenda en sancties blijven behouden.
- **Versleutelde back-up**: exporteer een `.enc`-bestand (met de dienstpincode of een afwijkend exportwachtwoord) en herstel dat op een ander toestel. Import ondersteunt ook oude, onversleutelde JSON-back-ups van vóór de beveiligingsupdate.

---

## Beveiliging & privacy

OnShift is ontworpen rond het principe *"zonder pincode is er niets leesbaar"*.

| Aspect | Implementatie |
|---|---|
| **Versleuteling** | AES-GCM 256-bit; een willekeurige 12-byte IV per schrijfactie. |
| **Sleutelafleiding** | PBKDF2 met SHA-256, **310.000 iteraties** en een 16-byte salt. |
| **Sleutelopslag** | De afgeleide sleutel is een niet-exporteerbare `CryptoKey` die uitsluitend in het geheugen leeft gedurende een ontgrendelde sessie — nooit op schijf. |
| **Data-at-rest** | De volledige applicatiestatus wordt als één versleutelde blob bewaard in een IndexedDB-kluis. Onversleuteld staat alleen de salt en een initialisatievlag in `localStorage`. |
| **Auto-lock** | Automatische vergrendeling na 2, 5 of 10 minuten inactiviteit, plus her-controle wanneer het tabblad weer zichtbaar wordt. |
| **Handmatig vergrendelen** | Via het interactieve switch-logo linksboven of de knop in *Instellingen / Beheer*. |
| **Migratie** | Bestaande onversleutelde `localStorage`-data wordt bij de eerste pincode-instelling eenmalig versleuteld naar de kluis en daarna gewist. |
| **Foutafhandeling** | Onverwachte fouten tonen een neutrale melding; technische details (stacktraces, bestandspaden) gaan uitsluitend naar `console.error` en nooit in beeld. |
| **Indexering** | `noindex, nofollow` — de app hoort niet in zoekmachines thuis. |

> **Let op:** er is geen herstelprocedure voor een vergeten pincode en geen backdoor. Zonder pincode én zonder `.enc`-back-up is de data definitief onleesbaar. Bewaar de pincode op een veilige, bij het team bekende plek.

---

## Interface & interactie

- **Bento-dashboard**: kaarten als afgeronde "eilanden" met zachte schaduw, ruime witruimte en een responsive CSS-grid (1 kolom op mobiel, 2 op tablet, 2–3 op desktop, met bredere spans voor kernkaarten).
- **Sidebar-navigatie**: vaste zijbalk op desktop; op schermen < 1024px een inklapbare drawer met hamburgerknop, verduisterende achtergrond en sluiten via `Esc`.
- **Interactief switch-logo**: het logo linksboven ís de vergrendelknop. Bij een klik speelt de opstart-switchanimatie in **reverse** af (van *aan* naar *uit*); zodra die afrondt, vergrendelt de dienst en verschijnt het pincodescherm.
- **Donker thema** met een groene accentkleur, volledig opgebouwd met CSS custom properties.
- **Toegankelijkheid**: comfortabele tap-targets (≥ 44px), zichtbare focus-states, en respect voor `prefers-reduced-motion` (animaties worden dan overgeslagen, functionaliteit blijft intact).
- **Responsief** getest van 360px tot breedbeeld, zonder horizontale scroll.

---

## Technische architectuur

- **Frontend:** Vanilla JavaScript (`"use strict"`, IIFE-gescoped), HTML5, CSS3. Geen framework, geen build-stap, geen runtime-dependencies.
- **Cryptografie:** Web Crypto API (`crypto.subtle`) voor PBKDF2 en AES-GCM.
- **Opslag:** IndexedDB voor de versleutelde kluis; `localStorage`/`sessionStorage` uitsluitend voor niet-gevoelige vlaggen.
- **PWA & offline:** Service Worker (`sw.js`) met een versiebeheerde app-shell-cache (`onshift-v17`) en een *stale-while-revalidate*-strategie. `skipWaiting()` + `clients.claim()` zorgen dat een nieuwe versie na één herlaadbeurt actief is.
- **UI:** SVG-line-iconen en een geanimeerde SVG-switch, afgestemd op het donkere thema.

---

## Datamodel & opslag

De applicatiestatus is één JSON-object met onder meer:

```text
handoverNote        overdrachtsnotitie
tasks[]             dagtaken (id, text, done)
residents[]         bewoners (id, name, room, status, note, clientnr, locker, isAttention, attentionNote)
contacts[]          noodcontacten (id, name, number)
stadsteam[]         backup-contacten (id, name, team, phone, email)
events[]            agenda-afspraken (id, date, time, title, residentId)
warnings[]          officiële waarschuwingen (id, residentId, date, level, note)
bans[]              pandverboden (id, name, clientnr, reason, untilDate, untilTime)
panelsOpen{}        UI-voorkeuren per paneel
autoLockMinutes     2 | 5 | 10
```

**Opslaglocaties**

| Sleutel | Locatie | Inhoud |
|---|---|---|
| `state` | IndexedDB `onshift_vault_db` → `vault` | `{ iv, ciphertext }` — de versleutelde status |
| `onshift_vault_salt` | `localStorage` | PBKDF2-salt (niet geheim) |
| `onshift_vault_initialized` | `localStorage` | vlag: pincode is ingesteld |
| `onshift_splash_shown` | `sessionStorage` | splash al getoond deze sessie |

---

## Projectstructuur

```text
OnShift/
├── index.html          # App-structuur, overlays (splash, lock, modal), PWA-links
├── style.css           # Thema, CSS-variabelen, responsive bento-grid, animaties
├── app.js              # State, versleuteling, migraties, view-controllers
├── sw.js               # Service Worker: caching & offline-lifecycle
├── manifest.json       # Web App Manifest (standalone, portrait)
├── icon.png            # App-icoon (homescreen, splash, switch-logo)
├── zorgned-icon.png    # Beeldmerk voor ZorgNed-actieknoppen
└── README.md
```

---

## Lokaal draaien

De app heeft een **secure context** nodig (`https://` of `localhost`) omdat de Web Crypto API anders niet beschikbaar is. Openen via `file://` werkt daarom niet.

```bash
# Python 3
python -m http.server 8000

# of Node
npx serve .
```

Open vervolgens <http://localhost:8000>.

> **Tip tijdens ontwikkelen:** de Service Worker cachet agressief. Doe een hard reload (`Ctrl/Cmd + Shift + R`) of zet in DevTools → *Application → Service Workers* de optie **"Update on reload"** aan om altijd de nieuwste code te zien.

---

## Deployment

OnShift is een statische site en draait op elke statische host (GitHub Pages, Netlify, een simpele webserver).

1. Verhoog `CACHE_VERSION` in [`sw.js`](sw.js) bij elke release, zodat clients gegarandeerd de nieuwe code krijgen.
2. Push naar de `main`-branch; GitHub Pages publiceert automatisch op <https://henryh-code.github.io/OnShift/>.

---

## Browserondersteuning

| Vereiste | Reden |
|---|---|
| Web Crypto API (`crypto.subtle`) | PBKDF2 + AES-GCM |
| IndexedDB | versleutelde kluis |
| Service Worker | offline gebruik & installatie als PWA |

Getest op recente versies van Chrome, Edge, Firefox en Safari (desktop en iOS). iOS Safari 14+ wordt aanbevolen voor volledige PWA-functionaliteit.

---

## Belangrijke aandachtspunten

- **Data is toestelgebonden.** Elke browser/elk toestel heeft zijn eigen versleutelde kluis. Gebruik de `.enc`-export om gegevens over te dragen.
- **Geen pincode-herstel.** Zie de waarschuwing bij [Beveiliging & privacy](#beveiliging--privacy).
- **Aanvulling, geen vervanging.** OnShift is een werkinstrument voor de dienst en vervangt niet het officiële cliëntdossier (ZorgNed) of de verplichte rapportage.
