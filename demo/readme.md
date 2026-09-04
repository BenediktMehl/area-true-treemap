# improved-treemap — Demo

Interaktive Demo für das npm-Paket [`improved-treemap`](../packages/improved-treemap). Die Demo nutzt das Paket als echten Workspace-Dependency (`import ... from "improved-treemap"`) und zeigt, wie man das Layout über das **Builder-Pattern** konfiguriert.

## Starten

```bash
# vom Repo-Root
npm install
npm run dev:demo     # http://localhost:5173

# oder direkt hier
npm run dev
```

## Bedienung

- **Margin (relativ)** — Abstand zwischen Knoten (0–3%).
- **Top-Labels (N)** — Anzahl der oberen Hierarchie-Ebenen mit Beschriftung.
- **Label-Höhe (%)** — Höhe des Beschriftungsbereichs relativ zur Leinwand.
- **Sortierung** — absteigend / aufsteigend / keine.
- **Flächen-Metrik** — Name des Attributs, das die Fläche bestimmt (Standard `size`).
- **Ordnerketten zusammenfalten** — verschmilzt Ketten mit nur einem Kind.

Alle Änderungen werden live über den Builder angewendet. Der resultierende Builder-Code wird im Seitenpanel angezeigt.

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
