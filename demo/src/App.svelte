<script lang="ts">
  import TreemapSvg from '$lib/components/TreemapSvg.svelte';
  import { runAreaTrueLayout } from '$lib/algorithms/areaTrue/adapter';
  import {
    settings,
    marginPreset,
    labelPreset,
    collapseFolders,
    applySiblingMargin,
    minSize,
  } from '$lib/state/settings';
  import type { TreeNode, TreemapRect } from '$lib/types';

  // Load sample data directly as object instead of importing JSON
  const sampleData: TreeNode = {
    name: "root",
    attributes: {
      size: 10000
    },
    children: [
      {
        name: "folder-a",
        attributes: { size: 3500 },
        children: [
          { name: "module-a1", attributes: { size: 1200 } },
          { name: "module-a2", attributes: { size: 1800 } },
          { name: "module-a3", attributes: { size: 500 } }
        ]
      },
      {
        name: "folder-b",
        attributes: { size: 3000 },
        children: [
          { name: "module-b1", attributes: { size: 1500 } },
          { name: "module-b2", attributes: { size: 1000 } },
          { name: "module-b3", attributes: { size: 500 } }
        ]
      },
      {
        name: "folder-c",
        attributes: { size: 2000 },
        children: [
          { name: "module-c1", attributes: { size: 1000 } },
          { name: "module-c2", attributes: { size: 700 } },
          { name: "module-c3", attributes: { size: 300 } }
        ]
      },
      {
        name: "folder-d",
        attributes: { size: 1500 },
        children: [
          { name: "module-d1", attributes: { size: 800 } },
          { name: "module-d2", attributes: { size: 700 } }
        ]
      }
    ]
  };

  let loadedData: TreeNode = sampleData;

  let rects: TreemapRect[] = [];
  let containerSize = 1000;

  // Recompute layout when settings change
  $: if (loadedData && $settings) {
    rects = runAreaTrueLayout(loadedData, $settings, containerSize);
  }

  // File upload handler
  function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        loadedData = json;
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  }

  // Reset to sample
  function loadSample() {
    loadedData = sampleData;
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white">
  <!-- Header -->
  <header class="bg-black bg-opacity-40 backdrop-blur border-b border-blue-500 shadow-lg">
    <div class="max-w-7xl mx-auto px-6 py-4">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-3xl font-bold">Area-True Treemap 2D Visualization</h1>
        <div class="text-sm text-blue-200">Interactive Thesis Algorithm Demo</div>
      </div>

      <!-- Control Bar -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <!-- Margin Preset -->
        <div>
          <label for="margin-select" class="block text-xs font-semibold text-blue-300 mb-1">Margin (relative)</label>
          <select id="margin-select" bind:value={$marginPreset} class="w-full px-3 py-2 bg-gray-800 border border-blue-500 rounded text-sm hover:border-blue-400 transition">
            <option value="auto">Auto (~1.5%)</option>
            <option value="0.5%">0.5%</option>
            <option value="1%">1%</option>
            <option value="2%">2%</option>
            <option value="3%">3%</option>
          </select>
        </div>

        <!-- Label Preset: Top N -->
        <div>
          <label for="label-topn" class="block text-xs font-semibold text-blue-300 mb-1">Top Labels (N)</label>
          <input
            id="label-topn"
            type="number"
            min="0"
            max="10"
            bind:value={$labelPreset.topN}
            class="w-full px-3 py-2 bg-gray-800 border border-blue-500 rounded text-sm hover:border-blue-400 transition"
          />
        </div>

        <!-- Label Preset: Size % -->
        <div>
          <label for="label-size" class="block text-xs font-semibold text-blue-300 mb-1">Label Size (%)</label>
          <input
            id="label-size"
            type="number"
            min="1"
            max="20"
            bind:value={$labelPreset.sizePercent}
            class="w-full px-3 py-2 bg-gray-800 border border-blue-500 rounded text-sm hover:border-blue-400 transition"
          />
        </div>

        <!-- Min Render Size -->
        <div>
          <label for="min-size" class="block text-xs font-semibold text-blue-300 mb-1">Min Size (px)</label>
          <input
            id="min-size"
            type="number"
            min="5"
            max="100"
            bind:value={$minSize}
            class="w-full px-3 py-2 bg-gray-800 border border-blue-500 rounded text-sm hover:border-blue-400 transition"
          />
        </div>
      </div>

      <!-- Toggle Buttons -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
        <button
          on:click={() => ($collapseFolders = !$collapseFolders)}
          class={`px-4 py-2 rounded font-semibold text-sm transition transform hover:scale-105 ${
            $collapseFolders
              ? 'bg-blue-600 border border-blue-400'
              : 'bg-gray-700 border border-gray-600'
          }`}
        >
          {$collapseFolders ? '✓' : '◯'} Collapse Folders
        </button>

        <button
          on:click={() => ($applySiblingMargin = !$applySiblingMargin)}
          class={`px-4 py-2 rounded font-semibold text-sm transition transform hover:scale-105 ${
            $applySiblingMargin
              ? 'bg-blue-600 border border-blue-400'
              : 'bg-gray-700 border border-gray-600'
          }`}
        >
          {$applySiblingMargin ? '✓' : '◯'} Sibling Gaps
        </button>

        <label class="px-4 py-2 rounded font-semibold text-sm bg-green-700 border border-green-500 cursor-pointer transition transform hover:scale-105 flex items-center justify-center">
          📁 Load JSON
          <input type="file" accept=".json" on:change={handleFileUpload} class="hidden" />
        </label>

        <button
          on:click={loadSample}
          class="px-4 py-2 rounded font-semibold text-sm bg-purple-700 border border-purple-500 transition transform hover:scale-105"
        >
          🔄 Load Sample
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-6 py-8">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Treemap Visualization -->
      <div class="lg:col-span-2">
        <div class="bg-white bg-opacity-5 backdrop-blur border border-blue-500 rounded-lg p-6 shadow-2xl">
          <h2 class="text-xl font-bold mb-4 text-blue-300">Layout Visualization</h2>
          {#if rects.length > 0}
            <div class="flex justify-center">
              <TreemapSvg {rects} minSize={$minSize} {containerSize} />
            </div>
            <p class="text-xs text-gray-400 mt-2">
              Rendered {rects.length} nodes · Margin: {$marginPreset} · Labels: top {$labelPreset.topN}
            </p>
          {:else}
            <div class="text-center text-gray-400 py-16">No data to display. Load a JSON file.</div>
          {/if}
        </div>
      </div>

      <!-- Info Panel -->
      <aside class="bg-white bg-opacity-5 backdrop-blur border border-blue-500 rounded-lg p-6 shadow-2xl h-fit">
        <h3 class="text-lg font-bold mb-4 text-blue-300">Settings Info</h3>
        <div class="space-y-2 text-sm text-gray-300">
          <p><strong>Margin:</strong> {$marginPreset} (relative distance from thesis)</p>
          <p><strong>Top Labels:</strong> {$labelPreset.topN} levels, {$labelPreset.sizePercent}% height</p>
          <p><strong>Collapse Folders:</strong> {$collapseFolders ? 'Yes' : 'No'}</p>
          <p><strong>Sibling Gaps:</strong> {$applySiblingMargin ? 'Yes' : 'No'}</p>
          <p><strong>Min Render Size:</strong> {$minSize}px</p>
          <hr class="border-blue-600 my-3" />
          <p class="text-xs text-blue-200">
            <strong>Thesis Defaults (fixed):</strong>
            <br />
            • Aspect ratio: 1
            <br />
            • Sort order: Descending
            <br />
            • Size mode: Relative
            <br />
            • Algorithm: Single pass
          </p>
        </div>
      </aside>
    </div>
  </main>
</div>
