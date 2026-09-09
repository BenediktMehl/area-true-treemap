<script lang="ts">
  import { hierarchy, treemap, type HierarchyRectangularNode } from 'd3-hierarchy';
  import TreemapSvg from '$lib/components/TreemapSvg.svelte';
  import {
    ImprovedTreemapLayout,
    ImprovedSortingOption,
    OrderOption,
    getFloorLabelPadding,
    DEFAULT_FLOOR_LABEL_CONFIG,
    MARGIN_DIVISOR,
    type ImprovedLabelSizeResolver,
    type TreeNode,
    type TreemapRect,
  } from 'area-true-treemap';
  import sample from '$lib/data/sample.json';
  import flare from '$lib/data/flare.json';

  type Lang = 'de' | 'en';
  let lang: Lang = 'de';

  const translations: Record<Lang, Record<string, string>> = {
    de: {
      title: 'Treemap Vergleich',
      subtitle: 'Improved Squarify vs. Nested Treemap',
      thesis: 'zur Masterthesis',
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
      collapse: 'Ordnerketten',
      sort: 'Sortierung',
      metric: 'Metrik',
      load: 'JSON',
      sample: 'Beispiel',
      dataPreset: 'Beispieldaten',
      presetFlare: 'flare (d3, aus der Masterarbeit)',
      presetSample: 'kleines Beispiel (synthetisch)',
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
      mMeanAspect: 'Ø Seitenverhältnis',
      mMaxAspect: 'Max Seitenverhältnis',
      mValueProp: 'Wertproportionalität',
      mSpace: 'Platznutzung',
      mTime: 'Berechnungszeit',
      hNodes: 'Anzahl aller dargestellten Rechtecke (Ordner und Dateien). Rein informativ — kein „besserer" Wert.',
      hLeaves: 'Anzahl der Blattknoten (Dateien) im Layout. Rein informativ — kein „besserer" Wert.',
      hMissing:
        'Knotensichtbarkeit (These): Anzahl Blattknoten, deren Breite oder Höhe ≤ 0 ist und die dadurch komplett verschwinden. Bester Wert: 0 (keine fehlenden Knoten).',
      hMeanAspect:
        'Seitenverhältnis (These): Durchschnittliches Verhältnis der längeren zur kürzeren Seite über alle Knoten. Bester Wert: 1 (Quadrat).',
      hMaxAspect: 'Schlechtestes (größtes) Seitenverhältnis über alle Knoten. Bester Wert: 1 (Quadrat).',
      hValueProp:
        'Wertproportionalität (These): Varianzkoeffizient des Fläche/Metrik-Verhältnisses über alle Knoten. Bester Wert: 0 (perfekt proportional).',
      hSpace:
        'Platznutzung (Vergleichbarkeit): Anteil der Wurzelfläche, der von Blattknoten eingenommen wird. Es gibt kein Besser/Schlechter – wichtig ist nur, dass beide Werte ähnlich sind, damit die beiden Outputs überhaupt verglichen werden können.',
      hTime: 'Zeitaufwand (These): Reine Berechnungszeit des Layout-Algorithmus in ms (ohne Rendering). Bester Wert: möglichst niedrig.',
      areaTrue: 'Improved Squarify',
      areaTrueSub: 'CodeCharta improved algorithm',
      nested: 'Nested Treemap',
      nestedSub: 'd3.js nested treemap',
      empty: 'Keine Daten.',
    },
    en: {
      title: 'Treemap Comparison',
      subtitle: 'Improved Squarify vs. Nested Treemap',
      thesis: 'master thesis',
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
      collapse: 'Collapse folders',
      sort: 'Sort',
      metric: 'Metric',
      load: 'JSON',
      sample: 'Sample',
      dataPreset: 'Sample data',
      presetFlare: 'flare (d3, from master thesis)',
      presetSample: 'small sample (synthetic)',
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
      mMeanAspect: 'Mean aspect ratio',
      mMaxAspect: 'Max aspect ratio',
      mValueProp: 'Value proportionality',
      mSpace: 'Space utilization',
      mTime: 'Compute time',
      hNodes: 'Number of all rendered rectangles (folders and files). Informational only — no "better" value.',
      hLeaves: 'Number of leaf nodes (files) in the layout. Informational only — no "better" value.',
      hMissing:
        'Node visibility (thesis): number of leaf nodes whose width or height ≤ 0, so they disappear entirely. Best value: 0 (no missing nodes).',
      hMeanAspect:
        'Aspect ratio (thesis): average ratio of the longer to the shorter side across all nodes. Best value: 1 (square).',
      hMaxAspect: 'Worst (largest) aspect ratio across all nodes. Best value: 1 (square).',
      hValueProp:
        'Value proportionality (thesis): coefficient of variation of the area/metric ratio across all nodes. Best value: 0 (perfectly proportional).',
      hSpace:
        'Space utilization (comparability): fraction of the root area occupied by leaf nodes. There is no better or worse — what matters is only that both values are similar, so the two outputs can be compared at all.',
      hTime: 'Time (thesis): pure layout computation time in ms (without rendering). Best value: as low as possible.',
      areaTrue: 'Improved Squarify',
      areaTrueSub: 'CodeCharta improved algorithm',
      nested: 'Nested Treemap',
      nestedSub: 'd3.js nested treemap',
      empty: 'No data.',
    },
  };

  $: t = translations[lang];

  // Hover explanation per setting: what it does and whether it affects both
  // algorithms or only the improved one. Recommended values marked "Thesis"
  // come from the recommendation table in the improve-squarify chapter of the
  // master thesis (Fazit of the algorithm chapter).
  interface HelpText {
    de: string;
    en: string;
  }
  const helpTexts: Record<string, HelpText> = {
    margin: {
      de: 'Relativer Abstand zwischen benachbarten Knoten (in % der Seitenlänge der Wurzel; je Karte wird er so umgerechnet, dass beide denselben realisierten Abstand zeigen). Struktur ist ab ca. 0,5 % erkennbar, über ca. 3 % dominiert das Treemap-Problem. Thesis: manuelle Wahl 0,5–3 %. Wirkt auf: beide Algorithmen.',
      en: 'Relative gap between neighbouring nodes (as % of the root side length; converted per map so both realize the same gap). Structure is visible from ~0.5 %, above ~3 % the treemap problem dominates. Thesis: manual choice 0.5–3 %. Affects: both algorithms.',
    },
    floorLabels: {
      de: 'Reserviert für beschriftete Ordner der oberen N Ebenen einen Streifen für den Ordnernamen; der Streifen ersetzt dort den oberen Abstand. Thesis: Beschriftungen verbessern die Orientierung, kosten aber Blattfläche. Wirkt auf: beide Algorithmen.',
      en: 'Reserves a strip for the folder name on the top N levels of labeled folders; the strip replaces the top gap there. Thesis: labels improve orientation but cost leaf area. Affects: both algorithms.',
    },
    amountOfTopLabels: {
      de: 'N = Anzahl der oberen Ebenen, deren Ordner eine Beschriftung erhalten (Wurzel = Ebene 0 zählt mit; 0 = keine). Thesis: N = 2–5 praktikabel, der finale Vergleich nutzt N = 3. Wirkt auf: beide Algorithmen.',
      en: 'N = number of top levels whose folders get a label (root = level 0 counts; 0 = none). Thesis: N = 2–5 practical, the final comparison uses N = 3. Affects: both algorithms.',
    },
    labelLength: {
      de: 'L = relative Länge des für die Beschriftung reservierten Streifens (% der Seitenlänge der Wurzel). Größeres L → größere Schrift, aber weniger Blattfläche und mehr potenziell fehlende Knoten. Thesis: L = 3–10 %, finaler Vergleich ≈ 4 %. Wirkt auf: beide Algorithmen.',
      en: 'L = relative length of the reserved label strip (% of the root side length). Larger L → larger text, but less leaf area and more potentially missing nodes. Thesis: L = 3–10 %, final comparison ≈ 4 %. Affects: both algorithms.',
    },
    variableLabel: {
      de: 'Berechnet die Beschriftungshöhe je Ordner aus dessen eigener Breite (an CodeCharta angelehnt) statt mit fester Länge L. Wirkt auf: nur den Improved-Algorithmus (die Nested-Karte übernimmt nur den an der Wurzel gemessenen Wert als Näherung).',
      en: 'Computes the label height per folder from its own width (CodeCharta-style) instead of a fixed length L. Affects: only the improved algorithm (the nested map only mirrors the root-measured value as an approximation).',
    },
    passes: {
      de: 'Anzahl der Layout-Durchläufe. 1 = nur Standard-Squarify, Margin/Beschriftungen bleiben wirkungslos. 2 = Größenanpassung + zweiter Layoutschritt (empfohlen). Mehrfache Berechnung (>2) wird in der Thesis nicht empfohlen. Wirkt auf: nur den Improved-Algorithmus.',
      en: 'Number of layout passes. 1 = plain squarify, margin/labels have no effect. 2 = size adjustment + second layout step (recommended). Multiple computation (>2) is not recommended in the thesis. Affects: only the improved algorithm.',
    },
    scale: {
      de: 'Skaliert im zweiten Layoutschritt die Kindknoten auf die tatsächlich verfügbare Elternfläche (CodeCharta „Apply Scaling"). Verhindert, dass Knoten die Elternfläche überragen (valide Layouts). Empfohlen: an. Wirkt auf: nur den Improved-Algorithmus.',
      en: 'In the second layout step, scales the children onto the actually available parent area (CodeCharta "Apply Scaling"). Prevents nodes from overflowing their parent (valid layouts). Recommended: on. Affects: only the improved algorithm.',
    },
    simpleIncrease: {
      de: 'Wahl der Größenanpassung zwischen den beiden Layoutschritten: an = absolute, aus = relative Größenanpassung. Die Thesis bevorzugt die relative (aus): weniger fehlende Knoten; die absolute ist bei der Wertproportionalität minimal besser. Empfohlen: aus. Wirkt auf: nur den Improved-Algorithmus.',
      en: 'Size adjustment between the two layout steps: on = absolute, off = relative. The thesis prefers relative (off): fewer missing nodes; absolute is marginally better in value proportionality. Recommended: off. Affects: only the improved algorithm.',
    },
    order: {
      de: 'Strategie des zweiten Layoutschritts (relevant bei 2+ Durchläufen): „Neu" = nach der Größenanpassung neu absteigend sortieren (Thesis: empfohlen); „Behalten" = Reihenfolge aus dem ersten Durchlauf; „Platz" = Platzierung/Reihen aus dem ersten Durchlauf beibehalten. Wirkt auf: nur den Improved-Algorithmus.',
      en: 'Second layout step strategy (relevant with 2+ passes): "New" = re-sort descending after the size adjustment (thesis: recommended); "Keep" = keep the first-pass order; "Place" = keep the first-pass placement/rows. Affects: only the improved algorithm.',
    },
    incrementMargin: {
      de: 'Steigert den Abstand schrittweise über mehrere Durchläufe (nur bei Durchläufen > 2 relevant, die die Thesis nicht empfiehlt). Wirkt auf: nur den Improved-Algorithmus.',
      en: 'Increases the gap gradually across multiple passes (only relevant for >2 passes, which the thesis does not recommend). Affects: only the improved algorithm.',
    },
    siblingMargin: {
      de: 'Zusätzlicher Abstand zwischen Geschwisterknoten: jeder Knoten wird um den halben Abstand verkleinert, sehr schmale Knoten verschwinden dabei. Thesis: keine Geschwisterabstände empfohlen, stattdessen Umrandungen. Wirkt auf: beide Algorithmen (Nested: innerer Abstand).',
      en: 'Extra gap between sibling nodes: each node shrinks by half the gap, very thin nodes disappear in the process. Thesis: no sibling gaps recommended, use outlines instead. Affects: both algorithms (nested: inner padding).',
    },
    collapse: {
      de: 'Faltet Ordnerketten (Ordner mit genau einem Ordner als Kind) zu einem Knoten zusammen. Thesis: verwenden – rund zehnmal weniger fehlende Knoten und bessere Platznutzung. Wirkt auf: beide Algorithmen.',
      en: 'Collapses folder chains (folders with exactly one folder child) into a single node. Thesis: use it — roughly ten times fewer missing nodes and better space utilization. Affects: both algorithms.',
    },
    sort: {
      de: 'Sortierung der Knoten nach Größe vor der Einfügung. Thesis: absteigend nach Größe ist optimal (bessere Seitenverhältnisse, weniger fehlende Knoten). „Mitte" wird in der Demo wie absteigend behandelt. Wirkt auf: beide Algorithmen.',
      en: 'Sorts nodes by size before insertion. Thesis: descending by size is optimal (better aspect ratios, fewer missing nodes). "Middle" is treated like descending in this demo. Affects: both algorithms.',
    },
    metric: {
      de: 'Name des Metrik-Attributs im Datensatz (z. B. size oder rloc), dessen Wert die Fläche der Knoten bestimmt. Wirkt auf: beide Algorithmen.',
      en: 'Name of the metric attribute in the dataset (e.g. size or rloc) whose value determines node area. Affects: both algorithms.',
    },
    dataset: {
      de: 'Wählt die Beispieldaten (flare aus der Thesis bzw. ein kleines synthetisches Beispiel) oder lädt eine eigene JSON-Datei. Kein Algorithmus-Parameter.',
      en: 'Selects the sample data (flare from the thesis or a small synthetic sample) or loads your own JSON file. Not an algorithm parameter.',
    },
  };

  function help(key: string): string {
    return helpTexts[key]?.[lang] ?? '';
  }

  // Bundled example datasets, selectable in the header.
  interface ExampleDef {
    data: TreeNode;
    metric: string;
    labelKey: string;
  }
  const examples: Record<string, ExampleDef> = {
    flare: { data: flare as unknown as TreeNode, metric: 'size', labelKey: 'presetFlare' },
    sample: { data: sample as TreeNode, metric: 'size', labelKey: 'presetSample' },
  };
  const exampleOrder: { id: string; labelKey: string }[] = [
    { id: 'flare', labelKey: 'presetFlare' },
    { id: 'sample', labelKey: 'presetSample' },
  ];

  let exampleId = 'flare';
  let loadedData: TreeNode = examples.flare.data;

  // Algorithm settings (CodeCharta improved squarify / "Improved Squarifying").
  // Defaults follow the recommendation table of the master thesis (Fazit of
  // the improve-squarify chapter): relative size adjustment, gap 0.5–3 %
  // (chosen 1 %), floor labels N = 3 / L = 3 % on the top levels (recommended
  // N 2–5, L 3–10 %), sorting descending, collapse folder chains, no sibling
  // margins, two passes only.
  let areaMetric = 'size';
  let marginPercent = 1;
  let enableFloorLabels = true;
  let amountOfTopLabels = 3;
  let labelPercent = 3;
  let variableLabelSize = false;
  let numberOfPasses = 2;
  let useScale = true;
  let simpleIncreaseValues = false;
  let orderOption: OrderOption = OrderOption.NEW_ORDER;
  let incrementMargin = false;
  let applySiblingMargin = false;
  let collapseFolders = true;
  let sorting: ImprovedSortingOption = ImprovedSortingOption.DESCENDING;

  const containerSize = 400;

  const sortingOptions: ImprovedSortingOption[] = [
    ImprovedSortingOption.NONE,
    ImprovedSortingOption.ASCENDING,
    ImprovedSortingOption.DESCENDING,
    ImprovedSortingOption.MIDDLE,
  ];
  const orderOptions: OrderOption[] = [OrderOption.NEW_ORDER, OrderOption.KEEP_ORDER, OrderOption.KEEP_PLACE];

  interface Stats {
    nodes: number;
    leaves: number;
    missing: number;
    meanAspect: number;
    maxAspect: number;
    valuePropCV: number;
    spaceUtil: number;
    ms: number;
  }

  interface Result {
    key: string;
    title: string;
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

  $: {
    const totalLeaves = countLeaves(loadedData);

    // --- 1) Improved Squarify (CodeCharta) ---
    // The CodeCharta margin/label inputs live in the algorithm's sqrt-space, so
    // we first probe the root size (no margin/label) and then derive raw inputs
    // that realize the chosen percentage of the canvas — independent of the
    // data set. The nested panel is fed the same *realized* gap/label later.
    const baseCfg = ImprovedTreemapLayout.builder()
      .areaMetric(areaMetric)
      .margin(0)
      .numberOfPasses(numberOfPasses)
      .scale(useScale)
      .simpleIncreaseValues(simpleIncreaseValues)
      .sorting(sorting)
      .order(orderOption)
      .incrementMargin(incrementMargin)
      .applySiblingMargin(applySiblingMargin)
      .collapseFolders(collapseFolders)
      .floorLabels(enableFloorLabels)
      .amountOfTopLabels(amountOfTopLabels)
      .build();
    const probeRects = new ImprovedTreemapLayout({ ...baseCfg, margin: 0, labelLength: 0 }).compute(loadedData);
    const baseRootW = probeRects[0]?.width || 1;

    const rawMargin = (marginPercent / 100) * MARGIN_DIVISOR * baseRootW;
    const rawLabel: number | ImprovedLabelSizeResolver = variableLabelSize
      ? (node) => getFloorLabelPadding(node.x1 - node.x0, node.depth, DEFAULT_FLOOR_LABEL_CONFIG)
      : (labelPercent / 100) * baseRootW;

    let improvedRects: TreemapRect[] = [];
    let improvedMs = 0;
    let realizedMarginPx = 0;
    let realizedLabelPx = 0;
    {
      const t0 = performance.now();
      const rawRects = new ImprovedTreemapLayout({ ...baseCfg, margin: rawMargin, labelLength: rawLabel }).compute(loadedData);
      improvedMs = performance.now() - t0;
      const root = rawRects[0];
      const scale = root && root.width > 0 ? containerSize / root.width : 1;
      improvedRects = rawRects.map((r) => ({
        ...r,
        x: (r.x - (root?.x ?? 0)) * scale,
        y: (r.y - (root?.y ?? 0)) * scale,
        width: r.width * scale,
        height: r.height * scale,
      }));
      // The layout stores each node's *own* metric, so folders without an own
      // value (e.g. flare) show 0. Aggregate bottom-up like the algorithm does
      // internally (own value ?? sum of children) so hover/center values match
      // the nested panel's hierarchy sums.
      improvedRects = aggregateImprovedValues(improvedRects, areaMetric);
      // Realized gap the improved algorithm produces (≈ marginPercent % of the canvas).
      realizedMarginPx = (rawMargin / MARGIN_DIVISOR) * scale;
      // Root label strip thickness (its children start below it).
      const d1 = rawRects.filter((r) => r.depth === 1 && r.width > 0 && r.height > 0);
      if (root?.hasLabel && d1.length > 0) {
        realizedLabelPx = (Math.min(...d1.map((r) => r.y)) - root.y) * scale;
      }
    }

    // --- 2) Nested treemap (d3) with the same realized margin/label ---
    let nestedRects: TreemapRect[] = [];
    const nestedMs = measureMs(() => {
      nestedRects = computeNestedD3(loadedData, {
        metric: areaMetric,
        size: containerSize,
        gapPx: realizedMarginPx,
        innerGapPx: applySiblingMargin ? realizedMarginPx : 0,
        labelPx: enableFloorLabels ? realizedLabelPx : 0,
        labelEnabled: enableFloorLabels,
        topLevels: amountOfTopLabels,
        sorting,
        collapseFolders,
      });
    });

    results = [
      { key: 'area-true', title: t.areaTrue, subtitle: t.areaTrueSub, repoUrl: 'https://github.com/MaibornWolff/codecharta', rects: improvedRects, stats: computeStats(improvedRects, improvedMs, totalLeaves, containerSize) },
      { key: 'nested', title: t.nested, subtitle: t.nestedSub, repoUrl: 'https://github.com/d3/d3-hierarchy', rects: nestedRects, stats: computeStats(nestedRects, nestedMs, totalLeaves, containerSize) },
    ];
  }

  function computeStats(rects: TreemapRect[], ms: number, totalLeaves: number, size: number): Stats {
    // Only positive-area leaves count: the improved algorithm keeps zero-area
    // ("missing") nodes in its rect list, while flattenD3 drops them — counting
    // visible leaves in both panels yields the same "missing" metric.
    const leaves = rects.filter((r) => r.isLeaf && r.width > 0 && r.height > 0);
    const aspects = rects
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => Math.max(r.width / r.height, r.height / r.width));
    const meanAspect = aspects.length ? aspects.reduce((s, a) => s + a, 0) / aspects.length : 0;
    const maxAspect = aspects.length ? Math.max(...aspects) : 0;

    const ratios = rects.filter((r) => r.value > 0 && r.width > 0 && r.height > 0).map((r) => (r.width * r.height) / r.value);
    let valuePropCV = 0;
    if (ratios.length > 1) {
      const mean = ratios.reduce((s, x) => s + x, 0) / ratios.length;
      const variance = ratios.reduce((s, x) => s + (x - mean) ** 2, 0) / ratios.length;
      valuePropCV = Math.sqrt(variance) / mean;
    }

    const leafArea = leaves.reduce((s, r) => s + r.width * r.height, 0);
    const spaceUtil = size > 0 ? leafArea / (size * size) : 0;

    return {
      nodes: rects.length,
      leaves: leaves.length,
      missing: totalLeaves - leaves.length,
      meanAspect,
      maxAspect,
      valuePropCV,
      spaceUtil,
      ms,
    };
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
    labelPx: number;
    labelEnabled: boolean;
    topLevels: number;
    sorting: ImprovedSortingOption;
    collapseFolders: boolean;
  }

  function computeNestedD3(tree: TreeNode, opts: NestedD3Options): TreemapRect[] {
    const data = opts.collapseFolders ? collapseFolderChains(tree) : tree;

    const root = hierarchy(data).sum((d) => (!d.children || d.children.length === 0 ? (d.attributes?.[opts.metric] ?? 0) : 0));

    if (opts.sorting !== ImprovedSortingOption.NONE) {
      // MIDDLE behaves like DESCENDING (same as the improved squarify comparator).
      const dir = opts.sorting === ImprovedSortingOption.ASCENDING ? 1 : -1;
      root.sort((a, b) => dir * ((a.value ?? 0) - (b.value ?? 0)));
    }

    const layout = treemap<TreeNode>()
      .size([opts.size, opts.size])
      .round(false)
      .paddingOuter(opts.gapPx)
      .paddingInner(opts.innerGapPx);

    // Mirror the improved algorithm's `hasLabel = labelsEnabled && depth <
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
   * The improved layout reports each node's *own* metric value only, so
   * folders without an own attribute show 0. Fill them bottom-up with the
   * effective value the algorithm itself uses (own value ?? sum of children):
   * `rects` are in pre-order (parent before its whole subtree), which lets us
   * derive parents and aggregate in one pass.
   */
  function aggregateImprovedValues(rects: TreemapRect[], metric: string): TreemapRect[] {
    const n = rects.length;
    if (n === 0) return rects;
    const parent = new Array<number>(n).fill(-1);
    const stack: number[] = [];
    for (let i = 0; i < n; i++) {
      while (stack.length && rects[stack[stack.length - 1]].depth >= rects[i].depth) stack.pop();
      if (stack.length) parent[i] = stack[stack.length - 1];
      stack.push(i);
    }
    const childSums = new Array<number>(n).fill(0);
    const result = rects.map((r) => ({ ...r }));
    for (let i = n - 1; i >= 0; i--) {
      const own = result[i].attributes?.[metric];
      const effective = own !== undefined ? own : childSums[i];
      result[i].value = effective;
      if (parent[i] >= 0) childSums[parent[i]] += effective;
    }
    return result;
  }

  function fmt(v: number, digits = 2): string {
    return v.toFixed(digits);
  }

  type BetterDir = 'lower' | 'higher' | 'none';
  const metricRows: { labelKey: string; hintKey: string; value: (s: Stats) => number; format: (s: Stats) => string; better: BetterDir }[] = [
    { labelKey: 'mSpace', hintKey: 'hSpace', value: (s) => s.spaceUtil, format: (s) => (s.spaceUtil * 100).toFixed(1) + ' %', better: 'none' },
    { labelKey: 'mNodes', hintKey: 'hNodes', value: (s) => s.nodes, format: (s) => String(s.nodes), better: 'none' },
    { labelKey: 'mLeaves', hintKey: 'hLeaves', value: (s) => s.leaves, format: (s) => String(s.leaves), better: 'none' },
    { labelKey: 'mMissing', hintKey: 'hMissing', value: (s) => s.missing, format: (s) => String(s.missing), better: 'lower' },
    { labelKey: 'mMeanAspect', hintKey: 'hMeanAspect', value: (s) => s.meanAspect, format: (s) => fmt(s.meanAspect), better: 'lower' },
    { labelKey: 'mMaxAspect', hintKey: 'hMaxAspect', value: (s) => s.maxAspect, format: (s) => fmt(s.maxAspect), better: 'lower' },
    { labelKey: 'mValueProp', hintKey: 'hValueProp', value: (s) => s.valuePropCV, format: (s) => fmt(s.valuePropCV), better: 'lower' },
    { labelKey: 'mTime', hintKey: 'hTime', value: (s) => s.ms, format: (s) => fmt(s.ms) + ' ms', better: 'lower' },
  ];

  function betterIndex(m: (typeof metricRows)[number], stats: Stats[]): number {
    if (m.better === 'none' || stats.length < 2) return -1;
    const a = m.value(stats[0]);
    const b = m.value(stats[1]);
    if (a === b) return -1;
    if (m.better === 'lower') return a < b ? 0 : 1;
    return a > b ? 0 : 1;
  }

  function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        loadedData = JSON.parse(event.target?.result as string) as TreeNode;
      } catch {
        alert(lang === 'de' ? 'Ungültige JSON-Datei' : 'Invalid JSON file');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  function loadExample(e: Event) {
    const id = (e.currentTarget as HTMLSelectElement).value;
    const example = examples[id];
    if (!example) return;
    exampleId = id;
    loadedData = example.data;
    areaMetric = example.metric;
  }
</script>

<main>
  <header>
    <div class="heading">
      <h1>{t.title}</h1>
      <p>
        {t.subtitle} ·
        <a href="https://github.com/BenediktMehl/master-thesis" target="_blank" rel="noopener">{t.thesis} ↗</a>
      </p>
      <div class="lang">
        <button class:active={lang === 'de'} on:click={() => (lang = 'de')}>DE</button>
        <button class:active={lang === 'en'} on:click={() => (lang = 'en')}>EN</button>
      </div>
    </div>

    <div class="controls">
      <label class="c" title={help('margin')}>
        <span class="lbl">{t.margin}</span>
        <span class="field">
          <input type="range" min="0" max="3" step="0.1" bind:value={marginPercent} />
          <output>{marginPercent.toFixed(1)}%</output>
        </span>
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

      <div class="c" title={help('siblingMargin')}>
        <span class="lbl">&nbsp;</span>
        <button class="toggle {applySiblingMargin ? 'on' : ''}" on:click={() => (applySiblingMargin = !applySiblingMargin)}>
          {applySiblingMargin ? '✓' : '✗'} {t.siblingMargin}
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
              {s === ImprovedSortingOption.NONE ? t.sortNone : s === ImprovedSortingOption.ASCENDING ? t.sortAsc : s === ImprovedSortingOption.DESCENDING ? t.sortDesc : t.sortMiddle}
            </option>
          {/each}
        </select>
      </label>

      <label class="c" title={help('metric')}>
        <span class="lbl">{t.metric}</span>
        <input type="text" bind:value={areaMetric} />
      </label>

      <div class="c" title={help('dataset')}>
        <span class="lbl">&nbsp;</span>
        <label class="file">
          📁 {t.load}
          <input type="file" accept=".json,application/json" on:change={handleFileUpload} hidden />
        </label>
      </div>

      <div class="c" title={help('dataset')}>
        <span class="lbl">{t.dataPreset}</span>
        <select value={exampleId} on:change={loadExample}>
          {#each exampleOrder as ex (ex.id)}
            <option value={ex.id}>{t[ex.labelKey]}</option>
          {/each}
        </select>
      </div>
    </div>
  </header>

  <section class="metrics">
    <table>
      <thead>
        <tr>
          <th>{t.metricCol}</th>
          {#each results as r (r.key)}<th>{r.title}</th>{/each}
        </tr>
      </thead>
      <tbody>
        {#each metricRows as m (m.labelKey)}
          {@const bi = betterIndex(m, results.map((r) => r.stats))}
          <tr>
            <td class="metric-label" title={t[m.hintKey]}>{t[m.labelKey]} <span class="info">ⓘ</span></td>
            {#each results as r, i (r.key)}
              <td class:better={bi === i}>{m.format(r.stats)}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </section>

  <section class="panels">
    {#each results as r (r.key)}
      <div class="panel">
        <div class="panel-head">
          <h2>{r.title}</h2>
          <span class="sub"><a href={r.repoUrl} target="_blank" rel="noopener">{r.subtitle} ↗</a></span>
        </div>
        {#if r.rects.length > 0}
          <TreemapSvg rects={r.rects} {containerSize} showValues />
        {:else}
          <div class="empty">{t.empty}</div>
        {/if}
      </div>
    {/each}
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

  .heading p {
    margin: 0 0 14px;
    color: var(--muted);
    font-size: 14px;
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

  .file:hover {
    border-color: #bbb;
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

  .better {
    color: #15803d;
    font-weight: 700;
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
    .panels {
      grid-template-columns: 1fr;
    }
  }

  .panel {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px;
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
