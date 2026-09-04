<script lang="ts">
  import { TreemapRect } from '$lib/types';
  import { interpolateViridis } from 'd3-scale-chromatic';

  export let rects: TreemapRect[] = [];
  export let minSize: number = 20;
  export let containerSize: number = 1000;

  // Compute depth range for color gradient
  $: depthRange = {
    min: Math.min(...rects.map((r) => r.depth), 0),
    max: Math.max(...rects.map((r) => r.depth), 1),
  };

  // Filter rects by minSize
  $: visibleRects = rects.filter((r) => r.width >= minSize || r.height >= minSize);

  // Color based on depth using viridis gradient
  function getColor(depth: number): string {
    const normalized = depthRange.max > depthRange.min 
      ? (depth - depthRange.min) / (depthRange.max - depthRange.min)
      : 0;
    return interpolateViridis(normalized);
  }

  // Truncate long names for label display
  function truncateName(name: string, maxLen: number = 20): string {
    if (name.length > maxLen) {
      return name.substring(0, maxLen - 2) + '…';
    }
    return name;
  }

  // Determine if we should show text inside the rect
  function shouldShowLabel(rect: TreemapRect): boolean {
    const minDim = Math.min(rect.width, rect.height);
    return minDim > 40 && !rect.hasLabel;
  }
</script>

<div class="relative bg-gray-100 border-2 border-gray-300 rounded" style="width: {containerSize}px; height: {containerSize}px;">
  <svg width={containerSize} height={containerSize} viewBox="0 0 {containerSize} {containerSize}" class="w-full h-full">
    <!-- Draw rectangles with borders and labels -->
    {#each visibleRects as rect (rect.name + rect.x + rect.y)}
      <g>
        <!-- Rectangle -->
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill={getColor(rect.depth)}
          stroke="#fff"
          stroke-width="2"
          opacity="0.9"
          class="transition-opacity hover:opacity-100 cursor-pointer"
        />
        
        <!-- Label (if space allows and not a labeled folder) -->
        {#if shouldShowLabel(rect)}
          <text
            x={rect.x + rect.width / 2}
            y={rect.y + rect.height / 2}
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="12"
            font-weight="500"
            fill="#fff"
            pointer-events="none"
            class="select-none text-shadow"
          >
            {truncateName(rect.name)}
          </text>
        {/if}

        <!-- Folder label (top-left, if labeled) -->
        {#if rect.hasLabel}
          <text
            x={rect.x + 4}
            y={rect.y + 18}
            font-size="14"
            font-weight="700"
            fill="#fff"
            pointer-events="none"
            class="select-none text-shadow"
          >
            {truncateName(rect.name)}
          </text>
        {/if}
      </g>
    {/each}
  </svg>
</div>
