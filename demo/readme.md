# area-true-treemap — Demo

Interaktive Demo für das npm-Paket [`area-true-treemap`](../packages/area-true-treemap). Die Demo vergleicht zwei Layouts nebeneinander und nutzt das Paket als echten Workspace-Dependency (`import ... from "area-true-treemap"`).

## Die zwei Layouts

1. **Area-True Treemap** — der Algorithmus aus dem Paket, mit Abständen und Labels.
2. **Nested Treemap** — klassischer verschachtelter Treemap (d3.js, `paddingInner`/`paddingOuter` + Labels), mit sichtbaren Ordner-Rahmen.

Dazu gibt es eine **Metriken-Tabelle**, die für beide Layouts direkt vergleicht:

- Knoten- und Blattanzahl
- Ø Seitenverhältnis (niedriger = quadratischer = besser)
- Max Seitenverhältnis
- Berechnungszeit in ms

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

- **Margin** — Abstand zwischen Knoten (0–3%).
- **Labels (N)** — Anzahl der oberen Hierarchie-Ebenen mit Beschriftung.
- **Höhe (%)** — Höhe des Beschriftungsbereichs relativ zur Leinwand.
- **Position** — oben / unten / links / rechts.
- **Sortierung** — absteigend / aufsteigend / keine.
- **Metrik** — Name des Attributs, das die Fläche bestimmt (Standard `size`).
- **Ordnerketten** — verschmilzt Ketten mit nur einem Kind.

Alle Änderungen werden live angewendet (Margin/Labels betreffen dabei auch die Nested-Darstellung).

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
