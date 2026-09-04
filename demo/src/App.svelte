<script lang="ts">
  import { hierarchy, treemap } from 'd3-hierarchy';
  import TreemapSvg from '$lib/components/TreemapSvg.svelte';
  import {
    TreemapLayout,
    SortingOption,
    LabelPosition,
    type TreeNode,
    type TreemapRect,
  } from 'improved-treemap';
  import sample from '$lib/data/sample.json';

  let loadedData: TreeNode = sample as TreeNode;

  // Reactive settings — each one maps directly onto the builder.
  let areaMetric = 'size';
  let marginPercent = 1.5;
  let topN = 3;
  let labelSizePercent = 5;
  let labelPosition: LabelPosition = LabelPosition.TOP;
  let collapseFolders = true;
  let sorting: SortingOption = SortingOption.DESCENDING;

  const containerSize = 1000;

  let improvedRects: TreemapRect[] = [];
  let standardRects: TreemapRect[] = [];
  let improvedMs = 0;
  let standardMs = 0;

  $: {
    const config = TreemapLayout.builder()
      .areaMetric(areaMetric)
      .margin(marginPercent / 100)
      .labels(topN, labelSizePercent / 100)
      .labelPosition(labelPosition)
      .collapseFolders(collapseFolders)
      .sorting(sorting)
      .build();

    let t0 = performance.now();
    improvedRects = new TreemapLayout(config).compute(loadedData, { width: containerSize, height: containerSize });
    improvedMs = performance.now() - t0;

    t0 = performance.now();
    standardRects = computeStandardD3(loadedData, areaMetric, containerSize);
    standardMs = performance.now() - t0;
  }

  // Baseline: the classic d3 squarified treemap (no gaps, no labels).
  function computeStandardD3(tree: TreeNode, metric: string, size: number): TreemapRect[] {
    const root = hierarchy(tree)
      .sum((d) => d.attributes?.[metric] ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    treemap<TreeNode>().size([size, size]).padding(0).round(false)(root);

    const rects: TreemapRect[] = [];
    const walk = (n: any): void => {
      if (n.depth > 0 && n.x1 - n.x0 > 0 && n.y1 - n.y0 > 0) {
        rects.push({
          x: n.x0,
          y: n.y0,
          width: n.x1 - n.x0,
          height: n.y1 - n.y0,
          name: n.data.name,
          depth: n.depth,
          isLeaf: !n.children || n.children.length === 0,
          hasLabel: false,
          value: n.value ?? 0,
          attributes: n.data.attributes,
        });
      }
      if (n.children) for (const c of n.children) walk(c);
    };
    walk(root);
    return rects;
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
    <div class="title">
      <h1>Area-True Treemap</h1>
      <p>Vergleich des verbesserten Layouts mit dem klassischen D3.js-Squarified-Treemap</p>
    </div>

    <div class="controls">
      <label class="control">
        <span>Margin (relativ)</span>
        <input type="range" min="0" max="3" step="0.1" bind:value={marginPercent} />
        <output>{marginPercent.toFixed(1)}%</output>
      </label>

      <label class="control">
        <span>Top-Labels (N)</span>
        <input type="number" min="0" max="10" bind:value={topN} />
      </label>

      <label class="control">
        <span>Label-Höhe (%)</span>
        <input type="number" min="0" max="20" bind:value={labelSizePercent} />
      </label>

      <label class="control">
        <span>Label-Position</span>
        <select bind:value={labelPosition}>
          <option value={LabelPosition.TOP}>Oben</option>
          <option value={LabelPosition.BOTTOM}>Unten</option>
          <option value={LabelPosition.LEFT}>Links</option>
          <option value={LabelPosition.RIGHT}>Rechts</option>
        </select>
      </label>

      <label class="control">
        <span>Sortierung</span>
        <select bind:value={sorting}>
          <option value={SortingOption.DESCENDING}>Absteigend</option>
          <option value={SortingOption.ASCENDING}>Aufsteigend</option>
          <option value={SortingOption.NONE}>Keine</option>
        </select>
      </label>

      <label class="control">
        <span>Flächen-Metrik</span>
        <input type="text" bind:value={areaMetric} />
      </label>

      <button class="toggle {collapseFolders ? 'on' : ''}" on:click={() => (collapseFolders = !collapseFolders)}>
        {collapseFolders ? '✓' : '✗'} Ordnerketten zusammenfalten
      </button>
    </div>

    <div class="actions">
      <label class="button">
        📁 JSON laden
        <input type="file" accept=".json,application/json" on:change={handleFileUpload} hidden />
      </label>
      <button class="button" on:click={loadSample}>↺ Beispiel laden</button>
    </div>
  </header>

  <section class="panels">
    <div class="panel">
      <div class="panel-head">
        <h2>Area-True (verbessert)</h2>
        <span class="meta">{improvedRects.length} Knoten · {improvedMs.toFixed(2)} ms</span>
      </div>
      {#if improvedRects.length > 0}
        <TreemapSvg rects={improvedRects} {containerSize} {labelPosition} showValues />
      {:else}
        <div class="empty">Keine Daten zum Anzeigen.</div>
      {/if}
    </div>

    <div class="panel">
      <div class="panel-head">
        <h2>Standard Squarified (D3.js)</h2>
        <span class="meta">{standardRects.length} Knoten · {standardMs.toFixed(2)} ms</span>
      </div>
      {#if standardRects.length > 0}
        <TreemapSvg rects={standardRects} {containerSize} showValues />
      {:else}
        <div class="empty">Keine Daten zum Anzeigen.</div>
      {/if}
    </div>
  </section>
</main>

<style>
  main {
    max-width: 1120px;
    margin: 0 auto;
    padding: 24px;
  }

  header {
    background: #1c1c21;
    border: 1px solid #2e2e34;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
  }

  .title h1 {
    margin: 0 0 4px;
    font-size: 26px;
    color: #f4f4f5;
  }

  .title p {
    margin: 0 0 16px;
    color: #a1a1aa;
    font-size: 14px;
  }

  .controls {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 14px;
    align-items: end;
  }

  .control {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
    color: #a1a1aa;
  }

  .control input[type='range'] {
    width: 100%;
  }

  .control input[type='number'],
  .control input[type='text'],
  .control select {
    background: #26262b;
    border: 1px solid #3f3f46;
    border-radius: 6px;
    color: #e4e4e7;
    padding: 7px 9px;
    font-size: 14px;
  }

  .control output {
    font-size: 13px;
    color: #e4e4e7;
  }

  .toggle,
  .button {
    background: #26262b;
    border: 1px solid #3f3f46;
    border-radius: 8px;
    color: #e4e4e7;
    padding: 10px 14px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toggle.on {
    background: #134e3a;
    border-color: #34d399;
    color: #d1fae5;
  }

  .button:hover,
  .toggle:hover {
    border-color: #71717a;
  }

  .actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
  }

  .panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  @media (max-width: 820px) {
    .panels {
      grid-template-columns: 1fr;
    }
  }

  .panel {
    background: #1c1c21;
    border: 1px solid #2e2e34;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }

  .panel h2 {
    font-size: 16px;
    margin: 0;
    color: #e4e4e7;
  }

  .meta {
    color: #a1a1aa;
    font-size: 12px;
    white-space: nowrap;
  }

  .empty {
    color: #a1a1aa;
    padding: 60px 0;
    text-align: center;
  }
</style>
