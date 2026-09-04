<script lang="ts">
  import { hierarchy, treemap, type HierarchyRectangularNode } from 'd3-hierarchy';
  import TreemapSvg from '$lib/components/TreemapSvg.svelte';
  import {
    TreemapLayout,
    SortingOption,
    LabelPosition,
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
      subtitle: 'Area-True Treemap vs. Nested Treemap',
      thesis: 'zur Masterthesis',
      margin: 'Margin',
      labels: 'Labels',
      height: 'Höhe',
      position: 'Position',
      sort: 'Sortierung',
      metric: 'Metrik',
      collapse: 'Ordnerketten',
      load: 'JSON',
      sample: 'Beispiel',
      dataPreset: 'Beispieldaten',
      presetFlare: 'flare (d3, aus der Masterarbeit)',
      presetSample: 'kleines Beispiel (synthetisch)',
      posTop: 'oben',
      posBottom: 'unten',
      posLeft: 'links',
      posRight: 'rechts',
      sortDesc: 'absteigend',
      sortAsc: 'aufsteigend',
      sortNone: 'keine',
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
        'Platznutzung (These): Anteil der Wurzelfläche, der von Blattknoten eingenommen wird. Bester Wert: 100 % (volle Ausnutzung).',
      hTime: 'Zeitaufwand (These): Reine Berechnungszeit des Layout-Algorithmus in ms (ohne Rendering). Bester Wert: möglichst niedrig.',
      areaTrue: 'Area-True Treemap',
      areaTrueSub: 'verbessert, mit Abständen und Labels',
      nested: 'Nested Treemap',
      nestedSub: 'd3.js nested treemap',
      empty: 'Keine Daten.',
    },
    en: {
      title: 'Treemap Comparison',
      subtitle: 'Area-True Treemap vs. Nested Treemap',
      thesis: 'master thesis',
      margin: 'Margin',
      labels: 'Labels',
      height: 'Height',
      position: 'Position',
      sort: 'Sort',
      metric: 'Metric',
      collapse: 'Folder chains',
      load: 'JSON',
      sample: 'Sample',
      dataPreset: 'Sample data',
      presetFlare: 'flare (d3, from master thesis)',
      presetSample: 'small sample (synthetic)',
      posTop: 'top',
      posBottom: 'bottom',
      posLeft: 'left',
      posRight: 'right',
      sortDesc: 'descending',
      sortAsc: 'ascending',
      sortNone: 'none',
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
        'Space utilization (thesis): fraction of the root area occupied by leaf nodes. Best value: 100% (full usage).',
      hTime: 'Time (thesis): pure layout computation time in ms (without rendering). Best value: as low as possible.',
      areaTrue: 'Area-True Treemap',
      areaTrueSub: 'improved, with gaps and labels',
      nested: 'Nested Treemap',
      nestedSub: 'd3.js nested treemap',
      empty: 'No data.',
    },
  };

  $: t = translations[lang];

  // Bundled example datasets, selectable in the header. "flare" is the
  // real-world d3 example used in the master thesis (with gaps, 48 nodes
  // disappear in the plain nested treemap) and is therefore the default.
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
  const defaultExample = 'flare';

  let exampleId: string = defaultExample;
  let loadedData: TreeNode = examples[defaultExample].data;

  let areaMetric = 'size';
  let marginPercent = 1.5;
  let topN = 3;
  let labelSizePercent = 5;
  let labelPosition: LabelPosition = LabelPosition.TOP;
  let collapseFolders = true;
  let sorting: SortingOption = SortingOption.DESCENDING;

  const containerSize = 400;

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
    labelPosition: LabelPosition;
    stats: Stats;
  }

  let results: Result[] = [];

  $: {
    const gapPx = (marginPercent / 100) * containerSize;
    const labelPx = (labelSizePercent / 100) * containerSize;
    const totalLeaves = countLeaves(loadedData);

    // 1) Area-True Treemap (the area-true algorithm).
    const config = TreemapLayout.builder()
      .areaMetric(areaMetric)
      .margin(marginPercent / 100)
      .labels(topN, labelSizePercent / 100)
      .labelPosition(labelPosition)
      .collapseFolders(collapseFolders)
      .sorting(sorting)
      .build();

    let t0 = performance.now();
    const areaTrueRects = new TreemapLayout(config).compute(loadedData, { width: containerSize, height: containerSize });
    const areaTrueMs = performance.now() - t0;

    // 2) Nested treemap (d3, with gaps, labels, sorting and collapsing —
    //    mirroring the area-true settings as far as d3 supports them).
    t0 = performance.now();
    const nestedRects = computeNestedD3(loadedData, {
      metric: areaMetric,
      size: containerSize,
      gapPx,
      labelPx,
      topLevels: topN,
      labelPosition,
      sorting,
      collapseFolders,
    });
    const nestedMs = performance.now() - t0;

    results = [
      { key: 'area-true', title: t.areaTrue, subtitle: t.areaTrueSub, repoUrl: 'https://github.com/BenediktMehl/master-thesis', rects: areaTrueRects, labelPosition, stats: computeStats(areaTrueRects, areaTrueMs, totalLeaves, containerSize) },
      { key: 'nested', title: t.nested, subtitle: t.nestedSub, repoUrl: 'https://github.com/d3/d3-hierarchy', rects: nestedRects, labelPosition, stats: computeStats(nestedRects, nestedMs, totalLeaves, containerSize) },
    ];
  }

  function computeStats(rects: TreemapRect[], ms: number, totalLeaves: number, size: number): Stats {
    const leaves = rects.filter((r) => r.isLeaf);
    const aspects = rects.map((r) => Math.max(r.width / r.height, r.height / r.width));
    const meanAspect = aspects.length ? aspects.reduce((s, a) => s + a, 0) / aspects.length : 0;
    const maxAspect = aspects.length ? Math.max(...aspects) : 0;

    // Wertproportionalität: Varianzkoeffizient des Fläche/Metrik-Verhältnisses.
    const ratios = rects.filter((r) => r.value > 0).map((r) => (r.width * r.height) / r.value);
    let valuePropCV = 0;
    if (ratios.length > 1) {
      const mean = ratios.reduce((s, x) => s + x, 0) / ratios.length;
      const variance = ratios.reduce((s, x) => s + (x - mean) ** 2, 0) / ratios.length;
      valuePropCV = Math.sqrt(variance) / mean;
    }

    // Platznutzung: Anteil der Wurzelfläche, der von Blattknoten eingenommen wird.
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

  /** Settings passed to the d3 nested treemap, mirroring the area-true config. */
  interface NestedD3Options {
    metric: string;
    size: number;
    gapPx: number;
    labelPx: number;
    topLevels: number;
    labelPosition: LabelPosition;
    sorting: SortingOption;
    collapseFolders: boolean;
  }

  function computeNestedD3(tree: TreeNode, opts: NestedD3Options): TreemapRect[] {
    // Apply collapseFolders on a copy of the data before handing it to d3:
    // single-child folder chains are merged into one node (name "a/b/c"),
    // exactly like the area-true layout does.
    const data = opts.collapseFolders ? collapseFolderChains(tree) : tree;

    const root = hierarchy(data)
      // Only leaf nodes carry a value; internal nodes accumulate from children.
      .sum((d) => (!d.children || d.children.length === 0 ? d.attributes?.[opts.metric] ?? 0 : 0));

    if (opts.sorting !== SortingOption.NONE) {
      const dir = opts.sorting === SortingOption.ASCENDING ? 1 : -1;
      root.sort((a, b) => dir * ((a.value ?? 0) - (b.value ?? 0)));
    }

    const layout = treemap<TreeNode>()
      .size([opts.size, opts.size])
      .round(false)
      .paddingOuter(opts.gapPx)
      .paddingInner(opts.gapPx);

    // Reserve the label strip on the side chosen by the user (only folders
    // that actually get a label reserve space).
    const labelPad = (n: HierarchyRectangularNode<TreeNode>): number => (isLabeled(n, opts.topLevels) ? opts.labelPx : 0);
    switch (opts.labelPosition) {
      case LabelPosition.BOTTOM:
        layout.paddingBottom(labelPad);
        break;
      case LabelPosition.LEFT:
        layout.paddingLeft(labelPad);
        break;
      case LabelPosition.RIGHT:
        layout.paddingRight(labelPad);
        break;
      case LabelPosition.TOP:
      default:
        layout.paddingTop(labelPad);
        break;
    }

    const laidOut = layout(root);
    return flattenD3(laidOut, (n) => isLabeled(n, opts.topLevels));
  }

  /**
   * Merge single-child folder chains into one node (like the area-true
   * `collapseFolders` option): a folder whose only child is again a folder is
   * folded into that child and the names joined with "/". The returned tree
   * is a copy, the input stays untouched.
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

  function isLabeled(n: HierarchyRectangularNode<TreeNode>, topLevels: number): boolean {
    return n.depth > 0 && n.depth <= topLevels && !!n.children && n.children.length > 0;
  }

  function flattenD3(root: HierarchyRectangularNode<TreeNode>, hasLabel: (n: HierarchyRectangularNode<TreeNode>) => boolean): TreemapRect[] {
    const rects: TreemapRect[] = [];
    const walk = (n: HierarchyRectangularNode<TreeNode>): void => {
      if (n.depth > 0 && n.x1 - n.x0 > 0 && n.y1 - n.y0 > 0) {
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

  function fmt(v: number, digits = 2): string {
    return v.toFixed(digits);
  }

  // Metric definitions (labels/hints are translated; see `translations`).
  type BetterDir = 'lower' | 'higher' | 'none';
  const metricRows: { labelKey: string; hintKey: string; value: (s: Stats) => number; format: (s: Stats) => string; better: BetterDir }[] = [
    { labelKey: 'mNodes', hintKey: 'hNodes', value: (s) => s.nodes, format: (s) => String(s.nodes), better: 'none' },
    { labelKey: 'mLeaves', hintKey: 'hLeaves', value: (s) => s.leaves, format: (s) => String(s.leaves), better: 'none' },
    { labelKey: 'mMissing', hintKey: 'hMissing', value: (s) => s.missing, format: (s) => String(s.missing), better: 'lower' },
    { labelKey: 'mMeanAspect', hintKey: 'hMeanAspect', value: (s) => s.meanAspect, format: (s) => fmt(s.meanAspect), better: 'lower' },
    { labelKey: 'mMaxAspect', hintKey: 'hMaxAspect', value: (s) => s.maxAspect, format: (s) => fmt(s.maxAspect), better: 'lower' },
    { labelKey: 'mValueProp', hintKey: 'hValueProp', value: (s) => s.valuePropCV, format: (s) => fmt(s.valuePropCV), better: 'lower' },
    { labelKey: 'mSpace', hintKey: 'hSpace', value: (s) => s.spaceUtil, format: (s) => (s.spaceUtil * 100).toFixed(1) + ' %', better: 'higher' },
    { labelKey: 'mTime', hintKey: 'hTime', value: (s) => s.ms, format: (s) => fmt(s.ms) + ' ms', better: 'lower' },
  ];

  // Returns the index of the better result for a metric row, or -1 for none/tie.
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
      <label class="c">
        <span class="lbl">{t.margin}</span>
        <span class="field">
          <input type="range" min="0" max="3" step="0.1" bind:value={marginPercent} />
          <output>{marginPercent.toFixed(1)}%</output>
        </span>
      </label>

      <label class="c">
        <span class="lbl">{t.labels}</span>
        <input type="number" min="0" max="10" bind:value={topN} />
      </label>

      <label class="c">
        <span class="lbl">{t.height}</span>
        <span class="field">
          <input type="number" min="0" max="20" bind:value={labelSizePercent} />
          <span class="unit">%</span>
        </span>
      </label>

      <label class="c">
        <span class="lbl">{t.position}</span>
        <select bind:value={labelPosition}>
          <option value={LabelPosition.TOP}>{t.posTop}</option>
          <option value={LabelPosition.BOTTOM}>{t.posBottom}</option>
          <option value={LabelPosition.LEFT}>{t.posLeft}</option>
          <option value={LabelPosition.RIGHT}>{t.posRight}</option>
        </select>
      </label>

      <label class="c">
        <span class="lbl">{t.sort}</span>
        <select bind:value={sorting}>
          <option value={SortingOption.DESCENDING}>{t.sortDesc}</option>
          <option value={SortingOption.ASCENDING}>{t.sortAsc}</option>
          <option value={SortingOption.NONE}>{t.sortNone}</option>
        </select>
      </label>

      <label class="c">
        <span class="lbl">{t.metric}</span>
        <input type="text" bind:value={areaMetric} />
      </label>

      <div class="c">
        <span class="lbl">&nbsp;</span>
        <button class="toggle {collapseFolders ? 'on' : ''}" on:click={() => (collapseFolders = !collapseFolders)}>
          {collapseFolders ? '✓' : '✗'} {t.collapse}
        </button>
      </div>

      <div class="c">
        <span class="lbl">&nbsp;</span>
        <label class="file">
          📁 {t.load}
          <input type="file" accept=".json,application/json" on:change={handleFileUpload} hidden />
        </label>
      </div>

      <div class="c">
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
          <TreemapSvg rects={r.rects} {containerSize} labelPosition={r.labelPosition} showValues />
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

  .field {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .c input[type='number'],
  .c input[type='text'] {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    padding: 5px 7px;
    font-size: 12px;
    width: 64px;
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

  .c input[type='range'] {
    width: 120px;
  }

  .c output {
    font-size: 12px;
    color: var(--text);
    min-width: 36px;
  }

  .unit {
    font-size: 12px;
    color: var(--muted);
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
