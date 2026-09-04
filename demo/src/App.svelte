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

  let loadedData: TreeNode = sample as TreeNode;

  // Settings (compact, map onto the builder).
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
    meanAspect: number;
    maxAspect: number;
    ms: number;
  }

  interface Result {
    key: string;
    title: string;
    subtitle: string;
    rects: TreemapRect[];
    labelPosition: LabelPosition;
    stats: Stats;
  }

  let results: Result[] = [];

  $: {
    const gapPx = (marginPercent / 100) * containerSize;
    const labelPx = (labelSizePercent / 100) * containerSize;

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

    // 2) Nested treemap (d3, with gaps and labels).
    t0 = performance.now();
    const nestedRects = computeNestedD3(loadedData, areaMetric, containerSize, gapPx, labelPx, topN);
    const nestedMs = performance.now() - t0;

    results = [
      { key: 'area-true', title: 'Area-True Treemap', subtitle: 'verbessert, mit Abständen und Labels', rects: areaTrueRects, labelPosition, stats: computeStats(areaTrueRects, areaTrueMs) },
      { key: 'nested', title: 'Nested Treemap', subtitle: 'd3.js nested treemap', rects: nestedRects, labelPosition: LabelPosition.TOP, stats: computeStats(nestedRects, nestedMs) },
    ];
  }

  function computeStats(rects: TreemapRect[], ms: number): Stats {
    const leaves = rects.filter((r) => r.isLeaf);
    const aspects = rects.map((r) => Math.max(r.width / r.height, r.height / r.width));
    const sum = aspects.reduce((s, a) => s + a, 0);
    return {
      nodes: rects.length,
      leaves: leaves.length,
      meanAspect: aspects.length ? sum / aspects.length : 0,
      maxAspect: aspects.length ? Math.max(...aspects) : 0,
      ms,
    };
  }

  function computeNestedD3(
    tree: TreeNode,
    metric: string,
    size: number,
    gapPx: number,
    labelPx: number,
    topLevels: number,
  ): TreemapRect[] {
    const root = hierarchy(tree)
      .sum((d) => d.attributes?.[metric] ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const laidOut = treemap<TreeNode>()
      .size([size, size])
      .round(false)
      .paddingOuter(gapPx)
      .paddingInner(gapPx)
      .paddingTop((n) => (isLabeled(n, topLevels) ? labelPx : 0))(root);
    return flattenD3(laidOut, (n) => isLabeled(n, topLevels));
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

  function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        loadedData = JSON.parse(event.target?.result as string) as TreeNode;
      } catch {
        alert('Ungültige JSON-Datei');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  function loadSample() {
    loadedData = sample as TreeNode;
  }
</script>

<main>
  <header>
    <div class="heading">
      <h1>Treemap Vergleich</h1>
      <p>Area-True Treemap vs. Nested Treemap</p>
    </div>

    <div class="controls">
      <label class="c">
        <span>Margin</span>
        <input type="range" min="0" max="3" step="0.1" bind:value={marginPercent} />
        <em>{marginPercent.toFixed(1)}%</em>
      </label>
      <label class="c">
        <span>Labels</span>
        <input type="number" min="0" max="10" bind:value={topN} />
      </label>
      <label class="c">
        <span>Höhe</span>
        <input type="number" min="0" max="20" bind:value={labelSizePercent} />%
      </label>
      <label class="c">
        <span>Position</span>
        <select bind:value={labelPosition}>
          <option value={LabelPosition.TOP}>oben</option>
          <option value={LabelPosition.BOTTOM}>unten</option>
          <option value={LabelPosition.LEFT}>links</option>
          <option value={LabelPosition.RIGHT}>rechts</option>
        </select>
      </label>
      <label class="c">
        <span>Sortierung</span>
        <select bind:value={sorting}>
          <option value={SortingOption.DESCENDING}>absteigend</option>
          <option value={SortingOption.ASCENDING}>aufsteigend</option>
          <option value={SortingOption.NONE}>keine</option>
        </select>
      </label>
      <label class="c">
        <span>Metrik</span>
        <input type="text" bind:value={areaMetric} />
      </label>
      <button class="toggle {collapseFolders ? 'on' : ''}" on:click={() => (collapseFolders = !collapseFolders)}>
        {collapseFolders ? '✓' : '✗'} Ordnerketten
      </button>
      <label class="file">
        📁 JSON
        <input type="file" accept=".json,application/json" on:change={handleFileUpload} hidden />
      </label>
      <button class="file" on:click={loadSample}>↺ Beispiel</button>
    </div>
  </header>

  <section class="metrics">
    <table>
      <thead>
        <tr>
          <th>Metrik</th>
          {#each results as r (r.key)}<th>{r.title}</th>{/each}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Knoten</td>
          {#each results as r (r.key)}<td>{r.stats.nodes}</td>{/each}
        </tr>
        <tr>
          <td>Blätter</td>
          {#each results as r (r.key)}<td>{r.stats.leaves}</td>{/each}
        </tr>
        <tr>
          <td>Ø Seitenverhältnis</td>
          {#each results as r (r.key)}<td>{fmt(r.stats.meanAspect)}</td>{/each}
        </tr>
        <tr>
          <td>Max Seitenverhältnis</td>
          {#each results as r (r.key)}<td>{fmt(r.stats.maxAspect)}</td>{/each}
        </tr>
        <tr>
          <td>Berechnungszeit</td>
          {#each results as r (r.key)}<td>{fmt(r.stats.ms)} ms</td>{/each}
        </tr>
      </tbody>
    </table>
  </section>

  <section class="panels">
    {#each results as r (r.key)}
      <div class="panel">
        <div class="panel-head">
          <h2>{r.title}</h2>
          <span class="sub">{r.subtitle}</span>
        </div>
        {#if r.rects.length > 0}
          <TreemapSvg rects={r.rects} {containerSize} labelPosition={r.labelPosition} showValues />
        {:else}
          <div class="empty">Keine Daten.</div>
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

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    align-items: flex-end;
  }

  .c {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
  }

  .c input[type='number'],
  .c input[type='text'],
  .c select {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    padding: 4px 6px;
    font-size: 12px;
    width: 64px;
  }

  .c input[type='text'] {
    width: 72px;
  }

  .c input[type='range'] {
    width: 90px;
  }

  .c em {
    font-style: normal;
    font-size: 11px;
    color: var(--text);
    text-transform: none;
  }

  .toggle,
  .file {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    padding: 4px 8px;
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
