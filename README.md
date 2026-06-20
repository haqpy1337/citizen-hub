# Refinery Assistant — Star Citizen Mining

Eine Webanwendung, mit der du deine **Raffinerie-Auftraege** in Star Citizen
verwaltest und gleichzeitig **Live-Daten** aller Raffinerien (Quoten, Ausbeuten,
Preise) im Blick behaeltst.

- Registrierung & Login (eigene Accounts, Passwoerter gehasht)
- Pro Nutzer ein eigenes Dashboard mit den eigenen Auftraegen
- Auftraege anlegen, verwalten und loeschen
- Live-Countdown pro Auftrag (sieh, was noch laeuft und wie lange)
- Filterbare Uebersicht aller Raffinerie-Stationen mit Auslastung & Ausbeute
- Live-Daten ueber die **UEX Corp API**

---

## 1. Voraussetzungen

- **Node.js 18.18+** (empfohlen 20+)
- npm (liegt Node bei)

## 2. Installation

```bash
# Abhaengigkeiten installieren
npm install

# Umgebungsvariablen anlegen
cp .env.example .env
```

Danach `.env` oeffnen und ausfuellen:

- `AUTH_SECRET` — langer Zufallsstring, z.B. `openssl rand -base64 48`
- `UEX_API_TOKEN` — optionaler API-Key von <https://uexcorp.space/api/apps>
  (ohne Key laufen nur die oeffentlich verfuegbaren Endpunkte)

## 3. Datenbank einrichten

Standard ist **SQLite** — keine Installation noetig:

```bash
npm run db:push      # erstellt prisma/dev.db nach dem Schema
```

## 4. Starten

```bash
npm run dev          # Entwicklungsserver: http://localhost:3000
```

Fuer Produktion:

```bash
npm run build
npm run start
```

---

## 5. Auf PostgreSQL umstellen (optional)

1. In `prisma/schema.prisma` den Datasource-Block aendern:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. In `.env` die `DATABASE_URL` auf deine Postgres-URL setzen.
3. `npm run db:push` erneut ausfuehren.

Sonst aendert sich nichts — der gesamte Code laeuft unveraendert weiter.

---

## 6. Architektur (bewusst erweiterbar gehalten)

```
src/
  lib/
    db.ts            Prisma-Client (Singleton)
    jwt.ts           Edge-taugliche Session-Token (sign/verify)
    auth.ts          Passwort-Hashing + Cookie-Session (Node-Runtime)
    validation.ts    Zod-Schemata fuer alle Eingaben
    format.ts        Zeit-/Dauer-Helfer (Timer, Parser)
    clientTypes.ts   Typen, die das Frontend von den eigenen APIs bekommt
    uex/
      client.ts      HTTP-Wrapper + Cache + API-Key  (eine Stelle fuer Fetch)
      types.ts       >>> ALLE UEX-Feldnamen liegen hier <<<
      endpoints.ts   Normalisierung: Raffinerien, Methoden, Erze
  middleware.ts      schuetzt /dashboard
  app/
    page.tsx                 Landing
    (auth)/login|register    Anmeldemasken
    dashboard/               geschuetzter Bereich
      page.tsx               Uebersicht: laufende Auftraege (Live-Timer)
      jobs/                  alle Auftraege + Anlegen
      refineries/            Live-Raffinerie-Uebersicht mit Filter
    api/
      auth/...               register, login, logout, me
      jobs/...               CRUD fuer Auftraege
      refineries, commodities  Live-Daten (serverseitig, gecached)
  components/                UI-Bausteine (JobForm, JobCard, JobTimer, ...)
```

### Designprinzip fuer die Live-Daten

Das **Frontend kennt nur die normalisierten Typen** aus `clientTypes.ts`.
Wenn UEX seine API-Felder aendert, passt du **nur** `src/lib/uex/types.ts`
und ggf. `src/lib/uex/endpoints.ts` an — das Frontend bleibt unberuehrt.

> Wichtig: Die genauen Feldnamen der UEX-API sind in `types.ts` als
> Best-Effort hinterlegt und mit Kommentaren markiert. Pruefe sie einmal gegen
> die echte Antwort unter <https://uexcorp.space/api/documentation> und
> korrigiere bei Bedarf an dieser einen Stelle. Bis dahin faellt die App sauber
> auf leere Listen zurueck, statt abzustuerzen.

---

## 7. So erweiterst du das Projekt

- **Neues Feld an einem Auftrag** (z.B. erwarteter Gewinn): Feld in
  `prisma/schema.prisma` ergaenzen, `npm run db:push`, Schema in
  `validation.ts` und Typ in `clientTypes.ts` erweitern, im `JobForm`/`JobCard`
  anzeigen.
- **Weiterer Live-Endpunkt** (z.B. Mining-Locations): in `endpoints.ts` eine
  neue normalisierte Funktion bauen, dafuer eine Route unter `app/api/` anlegen.
- **Benachrichtigung bei fertigem Auftrag**: der `JobTimer` kennt bereits den
  Zustand „Bereit zum Abholen“ — hier liesse sich eine Browser-Notification
  oder ein Discord-Webhook anschliessen.

---

## 8. Sicherheitshinweise

- Passwoerter werden mit bcrypt (Cost 12) gehasht, nie im Klartext gespeichert.
- Die Session liegt als signiertes JWT in einem httpOnly-Cookie.
- Jeder Auftrag ist an die User-ID gebunden; die API prueft bei jedem Zugriff
  die Eigentuemerschaft.
- Setze in Produktion unbedingt ein starkes `AUTH_SECRET` und betreibe die App
  hinter HTTPS (das `secure`-Cookie-Flag greift dann automatisch).

---

UEX ist eine fiktive In-Game-Entitaet und nicht mit Cloud Imperium Games
verbunden. Die Daten sind community-gepflegt und koennen vom Live-Server
abweichen.
