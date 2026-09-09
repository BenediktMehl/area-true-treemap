<script lang="ts">
  import type { TreemapRect } from 'area-true-treemap';
  import { interpolateInferno } from 'd3-scale-chromatic';

  export let rects: TreemapRect[] = [];
  export let containerSize = 400;
  export let minSize = 6;
  export let showValues = true;

  $: depthRange = {
    min: Math.min(...rects.map((r) => r.depth), 0),
    max: Math.max(...rects.map((r) => r.depth), 1),
  };

  // Rects are in pre-order (root first); render them so the root ends up behind.
  $: visibleRects = rects.filter((r) => r.width >= minSize || r.height >= minSize);

  // d3 "lava" sequential scale (Inferno) by depth.
  function getColor(depth: number): string {
    const t = depthRange.max > depthRange.min ? (depth - depthRange.min) / (depthRange.max - depthRange.min) : 0;
    return interpolateInferno(t);
  }

  function truncate(name: string, maxLen = 22): string {
    return name.length > maxLen ? name.substring(0, maxLen - 1) + '…' : name;
  }

  function formatValue(v: number): string {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
    return String(Math.round(v));
  }

  function canShowCenter(rect: TreemapRect): boolean {
    return Math.min(rect.width, rect.height) > 40;
  }
</script>

<div class="container">
  <svg width={containerSize} height={containerSize} viewBox="0 0 {containerSize} {containerSize}">
    {#each visibleRects as rect (rect.name + rect.x + rect.y + rect.depth)}
      <g>
        <title>{rect.name} · {rect.value}</title>
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill={getColor(rect.depth)}
          stroke="none"
          opacity="0.95"
        />
      </g>
    {/each}
    {#each visibleRects as rect (rect.name + rect.x + rect.y + rect.depth + '-label')}
      {#if rect.hasLabel}
        <text
          x={rect.x + rect.width / 2}
          y={rect.y + 12}
          text-anchor="middle"
          font-size="12"
          font-weight="700"
          fill="#fff"
          pointer-events="none"
        >
          {truncate(rect.name)}
        </text>
      {:else if canShowCenter(rect)}
        <text
          x={rect.x + rect.width / 2}
          y={rect.y + rect.height / 2}
          text-anchor="middle"
          font-size="11"
          fill="#fff"
          pointer-events="none"
        >
          <tspan x={rect.x + rect.width / 2} dy="-0.3em" font-weight="600">{truncate(rect.name)}</tspan>
          {#if showValues}
            <tspan x={rect.x + rect.width / 2} dy="1.3em" font-size="9" opacity="0.9">{formatValue(rect.value)}</tspan>
          {/if}
        </text>
      {/if}
    {/each}
  </svg>
</div>

<style>
  .container {
    max-width: 100%;
    overflow: hidden;
  }

  svg {
    width: 100%;
    height: auto;
    display: block;
  }

  text {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  }
</style>
