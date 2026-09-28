<script lang="ts">
  import { hierarchy as d3Hierarchy, treemap as d3Treemap, type HierarchyRectangularNode } from 'd3-hierarchy';
  import TreemapSvg from '$lib/components/TreemapSvg.svelte';
  import {
    hierarchy,
    treemap,
    SortingOption as AreaTrueSortingOption,
    OrderOption,
    getFloorLabelPadding,
    DEFAULT_FLOOR_LABEL_CONFIG,
    type HierarchyNode,
  } from 'area-true-treemap';
  import type { TreeNode, TreemapRect } from '$lib/types';
  import sample from '$lib/data/sample.json';
  import flare from '$lib/data/flare.json';
  import { ccJsonToTree, isCcJson, suggestAreaMetric } from '$lib/ccjson';

  type Lang = 'de' | 'en';
  let lang: Lang = 'de';

  const translations: Record<Lang, Record<string, string>> = {
    de: {
      title: 'Area-True Treemap',
      subtitle: 'Vergleich mit dem Nested Treemap aus d3.js — dem Standard in der Praxis',
      thesis: 'zur wissenschaftlichen Auswertung (70 Projekte)',
      // The claim is rendered with {@html} so a single sentence can carry its
      // own emphasis. Static string authored here, so nothing user-supplied
      // ever reaches the markup.
      claim:
        'Für die meisten Maps ist der <strong class="ours">Area-True Treemap</strong> in wesentlichen Aspekten besser als der herkömmliche Squarify-Ansatz des <strong>Nested Treemap</strong> in d3.js.',
      infoRows: 'Nur informativ — kein Besser/Schlechter',
      settings: 'Einstellungen',
      settingsNote:
        'Die Standardwerte orientieren sich an der Empfehlung aus der wissenschaftlichen Auswertung; die Margin wird stattdessen pro Map aus deren Blattgrößen abgeleitet (ein Zehntel der typischen Blattkante), der Geschwisterabstand ist abweichend eingestellt. Alle Einstellungen wirken auf beide Karten, außer in der Gruppe „Nur Area-True Treemap“.',
      groupLayout: 'Layout der Karten',
      groupArea: 'Nur Area-True Treemap',
      groupData: 'Daten',
      areaTrueRole: 'dieser Algorithmus',
      nestedRole: 'd3.js-Standard',
      margin: 'Margin',
      floorLabels: 'Etagen-Labels',
      amountOfTopLabels: 'Anzahl Labels',
      labelLength: 'Label-Länge',
      variableLabel: 'Variable Label-Größe',
      passes: 'Durchläufe',
      scale: 'Skalieren',
      simpleIncrease: 'Einfache Werterhöhung',
      order: 'Reihenfolge',
      incrementMargin: 'Margin erhöhen',
      siblingMargin: 'Geschwisterabstand',
      siblingNone: 'Keine',
      siblingAll: 'Alle',
      siblingLeaves: 'Nur Blätter',
      collapse: 'Ordnerketten',
      sort: 'Sortierung',
      metric: 'Metrik',
      load: 'JSON',
      sample: 'Beispiel',
      dataPreset: 'Beispieldaten',
      presetFlare: 'flare (d3)',
      presetSample: 'kleines Beispiel (synthetisch)',
      presetJunit4: 'JUnit 4 (cc.json)',
      presetJunit5: 'JUnit 5 (cc.json)',
      presetHttpd: 'httpd (cc.json)',
      presetAoo: 'Apache OpenOffice (cc.json)',
      presetNetbeans: 'NetBeans (cc.json)',
      loading: 'Lädt…',
      sortNone: 'keine',
      sortAsc: 'aufsteigend',
      sortDesc: 'absteigend',
      sortMiddle: 'mitte',
      orderNew: 'neu',
      orderKeep: 'behalten',
      orderPlace: 'platz',
      metricCol: 'Metrik',
      mNodes: 'Knoten',
      mLeaves: 'Blätter',
      mMissing: 'Fehlende Knoten',
      mAspect: 'Ø Seitenverhältnis',
      mValueProp: 'Wertproportionalität',
      mSpace: 'Platznutzung',
      mGap: 'Realisierter Abstand',
      mTime: 'Berechnungszeit',
      hNodes:
        'Anzahl der Rechtecke mit Fläche > 0 (Ordner und Dateien) — Knoten, die komplett verschwinden, zählen in beiden Karten nach derselben Regel nicht mit. Die Zeile ist deshalb nicht die Summe aus Blättern und fehlenden Knoten: die fehlenden sind per Definition nicht Teil der Zeichnung.',
      hLeaves: 'Anzahl der Blattknoten (Dateien) mit Fläche > 0.',
      hMissing:
        'Knotensichtbarkeit: Anzahl Blattknoten, deren Breite oder Höhe ≤ 0 ist und die dadurch komplett verschwinden. Bester Wert: 0 (keine fehlenden Knoten).',
      hAspect:
        'Seitenverhältnis: Durchschnitt des Verhältnisses der längeren zur kürzeren Seite über alle Knoten, ohne die 10 größten Werte. Bester Wert: 1 (Quadrat). Die 10 größten Werte sind Sub-Pixel-Streifen — Knoten, die nur noch als Splitter existieren, weshalb ihr Seitenverhältnis in die Hunderte oder Tausende geht. Ein ungetrimmter Mittelwert wird von ihnen bestimmt statt von der Karte. Ein Median ist daneben nicht nötig: das Trimmen erledigt dasselbe.',
      hValueProp:
        'Wertproportionalität: Quartilsdispersionskoeffizient des Fläche/Metrik-Verhältnisses, (p75 − p25) / (p75 + p25), über alle Knoten. Bester Wert: 0 (perfekt proportional). Gemessen wird die mittlere Hälfte der Knoten: einzelne Ausreißer — etwa Knoten, deren Fläche weit über ihrem Wert liegt, weil das Layout Platz für die Abstände in ihrem Teilbaum reserviert — verschieben den Wert nicht mehr, anders als beim Varianzkoeffizienten.',
      hSpace:
        'Platznutzung (Vergleichbarkeit): Anteil der Wurzelfläche, der von Blattknoten eingenommen wird. Wichtig ist nur, dass beide Werte ähnlich sind, damit die beiden Outputs überhaupt verglichen werden können. Hinweis: Ein niedrigerer Wert bedeutet, dass mehr Platz für Ränder, Abstände usw. verbraucht wird und die Vergleichswerte dadurch potentiell schlechter ausfallen.',
      hGap:
        'Realisierter Abstand: der Abstand, den das Layout tatsächlich zeichnet, in Pixel — gemessen an der Ausgabe des jeweiligen Layouts. Er ergibt sich aus der Margin in Prozent mal Kartenbreite, beide Panels werden mit demselben Wert gezeichnet.',
      spaceNote:
        'Die Margin ({gap} px) ist größer als die mittlere Blattkante dieser Map ({edge} px). Dann bestimmt der Abstand, was zu sehen ist, und nicht die Metrik: Beide Karten bestehen fast nur aus Abstand, die Vergleichswerte sagen kaum noch etwas aus. Für große Maps einen kleineren Margin-Wert wählen.',
      hTime: 'Zeitaufwand: Reine Berechnungszeit des Layout-Algorithmus in ms (ohne Rendering). Bester Wert: möglichst niedrig.',
      areaTrue: 'Area-True Treemap',
      areaTrueSub: 'area-true-treemap',
      nested: 'Nested Treemap',
      nestedSub: 'd3.js nested treemap',
      empty: 'Keine Daten.',
      whyTitle: 'Was besser ist — und was es kostet',
      whyLead:
        'Beide Karten zeigen dieselben Daten mit demselben Abstand zwischen den Knoten. Der Unterschied liegt darin, wie das Layout diesen Abstand berücksichtigt.',
      whyD3Head: 'Nested Treemap',
      whyAtHead: 'Area-True Treemap (verbesserter Squarify)',
      whyD3a:
        'Der Abstand wird realisiert, indem jeder Knoten um die Größe des Abstands verkleinert wird (padding, in Pixel).',
      whyD3b:
        'Knoten, die schmaler oder flacher als der Abstand sind, verlieren dadurch ihre gesamte Fläche und verschwinden vollständig.',
      whyD3c:
        'Beschriftungen, das Zusammenfassen von Ordnerketten und die Skalierung der Kindknoten auf die verfügbare Elternfläche müssen selbst ergänzt werden.',
      whyAta:
        'Vor dem zweiten Durchlauf werden die Knotengrößen so angepasst, dass die angestrebten Abstände berücksichtigt sind (Größenanpassung).',
      whyAtb: 'Dadurch bleibt die Fläche jedes Knotens proportional zu seinem Wert, und kein Knoten verliert seine Fläche.',
      whyAtc:
        'Beschriftungen, Abstände nur zwischen Blattknoten und das Zusammenfassen von Ordnerketten sind bereits Teil des Layouts.',
      whyLive:
        'Genau das zeigt die Zeile „Fehlende Knoten" in der Tabelle oben: Mit den Standardeinstellungen (0,5 % Abstand, Geschwisterabstand „Alle", wie sie die Regel für flare ergibt) fehlt beim Nested Treemap 1 von 220 Blattknoten, hier 0 — bei 1 % Abstand sind es 16 gegenüber 0, der Effekt wächst also mit dem Abstand. Beide Layouts verwenden dabei denselben realisierten Abstand.',
      whyMore: 'Wie das Layout den Abstand berücksichtigt — und was das kostet',
      whyHow:
        'Das Layout wird in zwei Durchläufen berechnet: Der erste Durchlauf erzeugt ein vorläufiges Layout ohne Abstände. Darauf aufbauend werden die Knotengrößen so angepasst, dass die angestrebten Abstände berücksichtigt sind (Größenanpassung); der zweite Durchlauf erzeugt daraus das endgültige Layout. Der Abstand ist relativ: 1 % entspricht 1 % der Seitenlänge des Wurzelknotens.',
      whyCost:
        'Der Mehraufwand: rund 2–3× so viel Rechenzeit wie bei d3, in beiden Fällen weit unter einem Frame. Als Kachelungsverfahren steht nur Squarify zur Verfügung, und ab etwa 3 % Abstand nimmt das Treemap-Problem bei beiden Layouts deutlich zu. Die API bleibt ein Drop-in: hierarchy() + treemap() mit x0/y0/x1/y1 wie gewohnt.',
      whyRepo: 'README',
      whyDocs: 'Messwerte & Portierungsanleitung',
    },
    en: {
      title: 'Area-True Treemap',
      subtitle: 'Compared with the nested treemap from d3.js — the standard in practice',
      thesis: 'scientific evaluation (70 projects)',
      claim:
        'For most maps the <strong class="ours">Area-True Treemap</strong> is better in the essential aspects than the conventional squarify approach of the <strong>Nested Treemap</strong> in d3.js.',
      infoRows: 'Informational only — no better/worse',
      settings: 'Settings',
      settingsNote:
        'The defaults follow the recommendation of the scientific evaluation; the margin instead is derived from each map’s own leaf sizes (a tenth of the typical leaf edge), and the sibling margin is set differently. Every setting affects both maps unless it is in the “Area-True Treemap only” group.',
      groupLayout: 'Layout of the maps',
      groupArea: 'Area-True Treemap only',
      groupData: 'Data',
      areaTrueRole: 'this algorithm',
      nestedRole: 'd3.js standard',
      margin: 'Margin',
      floorLabels: 'Floor labels',
      amountOfTopLabels: 'Amount of labels',
      labelLength: 'Label length',
      variableLabel: 'Variable label size',
      passes: 'Passes',
      scale: 'Scale',
      simpleIncrease: 'Simple increase',
      order: 'Order',
      incrementMargin: 'Increment margin',
      siblingMargin: 'Sibling margin',
      siblingNone: 'None',
      siblingAll: 'All',
      siblingLeaves: 'Leaves only',
      collapse: 'Collapse folders',
      sort: 'Sort',
      metric: 'Metric',
      load: 'JSON',
      sample: 'Sample',
      dataPreset: 'Sample data',
      presetFlare: 'flare (d3)',
      presetSample: 'small sample (synthetic)',
      presetJunit4: 'JUnit 4 (cc.json)',
      presetJunit5: 'JUnit 5 (cc.json)',
      presetHttpd: 'httpd (cc.json)',
      presetAoo: 'Apache OpenOffice (cc.json)',
      presetNetbeans: 'NetBeans (cc.json)',
      loading: 'Loading…',
      sortNone: 'none',
      sortAsc: 'ascending',
      sortDesc: 'descending',
      sortMiddle: 'middle',
      orderNew: 'new',
      orderKeep: 'keep',
      orderPlace: 'place',
      metricCol: 'Metric',
      mNodes: 'Nodes',
      mLeaves: 'Leaves',
      mMissing: 'Missing nodes',
      mAspect: 'Mean aspect ratio',
      mValueProp: 'Value proportionality',
      mSpace: 'Space utilization',
      mGap: 'Realized gap',
      mTime: 'Compute time',
      hNodes:
        'Number of rectangles with area > 0 (folders and files) — nodes that disappear entirely do not count, by the same rule in both maps. The row is therefore not the sum of leaves plus missing nodes: the missing ones are by definition not part of the drawing.',
      hLeaves: 'Number of leaf nodes (files) with area > 0.',
      hMissing:
        'Node visibility: number of leaf nodes whose width or height ≤ 0, so they disappear entirely. Best value: 0 (no missing nodes).',
      hAspect:
        'Aspect ratio: average of the longer-to-shorter side ratio across all nodes, leaving out the 10 largest values. Best value: 1 (square). Those 10 are sub-pixel slivers — nodes that only survive as a thin strip, which is why their aspect ratio runs into the hundreds or thousands. A plain average is decided by them rather than by the map. A median is not needed next to it: trimming does the same job.',
      hValueProp:
        'Value proportionality: quartile coefficient of dispersion of the area/metric ratio, (p75 − p25) / (p75 + p25), across all nodes. Best value: 0 (perfectly proportional). It measures the middle half of the nodes: single outliers — such as a node whose area is far above its value because the layout reserves room for the gaps inside its subtree — no longer move the value, unlike with the coefficient of variation.',
      hSpace:
        'Space utilization (comparability): fraction of the root area occupied by leaf nodes. What matters is only that both values are similar, so the two outputs can be compared at all. Note: a lower value means that more space is consumed by margins, paddings etc., which can make the compared values look worse.',
      hGap:
        'Realized gap: the gap the layout actually draws, in pixels — measured on the output of each layout. It follows from the margin in percent times the map width, and both panels are drawn with the same value.',
      spaceNote:
        'The margin ({gap} px) is larger than the mean leaf edge of this map ({edge} px). The gap, not the metric, then decides what is drawn: both maps are almost entirely gap, and the compared values say little. Pick a smaller margin for large maps.',
      hTime: 'Time: pure layout computation time in ms (without rendering). Best value: as low as possible.',
      areaTrue: 'Area-True Treemap',
      areaTrueSub: 'area-true-treemap',
      nested: 'Nested Treemap',
      nestedSub: 'd3.js nested treemap',
      empty: 'No data.',
      whyTitle: 'What is better — and what it costs',
      whyLead:
        'Both maps show the same data with the same gap between the nodes. The difference is how the layout takes that gap into account.',
      whyD3Head: 'Nested Treemap',
      whyAtHead: 'Area-True Treemap (improved squarify)',
      whyD3a: 'The gap is realized by shrinking every node by the size of the gap (padding, in pixels).',
      whyD3b:
        'Nodes that are narrower or flatter than the gap lose their whole area as a result and disappear completely.',
      whyD3c:
        'Labels, collapsing folder chains and scaling the children onto the available parent area have to be added on top.',
      whyAta:
        'Before the second pass the node sizes are adjusted so that the intended gaps are taken into account (size adjustment).',
      whyAtb: 'That keeps the area of every node proportional to its value, and no node loses its area.',
      whyAtc: 'Labels, gaps only between leaf nodes and collapsing folder chains are already part of the layout.',
      whyLive:
        'That is exactly what the “Missing nodes” row in the table above shows: with the default settings (0.5 % gap, sibling margin “All”, which is what the rule yields for flare) 1 of 220 leaf nodes is missing with the Nested Treemap and 0 here — at a 1 % gap it is 16 versus 0, so the effect grows with the gap. Both layouts use the same realized gap.',
      whyMore: 'How the layout takes the gap into account — and what it costs',
      whyHow:
        'The layout is computed in two passes: the first pass produces a preliminary layout without gaps. Based on it, the node sizes are adjusted so that the intended gaps are taken into account (size adjustment); the second pass produces the final layout from those sizes. The gap is relative: 1 % means 1 % of the side length of the root node.',
      whyCost:
        'The extra cost: roughly 2–3× the compute time of d3, both far below a frame. Squarify is the only tiling available, and above a gap of about 3 % the treemap problem grows noticeably for both layouts. The API stays a drop-in: hierarchy() + treemap() with x0/y0/x1/y1 as before.',
      whyRepo: 'README',
      whyDocs: 'Measurements & porting guide',
    },
  };

  $: t = translations[lang];

  // Hover explanation per setting: what it does and whether it affects both
  // algorithms or only the area-true one. Values marked "Empfohlen" come from
  // the recommendation table in the improve-squarify chapter of the master
  // thesis (Fazit of the algorithm chapter) — the UI names the source as
  // "wissenschaftliche Auswertung" instead, since the thesis itself is not what
  // a visitor of the demo is after.
  interface HelpText {
    de: string;
    en: string;
  }
  const helpTexts: Record<string, HelpText> = {
    margin: {
      de: 'Relativer Abstand zwischen benachbarten Knoten (in % der Seitenlänge der Wurzel; je Karte wird er so umgerechnet, dass beide denselben realisierten Abstand zeigen). Struktur ist ab ca. 0,5 % erkennbar, über ca. 3 % dominiert das Treemap-Problem. Empfohlen: manuelle Wahl 0,5–3 %. Wirkt auf: beide Algorithmen.',
      en: 'Relative gap between neighbouring nodes (as % of the root side length; converted per map so both realize the same gap). Structure is visible from ~0.5 %, above ~3 % the treemap problem dominates. Recommended: manual choice 0.5–3 %. Affects: both algorithms.',
    },
    floorLabels: {
      de: 'Reserviert für beschriftete Ordner der oberen N Ebenen einen Streifen für den Ordnernamen; der Streifen ersetzt dort den oberen Abstand. Beschriftungen verbessern die Orientierung, kosten aber Blattfläche. Wirkt auf: beide Algorithmen.',
      en: 'Reserves a strip for the folder name on the top N levels of labeled folders; the strip replaces the top gap there. Labels improve orientation but cost leaf area. Affects: both algorithms.',
    },
    amountOfTopLabels: {
      de: 'N = Anzahl der oberen Ebenen, deren Ordner eine Beschriftung erhalten (Wurzel = Ebene 0 zählt mit; 0 = keine). Empfohlen: N = 2–5, der Vergleich nutzt N = 3. Wirkt auf: beide Algorithmen.',
      en: 'N = number of top levels whose folders get a label (root = level 0 counts; 0 = none). Recommended: N = 2–5, the comparison uses N = 3. Affects: both algorithms.',
    },
    labelLength: {
      de: 'L = relative Länge des für die Beschriftung reservierten Streifens (% der Seitenlänge der Wurzel). Größeres L → größere Schrift, aber weniger Blattfläche und mehr potenziell fehlende Knoten. Empfohlen: L = 3–10 %, Vergleich ≈ 4 %. Wirkt auf: beide Algorithmen.',
      en: 'L = relative length of the reserved label strip (% of the root side length). Larger L → larger text, but less leaf area and more potentially missing nodes. Recommended: L = 3–10 %, comparison ≈ 4 %. Affects: both algorithms.',
    },
    variableLabel: {
      de: 'Berechnet die Beschriftungshöhe je Ordner aus dessen eigener Breite (variabel je Ordner) statt mit fester Länge L. Wirkt auf: nur den Area-True-Treemap-Algorithmus (die Nested-Karte übernimmt nur den an der Wurzel gemessenen Wert als Näherung).',
      en: 'Computes the label height per folder from its own width (variable per folder) instead of a fixed length L. Affects: only the Area-True Treemap algorithm (the nested map only mirrors the root-measured value as an approximation).',
    },
    passes: {
      de: 'Anzahl der Layout-Durchläufe. 1 = nur Standard-Squarify, Margin/Beschriftungen bleiben wirkungslos. 2 = Größenanpassung + zweiter Layoutschritt (empfohlen). Mehrfache Berechnung (>2) wird nicht empfohlen. Wirkt auf: nur den Area-True-Treemap-Algorithmus.',
      en: 'Number of layout passes. 1 = plain squarify, margin/labels have no effect. 2 = size adjustment + second layout step (recommended). Multiple computation (>2) is not recommended. Affects: only the Area-True Treemap algorithm.',
    },
    scale: {
      de: 'Skaliert im zweiten Layoutschritt die Kindknoten auf die tatsächlich verfügbare Elternfläche (Skalierung auf die Elternfläche). Verhindert, dass Knoten die Elternfläche überragen (valide Layouts). Empfohlen: an. Wirkt auf: nur den Area-True-Treemap-Algorithmus.',
      en: 'In the second layout step, scales the children onto the actually available parent area (scaling onto the parent area). Prevents nodes from overflowing their parent (valid layouts). Recommended: on. Affects: only the Area-True Treemap algorithm.',
    },
    simpleIncrease: {
      de: 'Wahl der Größenanpassung zwischen den beiden Layoutschritten: an = absolute, aus = relative Größenanpassung. Empfohlen ist die relative (aus): weniger fehlende Knoten; die absolute ist bei der Wertproportionalität minimal besser. Empfohlen: aus. Wirkt auf: nur den Area-True-Treemap-Algorithmus.',
      en: 'Size adjustment between the two layout steps: on = absolute, off = relative. Recommended is relative (off): fewer missing nodes; absolute is marginally better in value proportionality. Recommended: off. Affects: only the Area-True Treemap algorithm.',
    },
    order: {
      de: 'Strategie des zweiten Layoutschritts (relevant bei 2+ Durchläufen): „Neu" = nach der Größenanpassung neu absteigend sortieren (empfohlen); „Behalten" = Reihenfolge aus dem ersten Durchlauf; „Platz" = Platzierung/Reihen aus dem ersten Durchlauf beibehalten. Wirkt auf: nur den Area-True-Treemap-Algorithmus.',
      en: 'Second layout step strategy (relevant with 2+ passes): "New" = re-sort descending after the size adjustment (recommended); "Keep" = keep the first-pass order; "Place" = keep the first-pass placement/rows. Affects: only the Area-True Treemap algorithm.',
    },
    incrementMargin: {
      de: 'Steigert den Abstand schrittweise über mehrere Durchläufe (nur bei Durchläufen > 2 relevant, die nicht empfohlen sind). Wirkt auf: nur den Area-True-Treemap-Algorithmus.',
      en: 'Increases the gap gradually across multiple passes (only relevant for >2 passes, which is not recommended). Affects: only the Area-True Treemap algorithm.',
    },
    siblingMargin: {
      de: 'Zusätzlicher Abstand zwischen Geschwisterknoten: „Keine" = keine Geschwisterabstände; „Alle" = jeder Knoten wird um den halben Abstand verkleinert (sehr schmale Knoten verschwinden dabei); „Nur Blätter" = nur Blattknoten werden verkleinert, Abstände entstehen ausschließlich zwischen Blättern, Ordner bleiben ohne Abstand. Empfohlen: keine Geschwisterabstände, stattdessen Umrandungen. Wirkt auf: beide Algorithmen („Nur Blätter" ist im Nested-Treemap nur näherungsweise abbildbar).',
      en: 'Extra gap between sibling nodes: "None" = no sibling gaps; "All" = every node shrinks by half the gap (very thin nodes disappear in the process); "Leaves only" = only leaf nodes shrink, gaps appear exclusively between leaves, folders stay without gaps. Recommended: no sibling gaps, use outlines instead. Affects: both algorithms ("leaves only" can only be approximated in the nested treemap).',
    },
    collapse: {
      de: 'Faltet Ordnerketten (Ordner mit genau einem Ordner als Kind) zu einem Knoten zusammen. Empfohlen: verwenden – rund zehnmal weniger fehlende Knoten und bessere Platznutzung. Wirkt auf: beide Algorithmen.',
      en: 'Collapses folder chains (folders with exactly one folder child) into a single node. Recommended: use it — roughly ten times fewer missing nodes and better space utilization. Affects: both algorithms.',
    },
    sort: {
      de: 'Sortierung der Knoten nach Größe vor der Einfügung. Empfohlen: absteigend nach Größe ist optimal (bessere Seitenverhältnisse, weniger fehlende Knoten). „Mitte" wird in der Demo wie absteigend behandelt. Wirkt auf: beide Algorithmen.',
      en: 'Sorts nodes by size before insertion. Recommended: descending by size is optimal (better aspect ratios, fewer missing nodes). "Middle" is treated like descending in this demo. Affects: both algorithms.',
    },
    metric: {
      de: 'Name des Metrik-Attributs im Datensatz (z. B. size oder rloc), dessen Wert die Fläche der Knoten bestimmt. Wirkt auf: beide Algorithmen.',
      en: 'Name of the metric attribute in the dataset (e.g. size or rloc) whose value determines node area. Affects: both algorithms.',
    },
    dataset: {
      de: 'Wählt die Beispieldaten (flare bzw. ein kleines synthetisches Beispiel) oder lädt eine eigene JSON-Datei. Kein Algorithmus-Parameter.',
      en: 'Selects the sample data (flare or a small synthetic sample) or loads your own JSON file. Not an algorithm parameter.',
    },
  };

  function help(key: string): string {
    return helpTexts[key]?.[lang] ?? '';
  }

  // Example datasets, selectable in the header.
  //
  // Two flavours: datasets that are small enough to be bundled directly
  // (`data`, imported above) and raw cc.json maps that are served
  // from `public/data/ccjson/` and fetched on demand (`url`) — the latter keeps
  // the big real-world maps (up to ~25 MB) out of the JavaScript bundle.
  interface ExampleDef {
    data?: TreeNode;
    url?: string;
    metric: string;
    labelKey: string;
  }
  const ccJsonUrl = (file: string): string => `${import.meta.env.BASE_URL}data/ccjson/${file}`;
  const examples: Record<string, ExampleDef> = {
    flare: { data: flare as unknown as TreeNode, metric: 'size', labelKey: 'presetFlare' },
    sample: { data: sample as TreeNode, metric: 'size', labelKey: 'presetSample' },
    junit4: { url: ccJsonUrl('junit4_2019-10-26.cc.json'), metric: 'rloc', labelKey: 'presetJunit4' },
    junit5: { url: ccJsonUrl('junit5_2019-10-26.cc.json'), metric: 'rloc', labelKey: 'presetJunit5' },
    httpd: { url: ccJsonUrl('httpd_2019-10-26.cc.json'), metric: 'rloc', labelKey: 'presetHttpd' },
    aoo: { url: ccJsonUrl('aoo_2019-08-02.cc.json'), metric: 'rloc', labelKey: 'presetAoo' },
    netbeans: { url: ccJsonUrl('netbeans_2019-10-19.cc.json'), metric: 'rloc', labelKey: 'presetNetbeans' },
  };
  const exampleOrder: { id: string; labelKey: string }[] = [
    { id: 'flare', labelKey: 'presetFlare' },
    { id: 'sample', labelKey: 'presetSample' },
    { id: 'junit4', labelKey: 'presetJunit4' },
    { id: 'junit5', labelKey: 'presetJunit5' },
    { id: 'httpd', labelKey: 'presetHttpd' },
    { id: 'aoo', labelKey: 'presetAoo' },
    { id: 'netbeans', labelKey: 'presetNetbeans' },
  ];

  let exampleId = 'flare';
  let loadedData: TreeNode = examples.flare.data as TreeNode;
  // Once fetched, a cc.json map is kept around, so switching back is instant.
  const exampleCache = new Map<string, TreeNode>();
  let loadingExample = false;

  // Algorithm settings (area-true squarify).
  // The margin slider's range. The derived default (defaultMarginPercent) snaps
  // to the same step and never goes below the smallest one — the slider can be
  // moved to 0, but a gap the demo picks should be a gap one can see.
  const MARGIN_MIN_PERCENT = 0.1;
  const MARGIN_MAX_PERCENT = 3;
  const MARGIN_STEP_PERCENT = 0.1;

  // Most defaults follow the recommendation table of the master thesis (Fazit
  // of the improve-squarify chapter): relative size adjustment, floor labels
  // N = 3 / L = 3 % on the top levels (recommended N 2–5, L 3–10 %), sorting
  // descending, collapse folder chains, two passes only. Two are derived
  // instead: the gap comes from the map's own leaf sizes (see
  // defaultMarginPercent — the thesis' 0.5–3 % assume leaves far bigger than the
  // bundled cc.json maps have), and sibling margins default to "all" although
  // the thesis recommends none. Both are meant to be moved by the sliders.
  let areaMetric = 'size';
  let marginPercent = defaultMarginPercent(loadedData, areaMetric);
  let enableFloorLabels = true;
  let amountOfTopLabels = 3;
  let labelPercent = 3;
  let variableLabelSize = false;
  let numberOfPasses = 2;
  let useScale = true;
  let simpleIncreaseValues = false;
  let orderOption: OrderOption = OrderOption.NEW_ORDER;
  let incrementMargin = false;
  let siblingMode: 'none' | 'all' | 'leaves' = 'all';
  let collapseFolders = true;
  let sorting: AreaTrueSortingOption = AreaTrueSortingOption.DESCENDING;

  const containerSize = 400;

  const sortingOptions: AreaTrueSortingOption[] = [
    AreaTrueSortingOption.NONE,
    AreaTrueSortingOption.ASCENDING,
    AreaTrueSortingOption.DESCENDING,
    AreaTrueSortingOption.MIDDLE,
  ];
  const orderOptions: OrderOption[] = [OrderOption.NEW_ORDER, OrderOption.KEEP_ORDER, OrderOption.KEEP_PLACE];

  interface Stats {
    nodes: number;
    leaves: number;
    missing: number;
    /** Mean aspect ratio without the largest `ASPECT_TRIM` values. */
    trimmedAspect: number;
    /** Quartile coefficient of dispersion of the area/metric ratio. */
    valueProp: number;
    spaceUtil: number;
    /** Gap the layout actually drew, measured on its own output. */
    realizedGapPx: number;
    ms: number;
  }

  interface Result {
    key: string;
    title: string;
    /** Short role line saying whose algorithm this is (ours vs. d3 standard). */
    role: string;
    subtitle: string;
    repoUrl: string;
    rects: TreemapRect[];
    stats: Stats;
  }

  let results: Result[] = [];

  // Measures the average runtime of `fn` in milliseconds over enough
  // iterations to yield sub-millisecond precision (two decimals).
  function measureMs(fn: () => void): number {
    fn(); // warm-up so JIT/initialization does not skew the result
    const budgetMs = 20;
    const maxIterations = 500;
    let iterations = 0;
    let elapsed = 0;
    const t0 = performance.now();
    for (let i = 0; i < maxIterations; i++) {
      fn();
      iterations++;
      elapsed = performance.now() - t0;
      if (elapsed >= budgetMs) break;
    }
    return elapsed / iterations;
  }

  $: totalLeaves = countLeaves(loadedData);

  // The margin the user asked for, in the demo's own pixels (the layout works in
  // fraction of the map width), and the edge a leaf would have if the leaves
  // shared the map evenly. A margin above that edge decides what is visible
  // instead of the metric: every gap is then wider than the leaf it separates,
  // so both maps end up as mostly gap. The note under the Platznutzung row says
  // so, because that row is where the effect becomes visible.
  $: marginPx = (marginPercent / 100) * containerSize;
  $: meanLeafEdgePx = totalLeaves > 0 ? containerSize / Math.sqrt(totalLeaves) : 0;
  // Two decimals on purpose: at the default gap the margin and the leaf edge are
  // close together, and one decimal would print the same number twice ("1.2 px
  // is larger than 1.2 px").
  $: spaceNote =
    marginPx > meanLeafEdgePx
      ? t.spaceNote.replace('{gap}', marginPx.toFixed(2)).replace('{edge}', meanLeafEdgePx.toFixed(2))
      : '';

  $: {
    // --- 1) Area-True Treemap (area-true squarify, d3-style API) ---
    // The layout is configured like d3-hierarchy: wrap the tree, sum the leaf
    // metrics, then call the configured layout function on the wrapped root.
    // It mutates the wrapped nodes in place, so every wrapped node carries its
    // x0/x1/y0/y1 rectangle afterwards.
    const labelTopLevels = enableFloorLabels ? Math.max(0, amountOfTopLabels) : 0;
    const areaTree = hierarchy(structuredClone(loadedData) as TreeNode).sum((d) =>
      !d.children || d.children.length === 0 ? d.attributes?.[areaMetric] ?? 0 : 0,
    );
    const areaLayout = treemap<TreeNode>()
      .size([containerSize, containerSize])
      .numberOfPasses(numberOfPasses)
      .scale(useScale)
      .simpleIncreaseValues(simpleIncreaseValues)
      .margin(marginPercent / 100)
      .applySiblingMargin(siblingMode !== 'none')
      .siblingMarginLeavesOnly(siblingMode === 'leaves')
      .floorLabels(labelTopLevels)
      .sorting(sorting)
      .order(orderOption)
      .incrementMargin(incrementMargin)
      .collapseFolders(collapseFolders)
      .labelLength(
        variableLabelSize
          ? (node) => getFloorLabelPadding(node.x1 - node.x0, node.depth, DEFAULT_FLOOR_LABEL_CONFIG)
          : labelPercent / 100,
      );

    let areaTrueRects: TreemapRect[] = [];
    let areaTrueMs = 0;
    let realizedMarginPx = 0;
    let realizedLabelPx = 0;
    {
      // Measure the average over many iterations (same as the nested panel),
      // so a single fast run cannot show a misleading 0.00 ms.
      areaTrueMs = measureMs(() => {
        areaLayout(areaTree);
        areaTrueRects = flattenWrapped(areaTree, labelTopLevels);
      });
      // Measured on the layout output, so the nested panel can mirror the gap
      // and label strip the area-true layout actually realized.
      realizedMarginPx = outerInsetPx(areaTrueRects, labelTopLevels > 0);
      realizedLabelPx = rootLabelStripPx(areaTrueRects, labelTopLevels > 0);
    }

    // --- 2) Nested treemap (d3) with the same realized margin/label ---
    let nestedRects: TreemapRect[] = [];
    const nestedMs = measureMs(() => {
      nestedRects = computeNestedD3(loadedData, {
        metric: areaMetric,
        size: containerSize,
        gapPx: realizedMarginPx,
        innerGapPx: siblingMode !== 'none' ? realizedMarginPx : 0,
        innerLeavesOnly: siblingMode === 'leaves',
        labelPx: enableFloorLabels ? realizedLabelPx : 0,
        labelEnabled: enableFloorLabels,
        topLevels: amountOfTopLabels,
        sorting,
        collapseFolders,
      });
    });

    // The gap each panel actually drew, measured on its own output rather than
    // taken from the value that was fed in — so a layout that draws a different
    // gap than it was configured with shows up in the table instead of hiding in
    // the mirroring.
    const nestedGapPx = outerInsetPx(nestedRects, enableFloorLabels);

    // Order matters: the area-true map is the first column everywhere it is
    // compared (metrics table, panels).
    results = [
      {
        key: 'area-true',
        title: t.areaTrue,
        role: t.areaTrueRole,
        subtitle: t.areaTrueSub,
        repoUrl: 'https://github.com/BenediktMehl/area-true-treemap',
        rects: areaTrueRects,
        stats: computeStats(areaTrueRects, areaTrueMs, totalLeaves, containerSize, realizedMarginPx),
      },
      {
        key: 'nested',
        title: t.nested,
        role: t.nestedRole,
        subtitle: t.nestedSub,
        repoUrl: 'https://github.com/d3/d3-hierarchy',
        rects: nestedRects,
        stats: computeStats(nestedRects, nestedMs, totalLeaves, containerSize, nestedGapPx),
      },
    ];
  }

  /** How many of the largest aspect ratios the mean leaves out. */
  const ASPECT_TRIM = 10;

  /**
   * Mean aspect ratio over all rectangles except the `ASPECT_TRIM` largest ones.
   *
   * Those are the sub-pixel slivers: a rectangle that survived as a fraction of a
   * pixel has an aspect ratio in the hundreds or thousands (Apache OpenOffice,
   * d3 panel: a single node above 1400), and a plain mean is decided by them
   * rather than by the map. Trimming the top values is what the median was there
   * for, so this is the one aspect-ratio value the table needs.
   */
  function trimmedMeanAspect(aspects: number[]): number {
    if (aspects.length === 0) return 0;
    const kept = aspects.length > ASPECT_TRIM ? [...aspects].sort((a, b) => a - b).slice(0, aspects.length - ASPECT_TRIM) : aspects;
    return kept.reduce((s, a) => s + a, 0) / kept.length;
  }

  /**
   * (p75 - p25) / (p75 + p25): how wide the middle half of the area/metric
   * ratios spreads, relative to its own level. 0 = the middle half is perfectly
   * proportional, and it stays comparable across panels because it is
   * scale-free.
   *
   * Used instead of the coefficient of variation: the area-true layout inflates
   * a subtree to make room for the gaps inside it, which on large maps gives a
   * handful of nodes an area orders of magnitude above their value. A
   * variance-based measure is dominated by exactly those few nodes (single
   * outliers move it by 10x) and hides how tight the bulk of the map actually
   * is. The quartiles ignore the tails by construction.
   */
  function quartileCoefficientOfDispersion(values: number[]): number {
    if (values.length < 2) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    const p25 = at(0.25);
    const p75 = at(0.75);
    return p75 + p25 > 0 ? (p75 - p25) / (p75 + p25) : 0;
  }

  function computeStats(rects: TreemapRect[], ms: number, totalLeaves: number, size: number, realizedGapPx: number): Stats {
    // Every rect here has already been filtered to a positive rectangle by the
    // flatten functions, so one pass defines the base all rows share: `nodes` is
    // the number of drawn rectangles (folders and files) and `leaves` the drawn
    // leaves — the same two measurements in both panels.
    const drawn = rects.filter((r) => r.width > 0 && r.height > 0);
    const leaves = drawn.filter((r) => r.isLeaf);
    const aspects = drawn.map((r) => Math.max(r.width / r.height, r.height / r.width));
    const trimmedAspect = trimmedMeanAspect(aspects);

    const ratios = drawn.filter((r) => r.value > 0).map((r) => (r.width * r.height) / r.value);
    const valueProp = quartileCoefficientOfDispersion(ratios);

    const leafArea = leaves.reduce((s, r) => s + r.width * r.height, 0);
    const spaceUtil = size > 0 ? leafArea / (size * size) : 0;

    return {
      nodes: drawn.length,
      leaves: leaves.length,
      missing: totalLeaves - leaves.length,
      trimmedAspect,
      valueProp,
      spaceUtil,
      realizedGapPx,
      ms,
    };
  }

  /**
   * Default gap for a map, derived from the map itself: a tenth of the typical
   * (median) leaf edge, in percent of the map width.
   *
   * The median describes the leaf a reader actually sees — a mean is pulled up by
   * the few huge files and by leaves that carry no value at all. At a tenth, a
   * leaf of that size keeps ~80 % of its edge (≈ 64 % of its area), so the gap
   * never becomes the thing one looks at. On the large bundled maps the rule
   * lands on the slider's smallest step: that is the honest answer for 114k
   * leaves on a 400 px canvas, where a leaf is about a pixel wide.
   */
  function defaultMarginPercent(tree: TreeNode, metric: string): number {
    const values: number[] = [];
    let total = 0;
    const visit = (node: TreeNode): void => {
      if (!node.children || node.children.length === 0) {
        const value = node.attributes?.[metric] ?? 0;
        if (value > 0) {
          values.push(value);
          total += value;
        }
        return;
      }
      for (const child of node.children) visit(child);
    };
    visit(tree);
    if (values.length === 0 || total <= 0) return MARGIN_MIN_PERCENT;

    values.sort((a, b) => a - b);
    const median = values[Math.floor(values.length / 2)];
    // edge = size * sqrt(median / total), and a tenth of it as a share of size.
    const percent = 10 * Math.sqrt(median / total);
    const stepped = Math.floor(percent / MARGIN_STEP_PERCENT) * MARGIN_STEP_PERCENT;
    return Math.min(MARGIN_MAX_PERCENT, Math.max(MARGIN_MIN_PERCENT, Number(stepped.toFixed(1))));
  }

  /** Load a map together with the gap that map's geometry asks for. */
  function setLoadedData(data: TreeNode, metric: string): void {
    loadedData = data;
    areaMetric = metric;
    marginPercent = defaultMarginPercent(data, metric);
  }

  function countLeaves(tree: TreeNode): number {
    if (!tree.children || tree.children.length === 0) return 1;
    return tree.children.reduce((sum, c) => sum + countLeaves(c), 0);
  }

  interface NestedD3Options {
    metric: string;
    size: number;
    gapPx: number;
    innerGapPx: number;
    innerLeavesOnly: boolean;
    labelPx: number;
    labelEnabled: boolean;
    topLevels: number;
    sorting: AreaTrueSortingOption;
    collapseFolders: boolean;
  }

  function computeNestedD3(tree: TreeNode, opts: NestedD3Options): TreemapRect[] {
    const data = opts.collapseFolders ? collapseFolderChains(tree) : tree;

    const root = d3Hierarchy(data).sum((d) => (!d.children || d.children.length === 0 ? (d.attributes?.[opts.metric] ?? 0) : 0));

    if (opts.sorting !== AreaTrueSortingOption.NONE) {
      // MIDDLE behaves like DESCENDING (same as the improved squarify comparator).
      const dir = opts.sorting === AreaTrueSortingOption.ASCENDING ? 1 : -1;
      root.sort((a, b) => dir * ((a.value ?? 0) - (b.value ?? 0)));
    }

    const layout = d3Treemap<TreeNode>()
      .size([opts.size, opts.size])
      .round(false)
      .paddingOuter(opts.gapPx);
    if (opts.innerGapPx > 0) {
      // d3 only knows a uniform inner gap per parent. "Leaves only" is
      // approximated by gapping the children of parents whose children are all
      // leaves (mixed folder/file parents stay without inner gap).
      layout.paddingInner((n) => {
        if (opts.innerLeavesOnly) {
          const allLeaves = !!n.children && n.children.length > 0 && n.children.every((c) => !c.children || c.children.length === 0);
          return allLeaves ? opts.innerGapPx : 0;
        }
        return opts.innerGapPx;
      });
    }

    // Mirror the area-true layout's `hasLabel = labelsEnabled && depth <
    // amountOfTopLabels` (the root at depth 0 is included): the floor-label
    // strip *replaces* the top margin for labeled folders. For every other
    // folder the normal top margin must stay — d3's paddingOuter sets
    // top/right/bottom/left to gapPx, so a blanket paddingTop(0) would erase
    // the top margin exactly where no label is drawn.
    const isLabeled = (n: HierarchyRectangularNode<TreeNode>): boolean =>
      opts.labelEnabled && n.depth < opts.topLevels && !!n.children && n.children.length > 0;
    layout.paddingTop((n) => (isLabeled(n) ? opts.labelPx : opts.gapPx));

    const laidOut = layout(root);
    return flattenD3(laidOut, isLabeled);
  }

  /**
   * Merge single-child folder chains into one node (like `collapseFolders`).
   */
  function collapseFolderChains(node: TreeNode): TreeNode {
    const collapse = (n: TreeNode): TreeNode => {
      const { children } = n;
      if (children && children.length === 1) {
        const only = children[0];
        if (only.children && only.children.length > 0) {
          return collapse({ ...only, name: `${n.name}/${only.name}` });
        }
      }
      return { ...n, children: children ? children.map(collapse) : undefined };
    };
    return collapse(node);
  }

  function flattenD3(root: HierarchyRectangularNode<TreeNode>, hasLabel: (n: HierarchyRectangularNode<TreeNode>) => boolean): TreemapRect[] {
    const rects: TreemapRect[] = [];
    const walk = (n: HierarchyRectangularNode<TreeNode>): void => {
      if (n.x1 - n.x0 > 0 && n.y1 - n.y0 > 0) {
        const isLeaf = !n.children || n.children.length === 0;
        rects.push({
          x: n.x0,
          y: n.y0,
          width: n.x1 - n.x0,
          height: n.y1 - n.y0,
          name: n.data.name,
          depth: n.depth,
          isLeaf,
          hasLabel: hasLabel(n),
          value: n.value ?? 0,
          attributes: n.data.attributes,
        });
      }
      if (n.children) for (const c of n.children) walk(c);
    };
    walk(root);
    return rects;
  }

  /**
   * Flatten the wrapped hierarchy of the area-true layout into render rects.
   *
   * Only nodes with a positive rectangle are emitted, exactly like flattenD3.
   * The wrapped tree keeps every node of the input — including subtrees the
   * layout dropped (value 0) and nodes it squeezed to zero area, whose x0/y0/x1/y1
   * stay at 0. They are never drawn, so counting them as "nodes" would report a
   * number that no map shows (on netbeans: 58607 instead of the 23407 rectangles
   * actually on the canvas). Dropping them here is what makes the Knoten row
   * count the same thing in both panels.
   */
  function flattenWrapped(root: HierarchyNode<TreeNode>, labelTopLevels: number): TreemapRect[] {
    const rects: TreemapRect[] = [];
    const walk = (n: HierarchyNode<TreeNode>): void => {
      const width = (n.x1 ?? 0) - (n.x0 ?? 0);
      const height = (n.y1 ?? 0) - (n.y0 ?? 0);
      if (width > 0 && height > 0) {
        rects.push({
          x: n.x0 ?? 0,
          y: n.y0 ?? 0,
          width,
          height,
          name: n.data.name,
          depth: n.depth,
          isLeaf: !n.children || n.children.length === 0,
          hasLabel: labelTopLevels > 0 && !!n.children && n.children.length > 0 && n.depth < labelTopLevels,
          value: n.value ?? 0,
          attributes: n.data.attributes,
        });
      }
      // Recursion is independent of the push: a node without area can still be
      // dropped in one panel and drawn in the other, and the walk must reach
      // every node either way.
      if (n.children) for (const c of n.children) walk(c);
    };
    walk(root);
    return rects;
  }

  /** Realized outer gap of the area-true layout (root edge to its children). */
  function outerInsetPx(rects: TreemapRect[], rootLabeled: boolean): number {
    // By depth, not by position: the flatten functions drop rects without area,
    // so the first entry is only guaranteed to be the root while the root has
    // one — and a wrong "root" here would silently report a wrong gap.
    const root = rects.find((r) => r.depth === 0);
    const d1 = rects.filter((r) => r.depth === 1);
    if (!root || d1.length === 0) return 0;
    const candidates = [
      Math.min(...d1.map((r) => r.x)) - root.x,
      root.x + root.width - Math.max(...d1.map((r) => r.x + r.width)),
      root.y + root.height - Math.max(...d1.map((r) => r.y + r.height)),
    ];
    if (!rootLabeled) candidates.push(Math.min(...d1.map((r) => r.y)) - root.y);
    const positive = candidates.filter((v) => v > 1e-6);
    return positive.length ? Math.min(...positive) : 0;
  }

  /** Thickness of the root label strip (its children start below it). */
  function rootLabelStripPx(rects: TreemapRect[], rootLabeled: boolean): number {
    const root = rects.find((r) => r.depth === 0);
    const d1 = rects.filter((r) => r.depth === 1);
    if (!root || !rootLabeled || d1.length === 0) return 0;
    return Math.max(0, Math.min(...d1.map((r) => r.y)) - root.y);
  }

  /**
   * Milliseconds without decimals that carry nothing: a layout that takes a whole
   * number of milliseconds reads as "40 ms", not "40.00 ms". Values below a
   * millisecond keep their two decimals ("0.02 ms") — that is where the
   * measurement's sub-millisecond precision is the whole point.
   */
  function fmtMs(ms: number): string {
    const rounded = Number(ms.toFixed(2));
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  }

  function fmt(v: number, digits = 2): string {
    return v.toFixed(digits);
  }

  type BetterDir = 'lower' | 'higher' | 'none';

  // The metrics with a better/worse answer come first because they are the ones
  // that carry a ✓/✗ mark; the purely informational rows follow behind a
  // divider. `divider` marks the row that opens that second group.
  interface MetricRow {
    labelKey: string;
    hintKey: string;
    value: (s: Stats) => number;
    format: (s: Stats) => string;
    better: BetterDir;
    divider?: boolean;
  }

  const metricRows: MetricRow[] = [
    { labelKey: 'mValueProp', hintKey: 'hValueProp', value: (s) => s.valueProp, format: (s) => fmt(s.valueProp), better: 'lower' },
    { labelKey: 'mMissing', hintKey: 'hMissing', value: (s) => s.missing, format: (s) => String(s.missing), better: 'lower' },
    { labelKey: 'mAspect', hintKey: 'hAspect', value: (s) => s.trimmedAspect, format: (s) => fmt(s.trimmedAspect), better: 'lower' },
    { labelKey: 'mTime', hintKey: 'hTime', value: (s) => s.ms, format: (s) => fmtMs(s.ms) + ' ms', better: 'lower' },
    { labelKey: 'mSpace', hintKey: 'hSpace', value: (s) => s.spaceUtil, format: (s) => (s.spaceUtil * 100).toFixed(1) + ' %', better: 'none', divider: true },
    { labelKey: 'mGap', hintKey: 'hGap', value: (s) => s.realizedGapPx, format: (s) => fmt(s.realizedGapPx) + ' px', better: 'none' },
    { labelKey: 'mNodes', hintKey: 'hNodes', value: (s) => s.nodes, format: (s) => String(s.nodes), better: 'none' },
    { labelKey: 'mLeaves', hintKey: 'hLeaves', value: (s) => s.leaves, format: (s) => String(s.leaves), better: 'none' },
  ];

  /** Index of the winning panel in `stats`, or -1 when nobody wins. */
  function betterIndex(m: MetricRow, stats: Stats[]): number {
    if (m.better === 'none' || stats.length < 2) return -1;
    // Decided on the values as the table prints them, not on the raw floats:
    // two values that render identically (0.016 and 0.024 ms are both
    // "0.02 ms") are a tie. Otherwise a row could show a green and a red cell
    // carrying the same number.
    if (m.format(stats[0]) === m.format(stats[1])) return -1;
    const a = m.value(stats[0]);
    const b = m.value(stats[1]);
    if (m.better === 'lower') return a < b ? 0 : 1;
    return a > b ? 0 : 1;
  }

  // `tone` colours the list items of the why-block: what the area-true layout
  // does better reads green, what d3 loses to its own padding reads red.
  $: whyAtItems = [
    { text: t.whyAta, tone: 'neutral' },
    { text: t.whyAtb, tone: 'good' },
    { text: t.whyAtc, tone: 'good' },
  ];
  $: whyD3Items = [
    { text: t.whyD3a, tone: 'neutral' },
    { text: t.whyD3b, tone: 'bad' },
    { text: t.whyD3c, tone: 'bad' },
  ];

  /** Parses a JSON string and adapts cc.json maps to the demo's
   *  tree format, so both plain trees and raw cc.json files can be opened. */
  function dataFromJson(text: string): { data: TreeNode; metric?: string } {
    const parsed: unknown = JSON.parse(text);
    if (isCcJson(parsed)) {
      const data = ccJsonToTree(parsed);
      return { data, metric: suggestAreaMetric(data) };
    }
    return { data: parsed as TreeNode };
  }

  function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const { data, metric } = dataFromJson(event.target?.result as string);
        setLoadedData(data, metric ?? areaMetric);
      } catch {
        alert(lang === 'de' ? 'Ungültige JSON-Datei' : 'Invalid JSON file');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  async function loadExample(e: Event) {
    const id = (e.currentTarget as HTMLSelectElement).value;
    const example = examples[id];
    if (!example) return;
    exampleId = id;

    if (example.data) {
      setLoadedData(example.data, example.metric);
      return;
    }
    if (!example.url) return;

    const cached = exampleCache.get(example.url);
    if (cached) {
      setLoadedData(cached, example.metric);
      return;
    }

    loadingExample = true;
    try {
      const response = await fetch(example.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // A dropped cc.json also works: the JSON itself decides the format.
      const { data, metric } = dataFromJson(await response.text());
      exampleCache.set(example.url, data);
      setLoadedData(data, metric ?? example.metric);
    } catch {
      alert(lang === 'de' ? `cc.json konnte nicht geladen werden: ${example.url}` : `Could not load cc.json: ${example.url}`);
    } finally {
      loadingExample = false;
    }
  }
</script>

<main>
  <header>
    <div class="heading">
      <h1>{t.title}</h1>
      <p class="subtitle">
        {t.subtitle} ·
        <a href="https://github.com/BenediktMehl/master-thesis" target="_blank" rel="noopener">{t.thesis} ↗</a>
      </p>
      <p class="claim">{@html t.claim}</p>
      <div class="lang">
        <button class:active={lang === 'de'} on:click={() => (lang = 'de')}>DE</button>
        <button class:active={lang === 'en'} on:click={() => (lang = 'en')}>EN</button>
      </div>
    </div>

    <div class="controls data-bar">
      <div class="c" title={help('dataset')}>
        <span class="lbl">{t.dataPreset}</span>
        <select value={exampleId} on:change={loadExample} disabled={loadingExample}>
          {#each exampleOrder as ex (ex.id)}
            <option value={ex.id}>{t[ex.labelKey]}</option>
          {/each}
        </select>
      </div>

      <div class="c" title={help('dataset')}>
        <span class="lbl">&nbsp;</span>
        <label class="file">
          📁 {t.load}
          <input type="file" accept=".json,application/json,.cc.json" on:change={handleFileUpload} hidden />
        </label>
      </div>

      {#if loadingExample}
        <div class="c">
          <span class="lbl">&nbsp;</span>
          <span class="loading">{t.loading}</span>
        </div>
      {/if}
    </div>
  </header>

  <section class="metrics">
    <table>
      <thead>
        <tr>
          <th>{t.metricCol}</th>
          {#each results as r, i (r.key)}
            <th class:win-col={i === 0}>
              {r.title}
              <span class="th-sub">{r.role}</span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each metricRows as m (m.labelKey)}
          {#if m.divider}
            <tr class="divider">
              <td colspan={results.length + 1}>{t.infoRows}</td>
            </tr>
          {/if}
          {@const bi = betterIndex(m, results.map((r) => r.stats))}
          <tr>
            <td class="metric-label" title={t[m.hintKey]}>{t[m.labelKey]} <span class="info">ⓘ</span></td>
            {#each results as r, i (r.key)}
              <td class:better={bi === i} class:worse={bi !== -1 && bi !== i}>
                {#if bi !== -1}<span class="mark" aria-hidden="true">{bi === i ? '✓' : '✗'}</span>{/if}{m.format(r.stats)}
              </td>
            {/each}
          </tr>
          {#if m.labelKey === 'mSpace' && spaceNote}
            <!-- Directly under the row it explains: the margin no longer fits the
                 map, so this row's "are both values similar" question is answered
                 with "both are almost zero". -->
            <tr class="space-note"><td colspan={results.length + 1}>{spaceNote}</td></tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </section>

  <section class="panels">
    {#each results as r, i (r.key)}
      <div class="panel" class:ours={i === 0}>
        <div class="panel-head">
          <h2>{r.title}</h2>
          <span class="sub">{r.role} · <a href={r.repoUrl} target="_blank" rel="noopener">{r.subtitle} ↗</a></span>
        </div>
        {#if r.rects.length > 0}
          <TreemapSvg rects={r.rects} {containerSize} showValues />
        {:else}
          <div class="empty">{t.empty}</div>
        {/if}
      </div>
    {/each}
  </section>

  <!-- Collapsed by default: the page leads with the result, the knobs are for
       whoever wants to check it or explore their own data. -->
  <details class="settings">
    <summary>{t.settings}</summary>
    <p class="settings-note">{t.settingsNote}</p>

    <div class="group">
      <h3 class="group-label">{t.groupLayout}</h3>
      <div class="controls">
        <label class="c" title={help('margin')}>
          <span class="lbl">{t.margin}</span>
          <span class="field">
            <input
              type="range"
              min="0"
              max={MARGIN_MAX_PERCENT}
              step={MARGIN_STEP_PERCENT}
              bind:value={marginPercent}
            />
            <output>{marginPercent.toFixed(1)}%</output>
          </span>
        </label>

        <label class="c" title={help('siblingMargin')}>
          <span class="lbl">{t.siblingMargin}</span>
          <select bind:value={siblingMode}>
            <option value="none">{t.siblingNone}</option>
            <option value="all">{t.siblingAll}</option>
            <option value="leaves">{t.siblingLeaves}</option>
          </select>
        </label>

        <div class="c" title={help('floorLabels')}>
          <span class="lbl">&nbsp;</span>
          <button class="toggle {enableFloorLabels ? 'on' : ''}" on:click={() => (enableFloorLabels = !enableFloorLabels)}>
            {enableFloorLabels ? '✓' : '✗'} {t.floorLabels}
          </button>
        </div>

        <label class="c" title={help('amountOfTopLabels')}>
          <span class="lbl">{t.amountOfTopLabels}</span>
          <input type="number" min="-1" step="1" bind:value={amountOfTopLabels} />
        </label>

        <label class="c" title={help('labelLength')}>
          <span class="lbl">{t.labelLength}</span>
          <span class="field">
            <input type="range" min="0" max="20" step="0.5" bind:value={labelPercent} />
            <output>{labelPercent.toFixed(1)}%</output>
          </span>
        </label>

        <div class="c" title={help('variableLabel')}>
          <span class="lbl">&nbsp;</span>
          <button class="toggle {variableLabelSize ? 'on' : ''}" on:click={() => (variableLabelSize = !variableLabelSize)}>
            {variableLabelSize ? '✓' : '✗'} {t.variableLabel}
          </button>
        </div>

        <div class="c" title={help('collapse')}>
          <span class="lbl">&nbsp;</span>
          <button class="toggle {collapseFolders ? 'on' : ''}" on:click={() => (collapseFolders = !collapseFolders)}>
            {collapseFolders ? '✓' : '✗'} {t.collapse}
          </button>
        </div>

        <label class="c" title={help('sort')}>
          <span class="lbl">{t.sort}</span>
          <select bind:value={sorting}>
            {#each sortingOptions as s (s)}
              <option value={s}>
                {s === AreaTrueSortingOption.NONE ? t.sortNone : s === AreaTrueSortingOption.ASCENDING ? t.sortAsc : s === AreaTrueSortingOption.DESCENDING ? t.sortDesc : t.sortMiddle}
              </option>
            {/each}
          </select>
        </label>
      </div>
    </div>

    <div class="group">
      <h3 class="group-label">{t.groupArea}</h3>
      <div class="controls">
        <label class="c" title={help('passes')}>
          <span class="lbl">{t.passes}</span>
          <input type="number" min="1" step="1" bind:value={numberOfPasses} />
        </label>

        <div class="c" title={help('scale')}>
          <span class="lbl">&nbsp;</span>
          <button class="toggle {useScale ? 'on' : ''}" on:click={() => (useScale = !useScale)}>
            {useScale ? '✓' : '✗'} {t.scale}
          </button>
        </div>

        <div class="c" title={help('simpleIncrease')}>
          <span class="lbl">&nbsp;</span>
          <button class="toggle {simpleIncreaseValues ? 'on' : ''}" on:click={() => (simpleIncreaseValues = !simpleIncreaseValues)}>
            {simpleIncreaseValues ? '✓' : '✗'} {t.simpleIncrease}
          </button>
        </div>

        <label class="c" title={help('order')}>
          <span class="lbl">{t.order}</span>
          <select bind:value={orderOption}>
            {#each orderOptions as o (o)}
              <option value={o}>{o === OrderOption.NEW_ORDER ? t.orderNew : o === OrderOption.KEEP_ORDER ? t.orderKeep : t.orderPlace}</option>
            {/each}
          </select>
        </label>

        <div class="c" title={help('incrementMargin')}>
          <span class="lbl">&nbsp;</span>
          <button class="toggle {incrementMargin ? 'on' : ''}" on:click={() => (incrementMargin = !incrementMargin)}>
            {incrementMargin ? '✓' : '✗'} {t.incrementMargin}
          </button>
        </div>
      </div>
    </div>

    <div class="group">
      <h3 class="group-label">{t.groupData}</h3>
      <div class="controls">
        <label class="c" title={help('metric')}>
          <span class="lbl">{t.metric}</span>
          <input type="text" bind:value={areaMetric} />
        </label>
      </div>
    </div>
  </details>

  <section class="why">
    <h2>{t.whyTitle}</h2>
    <p class="why-lead">{t.whyLead}</p>

    <div class="why-grid">
      <div class="why-col at">
        <h3>{t.whyAtHead} <span class="chip win">{t.areaTrueRole}</span></h3>
        <ul>
          {#each whyAtItems as item (item.text)}
            <li class={item.tone}>{item.text}</li>
          {/each}
        </ul>
      </div>
      <div class="why-col d3">
        <h3>{t.whyD3Head} <span class="chip lose">{t.nestedRole}</span></h3>
        <ul>
          {#each whyD3Items as item (item.text)}
            <li class={item.tone}>{item.text}</li>
          {/each}
        </ul>
      </div>
    </div>

    <p class="why-live">{t.whyLive}</p>

    <details class="why-more">
      <summary>{t.whyMore}</summary>
      <p>{t.whyHow}</p>
      <p>{t.whyCost}</p>
      <p class="why-links">
        <a href="https://github.com/BenediktMehl/area-true-treemap" target="_blank" rel="noopener">{t.whyRepo} ↗</a>
        ·
        <a
          href="https://github.com/BenediktMehl/area-true-treemap/blob/main/docs/porting-from-d3-hierarchy.md"
          target="_blank"
          rel="noopener">{t.whyDocs} ↗</a
        >
      </p>
    </details>
  </section>
</main>

<style>
  main {
    max-width: 1240px;
    margin: 0 auto;
    padding: 28px 24px 60px;
  }

  header {
    border-bottom: 1px solid var(--border);
    padding-bottom: 18px;
    margin-bottom: 22px;
  }

  .heading {
    position: relative;
  }

  .heading h1 {
    margin: 0 0 4px;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .subtitle {
    margin: 0 0 10px;
    color: var(--muted);
    font-size: 14px;
  }

  /* The one-sentence pitch under the title: the reason the page exists. */
  .claim {
    margin: 0 0 16px;
    font-size: 15px;
    line-height: 1.5;
    max-width: 80ch;
    padding-left: 12px;
    border-left: 3px solid var(--accent);
  }

  .claim :global(strong) {
    font-weight: 700;
  }

  .claim :global(strong.ours) {
    color: #b45309;
  }

  .lang {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    gap: 4px;
  }

  .lang button {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
  }

  .lang button.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 18px;
    align-items: flex-end;
  }

  .data-bar {
    margin-top: 4px;
  }

  /* Chips tag the two layouts in the why-block: green for what the area-true
     layout does better, red for what d3 loses to its own padding. */
  .chip {
    display: inline-block;
    font-size: 12px;
    line-height: 1.6;
    padding: 1px 9px;
    border: 1px solid var(--border);
    border-radius: 999px;
    white-space: nowrap;
  }

  .chip.win {
    color: #146c33;
    background: #eaf7ef;
    border-color: #bfe4cb;
  }

  .chip.lose {
    color: #a51d1d;
    background: #fdecec;
    border-color: #f3c6c6;
  }

  .c {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .lbl {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }

  .c input[type='number'],
  .c input[type='text'] {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    padding: 5px 7px;
    font-size: 12px;
    width: 72px;
  }

  .field {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .c input[type='range'] {
    width: 120px;
  }

  .c output {
    font-size: 12px;
    color: var(--text);
    min-width: 38px;
  }

  .c input[type='text'] {
    width: 80px;
  }

  .c select {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    padding: 5px 7px;
    font-size: 12px;
    min-width: 110px;
  }

  .toggle,
  .file {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    padding: 5px 9px;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }

  .toggle.on {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .loading {
    color: var(--muted);
    font-size: 12px;
    padding: 5px 0;
    white-space: nowrap;
  }

  .file:hover {
    border-color: #bbb;
  }

  .why {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 16px 18px;
    margin-bottom: 22px;
  }

  .why h2 {
    margin: 0 0 6px;
    font-size: 17px;
  }

  .why-lead {
    margin: 0 0 14px;
    color: var(--muted);
    font-size: 13px;
    max-width: 95ch;
  }

  .why-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }

  .why-col {
    background: #fafafa;
    border: 1px solid var(--border);
    border-left: 3px solid #c9c9c9;
    border-radius: 4px;
    padding: 10px 12px;
  }

  .why-col.at {
    border-left-color: #16a34a;
  }

  .why-col.d3 {
    border-left-color: #dc2626;
  }

  .why-col li.good {
    color: #146c33;
  }

  .why-col li.good::marker {
    color: #16a34a;
  }

  .why-col li.bad {
    color: #a51d1d;
  }

  .why-col li.bad::marker {
    color: #dc2626;
  }

  .why-col h3 {
    margin: 0 0 6px;
    font-size: 13px;
  }

  .why-col ul {
    margin: 0;
    padding-left: 18px;
    font-size: 12.5px;
    line-height: 1.45;
  }

  .why-col li + li {
    margin-top: 4px;
  }

  .why-live {
    margin: 14px 0 0;
    font-size: 12.5px;
    line-height: 1.45;
  }

  .why-more {
    margin-top: 12px;
    font-size: 12.5px;
    line-height: 1.45;
  }

  .why-more summary {
    cursor: pointer;
    color: var(--accent);
    font-weight: 600;
  }

  .why-more p {
    margin: 8px 0 0;
    max-width: 95ch;
  }

  .why-links a {
    font-weight: 600;
  }

  .metrics {
    margin-bottom: 22px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    background: var(--panel);
    border: 1px solid var(--border);
  }

  th,
  td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
  }

  th {
    background: #f4f4f4;
    font-weight: 600;
    color: var(--text);
  }

  td:first-child {
    color: var(--muted);
  }

  .metric-label {
    cursor: help;
    border-bottom: 1px dotted #c0c0c0;
  }

  .metric-label:hover {
    color: var(--text);
  }

  .info {
    font-size: 11px;
    opacity: 0.6;
  }

  th .th-sub {
    display: block;
    font-weight: 400;
    font-size: 11px;
    color: var(--muted);
    margin-top: 2px;
  }

  th.win-col {
    background: #eaf7ef;
  }

  /* Winner green, loser red — both carry a mark, so the colour is never the
     only signal. */
  .better {
    color: #146c33;
    background: #eaf7ef;
    font-weight: 700;
  }

  .worse {
    color: #a51d1d;
    background: #fdecec;
  }

  .mark {
    font-size: 11px;
    margin-right: 5px;
  }

  /* Advisory under the Platznutzung row. Amber rather than green/red: it says
     that the numbers in this row say little, not that one of them is worse. */
  tr.space-note td {
    background: #fff8ec;
    border-left: 3px solid var(--accent);
    color: #7a4a06;
    font-size: 12px;
    line-height: 1.45;
    padding: 8px 12px;
  }

  tr.divider td {
    background: #f4f4f4;
    color: var(--muted);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 5px 12px;
  }

  .settings {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px 16px;
    /* sits between the maps and the why-block */
    margin: 22px 0;
  }

  .settings > summary {
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
  }

  .settings[open] > summary {
    margin-bottom: 8px;
  }

  .settings-note {
    margin: 0 0 14px;
    color: var(--muted);
    font-size: 12px;
    max-width: 95ch;
  }

  .group + .group {
    margin-top: 14px;
    border-top: 1px solid var(--border);
    padding-top: 12px;
  }

  .group-label {
    margin: 0 0 8px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }

  a {
    color: var(--accent);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .panels {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
  }

  @media (max-width: 900px) {
    .panels,
    .why-grid {
      grid-template-columns: 1fr;
    }
  }

  .panel {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px;
  }

  .panel.ours {
    border-left: 3px solid var(--accent);
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
  }

  .panel h2 {
    font-size: 15px;
    margin: 0;
  }

  .sub {
    color: var(--muted);
    font-size: 11px;
  }

  .empty {
    color: var(--muted);
    padding: 50px 0;
    text-align: center;
  }
</style>
