# area-true-treemap — Demo

Interaktive Demo für das npm-Paket [`area-true-treemap`](../packages/area-true-treemap). Die Demo vergleicht zwei Layouts nebeneinander und nutzt das Paket als echten Workspace-Dependency (`import ... from "area-true-treemap"`).

## Die zwei Layouts

1. **Area-True Treemap** — der Algorithmus aus dem Paket, mit Abständen und Labels.
2. **Nested Treemap** — klassischer verschachtelter Treemap (d3.js, `paddingInner`/`paddingOuter` + Labels), mit sichtbaren Ordner-Rahmen.

Dazu gibt es eine **Metriken-Tabelle**, die für beide Layouts direkt vergleicht (Kennzahlen aus der [Masterthesis](https://github.com/BenediktMehl/master-thesis), Abschnitt „Bewertungsgrundlage"):

- **Knoten / Blätter** — Anzahl dargestellter Rechtecke bzw. Blattknoten.
- **Fehlende Knoten** — *Knotensichtbarkeit*: Blattknoten mit Breite/Höhe ≤ 0, die komplett verschwinden (wichtigste Kennzahl).
- **Ø / Max Seitenverhältnis** — Verhältnis der längeren zur kürzeren Seite (1 = Quadrat).
- **Wertproportionalität** — Varianzkoeffizient des Fläche/Metrik-Verhältnisses (0 = perfekt proportional).
- **Platznutzung** — Anteil der Wurzelfläche, der von Blattknoten eingenommen wird. Ein niedrigerer Wert heißt, dass mehr Platz für Ränder, Abstände usw. verbraucht wird – die darunter stehenden Werte sind dadurch potentiell schlechter.
- **Berechnungszeit** — reine Layout-Berechnung in ms.

Über jede Metrik lässt sich hovern, um eine Erklärung zu sehen.

Die Farbgebung nutzt die d3.js-„Lava"-Skala (`interpolateInferno` aus `d3-scale-chromatic`), nach Tiefe abgestuft.

## Starten

```bash
# vom Repo-Root
npm install
npm run dev:demo     # http://localhost:5174

# oder direkt hier
npm run dev
```

## Bedienung

- **Margin** — äußerer Abstand zwischen einem Ordner und seinen Kindern (0–3%).
- **Geschwisterabstand** — Schalter: trennt zusätzlich Geschwisterknoten um einen vollen Margin-Wert (nutzt denselben `margin`-Wert, wie im CodeCharta-Algorithmus `applySiblingMargin`).
- **Labels (N)** — Anzahl der oberen Hierarchie-Ebenen mit Beschriftung.
- **Höhe (%)** — Höhe des Beschriftungsbereichs relativ zur Leinwand.
- **Position** — oben / unten / links / rechts.
- **Sortierung** — absteigend / aufsteigend / keine.
- **Metrik** — Name des Attributs, das die Fläche bestimmt (Standard `size`).
- **Ordnerketten** — verschmilzt Ketten mit nur einem Kind.

Alle Änderungen werden live angewendet (Margin, Geschwisterabstand und Labels betreffen dabei auch die Nested-Darstellung).

## Datenformat

Die Demo erwartet einen JSON-Baum:

```json
{
  "name": "root",
  "children": [
    { "name": "folder", "attributes": { "size": 5000 },
      "children": [
        { "name": "file.ts", "attributes": { "size": 2500 } }
      ]
    }
  ]
}
```

Der Flächenwert eines Blatts steht in `attributes[size]` (bzw. unter der eingestellten Metrik). Summen auf Ordnern werden automatisch berechnet.

## Beispieldaten (Maps)

Im Kopf der Seite lassen sich verschiedene Karten auswählen:

- **flare** — d3-Datensatz aus der Masterthesis (direkt mitgeliefert).
- **kleines Beispiel** — kleiner synthetischer Baum.
- **CodeCharta-Maps** — echte Open-Source-Projekte aus dem
  [CodeCharta-Showcase](https://github.com/MaibornWolff/codecharta): *JUnit 4*, *JUnit 5*,
  *httpd*, *Apache OpenOffice* und *NetBeans*. Die Dateien liegen unverändert als
  `.cc.json` unter `demo/public/data/ccjson/` und werden erst beim Auswählen geladen
  (nicht ins JavaScript-Bundle gepackt), damit die Demo auch mit den großen Maps
  (Apache OpenOffice ~24 MB, NetBeans ~17 MB) klein bleibt.

Beim Laden erkennt die Demo das CodeCharta-Format automatisch und wandelt es intern in
denselben Baum um, den auch `flare`/`sample` nutzen — inklusive der Metrik-Auswahl
(Standard bei CodeCharta-Maps: `rloc`). Über das Feld **Metrik** lässt sich jede andere
Metrik der Map verwenden (z. B. `mcc`, `functions`, `loc`, `empty_lines`).

Dasselbe gilt für das **Hochladen eigener Dateien**: sowohl einfache JSON-Bäume als auch
rohe `.cc.json`-Dateien (CodeCharta-Exporte der Versionen 1.x und 2.0) können direkt
geöffnet werden.

Hinweis: Apache OpenOffice und NetBeans sind sehr groß; das Layout wird bei jeder
Parameteränderung neu berechnet. Für flüssiges Arbeiten sind JUnit 4/5 oder httpd die
besseren Beispiele.
