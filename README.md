# OnShift

Een lichtgewicht, privacy-vriendelijke Progressive Web App (PWA) ontworpen voor zorgprofessionals en begeleiders om overdrachten, bewonersaanwezigheid, dagtaken en contacten efficiënt te beheren tijdens diensten.

Ontwikkeld om offline-first en lokaal in de browser te functioneren, met speciale integratie voor ZorgNed en geoptimaliseerd voor standalone gebruik op mobiele apparaten (zoals iOS) en desktop.

---

## Belangrijkste Functionaliteiten

* **Dienstoverdracht & Notities:** Centrale klad- en overdrachtsruimte met automatische lokale opslag.
* **Aandachtsdossiers & Alertheid:** Direct visueel overzicht van cliënten die extra observatie of zorg vereisen.
* **Dagplanning & Taken:** Checklist voor vaste rondes (bijv. medicatierondes, rapportages) met mogelijkheid tot toevoegen van ad-hoc taken.
* **Aanwezigheidsregistratie:** 3-traps statusstip (*Nog niet gezien*, *Gezien*, *Afwezig/verlof*) met doorkoppeling naar kamernummers, kluisnummers en notities per bewoner.
* **Directe ZorgNed-koppeling:** Externe dossierlinks openen buiten de geïsoleerde webview direct in de volwaardige browser (Safari) om 2FA/Authenticator-sessies te behouden.
* **Sancties & Pandverboden:** Registratie van officiële waarschuwingen en actieve pandverboden inclusief live waarschuwingen bij het zoeken van bewoners.
* **Geïntegreerde Agenda:** Maand- en dagoverzicht voor afspraken met optie om bewoners direct aan een tijdstip te koppelen.
* **Noodnummers & Stadsteam Backup:** Adresboek gegroepeerd op teams (*Volwassenen*, *Jongvolwassenen*, *Veldwerkers*) met directe bel- en mailacties.
* **Dienst Reset:** Eén-klik opschoning voor een nieuwe dienst (reset aanwezigheid, notities en taken, met behoud van basisgegevens en dossiers).
* **Gegevensbeheer:** Exporteer en importeer volledige databack-ups in JSON-formaat voor back-up of toesteloverdracht.

---

## Technische Architectuur

* **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3.
* **Opslag:** `localStorage` voor consistente client-side dataopslag zonder externe cloudafhankelijkheid.
* **PWA & Offline:** Service Worker (`sw.js`) met versiebeheerde caching voor betrouwbare offline functionaliteit.
* **Branding & Vector UI:** Geanimeerde SVG-gebaseerde splash-startup afgestemd op donker thema.

---

## Bestandsstructuur

```text
├── index.html          # Applicatiestructuur, PWA-manifest links en overlays
├── style.css           # Styling, responsive layout, animaties en CSS-variabelen
├── app.js              # State management, data-migraties en view-controllers
├── sw.js               # Service Worker caching en offline lifecycle management
├── manifest.json       # Web App Manifest configuratie voor standalone modus
├── icon.png            # App-icoon (homescreen en splash)
└── zorgned-icon.png    # Beeldmerk voor ZorgNed-actieknoppen
