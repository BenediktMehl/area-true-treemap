<script lang="ts">
  import type { TreemapRect } from 'improved-treemap';

  export let rects: TreemapRect[] = [];
  export let containerSize = 1000;
  export let minSize = 8;

  $: depthRange = {
    min: Math.min(...rects.map((r) => r.depth), 0),
    max: Math.max(...rects.map((r) => r.depth), 1),
  };

  $: visibleRects = rects.filter((r) => r.width >= minSize || r.height >= minSize);

  // Simple, dependency-free depth-based color scale (blue → purple).
  function getColor(depth: number): string {
    const t = depthRange.max > depthRange.min ? (depth - depthRange.min) / (depthRange.max - depthRange.min) : 0;
    const hue = 210 + t * 90;
    const lightness = 58 - t * 22;
    return `hsl(${hue}, 65%, ${lightness}%)`;
  }

  function truncateName(name: string, maxLen = 22): string {
    return name.length > maxLen ? name.substring(0, maxLen - 1) + '…' : name;
  }

  function shouldShowLabel(rect: TreemapRect): boolean {
    return Math.min(rect.width, rect.height) > 40;
  }
</script>

<div class="container">
  <svg width={containerSize} height={containerSize} viewBox="0 0 {containerSize} {containerSize}">
    {#each visibleRects as rect (rect.name + rect.x + rect.y)}
      <g>
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill={getColor(rect.depth)}
          stroke="#ffffff"
          stroke-width="2"
          opacity="0.92"
        />
        {#if rect.hasLabel}
          <text x={rect.x + 4} y={rect.y + 18} font-size="14" font-weight="700" fill="#fff" pointer-events="none">
            {truncateName(rect.name)}
          </text>
        {:else if shouldShowLabel(rect)}
          <text
            x={rect.x + rect.width / 2}
            y={rect.y + rect.height / 2}
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="12"
            font-weight="500"
            fill="#fff"
            pointer-events="none"
          >
            {truncateName(rect.name)}
          </text>
        {/if}
      </g>
    {/each}
  </svg>
</div>

<style>
  .container {
    max-width: 100%;
    overflow: hidden;
    border-radius: 8px;
  }

  svg {
    width: 100%;
    height: auto;
    display: block;
  }

  text {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
  }
</style>
