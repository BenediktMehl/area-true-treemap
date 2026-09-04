<script lang="ts">
  import type { TreemapRect } from 'improved-treemap';
  import { LabelPosition } from 'improved-treemap';

  export let rects: TreemapRect[] = [];
  export let containerSize = 1000;
  export let minSize = 8;
  export let labelPosition: LabelPosition = LabelPosition.TOP;
  export let showValues = true;

  $: depthRange = {
    min: Math.min(...rects.map((r) => r.depth), 0),
    max: Math.max(...rects.map((r) => r.depth), 1),
  };

  $: visibleRects = rects.filter((r) => r.width >= minSize || r.height >= minSize);

  // Vivid depth-based color scale (blue → purple → magenta → red) so it pops
  // against the neutral page background.
  function getColor(depth: number): string {
    const t = depthRange.max > depthRange.min ? (depth - depthRange.min) / (depthRange.max - depthRange.min) : 0;
    const hue = 250 - t * 250;
    return `hsl(${hue}, 72%, 55%)`;
  }

  function truncate(name: string, maxLen = 24): string {
    return name.length > maxLen ? name.substring(0, maxLen - 1) + '…' : name;
  }

  function formatValue(v: number): string {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
    return String(Math.round(v));
  }

  function canShowCenter(rect: TreemapRect): boolean {
    return Math.min(rect.width, rect.height) > 44;
  }

  // Label anchor point and rotation depending on the configured position.
  function labelTransform(rect: TreemapRect): { x: number; y: number; anchor: string; rotate: number } {
    switch (labelPosition) {
      case LabelPosition.BOTTOM:
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height - 10, anchor: 'middle', rotate: 0 };
      case LabelPosition.LEFT:
        return { x: rect.x + 12, y: rect.y + rect.height / 2, anchor: 'middle', rotate: -90 };
      case LabelPosition.RIGHT:
        return { x: rect.x + rect.width - 12, y: rect.y + rect.height / 2, anchor: 'middle', rotate: 90 };
      case LabelPosition.TOP:
      default:
        return { x: rect.x + rect.width / 2, y: rect.y + 16, anchor: 'middle', rotate: 0 };
    }
  }
</script>

<div class="container">
  <svg width={containerSize} height={containerSize} viewBox="0 0 {containerSize} {containerSize}">
    {#each visibleRects as rect (rect.name + rect.x + rect.y)}
      <g>
        <title>{rect.name} · {rect.value}</title>
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill={getColor(rect.depth)}
          stroke="#ffffff"
          stroke-width="1.5"
          opacity="0.94"
        />
        {#if rect.hasLabel}
          {@const l = labelTransform(rect)}
          <text
            x={l.x}
            y={l.y}
            text-anchor={l.anchor}
            font-size="13"
            font-weight="700"
            fill="#fff"
            pointer-events="none"
            transform={l.rotate ? `rotate(${l.rotate} ${l.x} ${l.y})` : undefined}
          >
            {truncate(rect.name)}
          </text>
        {:else if canShowCenter(rect)}
          <text
            x={rect.x + rect.width / 2}
            y={rect.y + rect.height / 2}
            text-anchor="middle"
            font-size="12"
            fill="#fff"
            pointer-events="none"
          >
            <tspan x={rect.x + rect.width / 2} dy="-0.3em" font-weight="600">{truncate(rect.name)}</tspan>
            {#if showValues}
              <tspan x={rect.x + rect.width / 2} dy="1.3em" font-size="10" opacity="0.85">{formatValue(rect.value)}</tspan>
            {/if}
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
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
  }
</style>
