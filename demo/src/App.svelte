<script lang="ts">
  import TreemapSvg from '$lib/components/TreemapSvg.svelte';
  import { TreemapLayout, SortingOption, type TreeNode, type TreemapRect } from 'improved-treemap';
  import sample from '$lib/data/sample.json';

  let loadedData: TreeNode = sample as TreeNode;

  // Reactive settings — each one maps directly onto the builder.
  let areaMetric = 'size';
  let marginPercent = 1.5;
  let topN = 3;
  let labelSizePercent = 5;
  let collapseFolders = true;
  let sorting: SortingOption = SortingOption.DESCENDING;

  const containerSize = 1000;

  // Recompute the layout whenever any setting or the data changes.
  let rects: TreemapRect[] = [];
  $: {
    const config = TreemapLayout.builder()
      .areaMetric(areaMetric)
      .margin(marginPercent / 100)
      .labels(topN, labelSizePercent / 100)
      .collapseFolders(collapseFolders)
      .sorting(sorting)
      .build();

    rects = new TreemapLayout(config).compute(loadedData, {
      width: containerSize,
      height: containerSize,
    });
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
        alert('Invalid JSON file');
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
      <p>Interaktive Demo für das Paket <code>improved-treemap</code></p>
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

  <section class="layout">
    <div class="canvas">
      {#if rects.length > 0}
        <TreemapSvg {rects} {containerSize} />
        <p class="meta">{rects.length} Rechtecke gerendert</p>
      {:else}
        <div class="empty">Keine Daten zum Anzeigen. Bitte eine JSON-Datei laden.</div>
      {/if}
    </div>

    <aside>
      <h2>Aktuelle Konfiguration</h2>
      <dl>
        <dt>Margin</dt>
        <dd>{(marginPercent / 100).toFixed(3)} ({marginPercent.toFixed(1)}%)</dd>
        <dt>Top-Labels</dt>
        <dd>{topN} Ebenen, {labelSizePercent}% Höhe</dd>
        <dt>Sortierung</dt>
        <dd>{sorting === SortingOption.NONE ? 'keine' : sorting}</dd>
        <dt>Flächen-Metrik</dt>
        <dd>{areaMetric}</dd>
        <dt>Ordnerketten</dt>
        <dd>{collapseFolders ? 'zusammengefaltet' : 'nicht zusammengefaltet'}</dd>
      </dl>

      <h2>Builder-Code</h2>
      <pre><code>TreemapLayout.builder()
  .areaMetric('{areaMetric}')
  .margin({(marginPercent / 100).toFixed(3)})
  .labels({topN}, {(labelSizePercent / 100).toFixed(2)})
  .collapseFolders({collapseFolders})
  .sorting(SortingOption.{sorting.toUpperCase()})
  .build()</code></pre>
    </aside>
  </section>
</main>

<style>
  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px;
  }

  header {
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(96, 165, 250, 0.4);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 24px;
    backdrop-filter: blur(8px);
  }

  .title h1 {
    margin: 0 0 4px;
    font-size: 28px;
  }

  .title p {
    margin: 0 0 16px;
    color: #93c5fd;
    font-size: 14px;
  }

  code {
    background: rgba(0, 0, 0, 0.4);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 13px;
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
    color: #bfdbfe;
  }

  .control input[type='range'] {
    width: 100%;
  }

  .control input[type='number'],
  .control input[type='text'],
  .control select {
    background: #1e293b;
    border: 1px solid #3b82f6;
    border-radius: 6px;
    color: #e2e8f0;
    padding: 7px 9px;
    font-size: 14px;
  }

  .control output {
    font-size: 13px;
    color: #e2e8f0;
  }

  .toggle,
  .button {
    background: #334155;
    border: 1px solid #475569;
    border-radius: 8px;
    color: #e2e8f0;
    padding: 10px 14px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .toggle.on {
    background: #2563eb;
    border-color: #60a5fa;
  }

  .button:hover,
  .toggle:hover {
    transform: translateY(-1px);
  }

  .actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
  }

  .layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 24px;
    align-items: start;
  }

  @media (max-width: 800px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }

  .canvas {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(96, 165, 250, 0.4);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .meta {
    color: #94a3b8;
    font-size: 12px;
    margin: 10px 0 0;
  }

  .empty {
    color: #94a3b8;
    padding: 80px 0;
    text-align: center;
  }

  aside {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(96, 165, 250, 0.4);
    border-radius: 12px;
    padding: 18px;
  }

  aside h2 {
    font-size: 16px;
    margin: 0 0 10px;
    color: #93c5fd;
  }

  dl {
    margin: 0 0 16px;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 6px 12px;
    font-size: 13px;
  }

  dt {
    color: #94a3b8;
  }

  dd {
    margin: 0;
    color: #e2e8f0;
    word-break: break-word;
  }

  pre {
    background: #0b1220;
    border-radius: 8px;
    padding: 12px;
    overflow-x: auto;
    font-size: 12px;
    line-height: 1.5;
  }

  pre code {
    background: none;
    padding: 0;
  }
</style>
