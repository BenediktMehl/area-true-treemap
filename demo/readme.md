# area-true-treemap — Demo

Interaktive Demo für das npm-Paket [`area-true-treemap`](../packages/area-true-treemap). Die Demo vergleicht
zwei Layouts nebeneinander und nutzt das Paket als echten Workspace-Dependency
(`import { hierarchy, treemap } from "area-true-treemap"` — also genau die d3-artige API, die auch ein
Consumer benutzt).

## Die zwei Layouts

1. **Area-True Treemap** — der Algorithmus aus dem Paket, konfiguriert über
   `treemap().margin().applySiblingMargin().floorLabels()…`.
2. **Nested Treemap** — klassischer verschachtelter Treemap mit d3.js
   (`d3.hierarchy()` + `d3.treemap()`, `paddingOuter`/`paddingInner`/`paddingTop`).

Damit beide überhaupt vergleichbar sind, wird das d3-Layout **mit dem Abstand und der Labelhöhe gespeist, die
das Area-True-Layout tatsächlich realisiert hat** (gemessen an dessen Ausgabe). Beide Panels zeigen also
denselben sichtbaren Abstand; die Metriken darunter sind dadurch direkt vergleichbar.

Die Oberfläche gibt es auf **Deutsch und Englisch** (DE/EN-Schalter oben rechts).

## Metriken-Tabelle

Für beide Layouts werden die Kennzahlen aus der
[Masterthesis](https://github.com/BenediktMehl/master-thesis) (Abschnitt „Bewertungsgrundlage") verglichen;
über jede Zeile lässt sich hovern, um die Erklärung zu sehen. Zeilen, bei denen ein Wert besser ist, werden
hervorgehoben.

- **Platznutzung** — Anteil der Wurzelfläche, der von Blattknoten eingenommen wird. Es gibt kein
  Besser/Schlechter; sie steht zuerst, weil sie die *Vergleichbarkeit* der übrigen Werte bestimmt: nur wenn
  beide Layouts ähnlich viel Fläche für Ränder, Abstände und Labels verbrauchen, sind die anderen Metriken
  fair vergleichbar. Ein niedrigerer Wert heißt, dass mehr Platz für Ränder/Abstände draufgeht – die darunter
  stehenden Werte sind dadurch potenziell schlechter.
- **Knoten / Blätter** — Anzahl dargestellter Rechtecke bzw. Blattknoten (rein informativ).
- **Fehlende Knoten** — *Knotensichtbarkeit*: Blattknoten mit Breite/Höhe ≤ 0, die komplett verschwinden.
  Wichtigste Kennzahl; bester Wert 0.
- **Ø / Max Seitenverhältnis** — Verhältnis der längeren zur kürzeren Seite (1 = Quadrat). Das **Maximum** wird
  von einzelnen Sub-Pixel-Streifen dominiert und ist daher nur als Ausreißer-Indikator zu lesen; der Mittelwert
  ist robuster, der Median (siehe Benchmark-Skript) am aussagekräftigsten.
- **Wertproportionalität** — Varianzkoeffizient des Fläche/Metrik-Verhältnisses (0 = perfekt proportional).
- **Berechnungszeit** — reine Layout-Berechnung in ms, gemittelt über viele Durchläufe (Warm-up + Messung bis
  ~20 ms Budget, max. 500 Iterationen), damit auch Sub-Millisekunden-Werte stabil sind. Rendering ist nicht
  enthalten.

Die Farbgebung nutzt die d3.js-„Lava"-Skala (`interpolateInferno` aus `d3-scale-chromatic`), nach Tiefe
abgestuft; sehr kleine Rechtecke (< 6 px) werden nicht gezeichnet. Beschriftet wird nur, wo das Layout auch
Platz reserviert hat: jeder Ordner mit Labelstreifen (`hasLabel`) bekommt seinen Namen genau in diesen Streifen.
Die Schrift folgt der Streifenhöhe (bis 12 px, bei schmalen Streifen kleiner; unter ~4,5 px bleibt der Ordner
unbeschriftet), wird über die echten Glyphenmaße mittig in den Streifen gesetzt, auf die Ordnerbreite gekürzt
(Auslassungspunkte) und zusätzlich auf den Streifen geclippt, damit sich Namen nicht überlappen oder aus ihrem
Rechteck laufen. Werte stehen nur in Blattknoten und nur, wenn die
Zahl allein in das Rechteck passt.

## Starten

```bash
# vom Repo-Root
npm install
npm run dev:demo     # http://localhost:5174

# oder direkt hier
npm run dev
```

## Bedienung

Alle Änderungen werden live angewendet. Die folgenden Einstellungen wirken auf **beide** Layouts:

- **Margin** (0–3 %) — Abstand zwischen einem Ordner und seinen Kindern (beim d3-Panel als `paddingOuter`
  mit dem realisierten Wert). Thesis-Empfehlung: 0,5–3 %.
- **Etagen-Labels** (an/aus) — reserviert für beschriftete Ordner der oberen Ebenen einen Labelstreifen; der
  Streifen ersetzt dort den oberen Abstand.
- **Anzahl Labels** — Anzahl der oberen Hierarchie-Ebenen mit Beschriftung (Wurzel = Ebene 0; 0 = keine).
  Thesis: N = 2–5 praktikabel.
- **Label-Länge** (0–20 %) — Höhe des Labelstreifens relativ zur Kartenbreite; größere Werte = größere Schrift,
  aber weniger Blattfläche.
- **Variable Label-Größe** — berechnet die Labelhöhe je Ordner aus dessen eigener Breite (CodeCharta-Formel
  `getFloorLabelPadding`) statt mit fester Länge. Wirkt nur auf das Area-True-Layout; das d3-Panel übernimmt
  den an der Wurzel gemessenen Wert als Näherung.
- **Geschwisterabstand** — *Keine* / *Alle* / *Nur Blätter*: trennt zusätzlich Geschwisterknoten (alle oder nur
  Blätter). Beim d3-Panel ist „Nur Blätter" nur näherungsweise abbildbar (`paddingInner` kennt nur einen
  einheitlichen Wert pro Elternteil).
- **Ordnerketten** — faltet Ketten aus Ordnern mit genau einem Ordner-Kind zusammen (im d3-Panel über eine
  Vorverarbeitung des Baums).
- **Sortierung** — absteigend / aufsteigend / keine / mitte („Mitte" verhält sich im Algorithmus wie
  absteigend).
- **Metrik** — Name des Attributs, das die Fläche bestimmt (z. B. `size` oder `rloc`).

Nur auf das Area-True-Layout wirken (d3 kennt keine Entsprechung):

- **Durchläufe** — 1 = reines Squarify (Margin und Labels bleiben wirkungslos), 2 = Areal-Treue mit
  Größenanpassung (empfohlen), > 2 = mehrfache Berechnung (von der Thesis nicht empfohlen).
- **Skalieren** — skaliert im zweiten Schritt die Kinder auf die tatsächlich verfügbare Elternfläche
  (CodeCharta „Apply Scaling"), verhindert Überläufe. Empfohlen: an.
- **Einfache Werterhöhung** — absolute statt relative Größenanpassung zwischen den Durchläufen. Thesis bevorzugt
  relative (aus); absolut ist bei der Wertproportionalität minimal besser.
- **Reihenfolge** — *neu* (nach der Größenanpassung neu absteigend sortieren, Thesis-Empfehlung),
  *behalten* (Reihenfolge aus dem ersten Durchlauf) oder *platz* (Platzierung/Reihen beibehalten).
- **Margin erhöhen** — steigert den Abstand schrittweise über mehrere Durchläufe (nur bei Durchläufen > 2
  relevant).

Die Defaults folgen der Empfehlungstabelle der Thesis (Abstand 1 %, Labels N = 3 / L = 3 %, Sortierung
absteigend, Ordnerketten an, zwei Durchläufe), mit einer Ausnahme: der Geschwisterabstand startet auf „Alle",
weil das auch der Default der Bibliothek ist (die Thesis empfiehlt hier „Keine" plus Umrandungen).

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

Der Flächenwert eines Blatts steht in `attributes[size]` (bzw. unter der eingestellten Metrik). Summen auf
Ordnern werden automatisch berechnet.

## Beispieldaten (Maps)

Im Kopf der Seite lassen sich verschiedene Karten auswählen:

- **flare** — d3-Datensatz aus der Masterthesis (direkt mitgeliefert).
- **kleines Beispiel** — kleiner synthetischer Baum.
- **CodeCharta-Maps** — echte Open-Source-Projekte aus dem
  [CodeCharta-Showcase](https://github.com/MaibornWolff/codecharta): *JUnit 4*, *JUnit 5*,
  *httpd*, *Apache OpenOffice* und *NetBeans*. Die Dateien liegen unverändert als
  `.cc.json` unter `demo/public/data/ccjson/` und werden erst beim Auswählen geladen
  (nicht ins JavaScript-Bundle gepackt), damit die Demo auch mit den großen Maps
  (Apache OpenOffice ~24 MB, NetBeans ~17 MB) klein bleibt. Einmal geladene Maps bleiben im Speicher, das
  Umschalten zurück ist also sofort.

Beim Laden erkennt die Demo das CodeCharta-Format automatisch und wandelt es intern in denselben Baum um, den
auch `flare`/`sample` nutzen — inklusive der Metrik-Auswahl (Standard bei CodeCharta-Maps: `rloc`). Über das
Feld **Metrik** lässt sich jede andere Metrik der Map verwenden (z. B. `mcc`, `functions`, `loc`,
`empty_lines`).

Dasselbe gilt für das **Hochladen eigener Dateien**: sowohl einfache JSON-Bäume als auch rohe
`.cc.json`-Dateien (CodeCharta-Exporte der Versionen 1.x und 2.0) können direkt geöffnet werden.

Hinweis: Apache OpenOffice und NetBeans sind sehr groß; das Layout wird bei jeder Parameteränderung neu
berechnet. Für flüssiges Arbeiten sind JUnit 4/5 oder httpd die besseren Beispiele.

## Benchmark ohne Browser

Dieselbe Gegenüberstellung gibt es als Skript (flare, CodeCharta-Maps, beliebige Größe) mit Markdown-Tabellen
für alle Kennzahlen:

```bash
npm run benchmark
node benchmarks/d3-vs-area-true.mjs --data demo/public/data/ccjson/junit4_2019-10-26.cc.json --metric rloc --size 1000
```

Details, Interpretation und die Portierungsanleitung von d3.js finden sich in
[`docs/porting-from-d3-hierarchy.md`](../docs/porting-from-d3-hierarchy.md).
