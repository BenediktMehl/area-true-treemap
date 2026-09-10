<script lang="ts" context="module">
  // Module-level so every component instance gets its own id namespace - both
  // treemap panels live in the same document and share the clipPath id space.
  let uidCounter = 0;
</script>

<script lang="ts">
  import type { TreemapRect } from '$lib/types';
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

  function formatValue(v: number): string {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
    return String(Math.round(v));
  }

  // ---------------------------------------------------------------------------
  // Text placement.
  //
  // A name is drawn *only* where the layout actually reserved a strip for it
  // (`hasLabel`), never for arbitrary nodes: a name squeezed into a node that
  // has no room for it would spill over its neighbours or cover their names.
  // The strip is the band between a folder's top edge and its topmost child
  // (the strip replaces the top margin there), the text is sized to fit that
  // band and truncated to the folder's width, so it can neither overflow its
  // rectangle nor collide with another label.
  // ---------------------------------------------------------------------------
  const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  const NAME_FONT_MAX = 12; // never larger than before
  const NAME_FONT_MIN = 4.5; // below this a strip carries no readable text at all
  const NAME_FONT_FIT = 0.95; // name size as a fraction of the reserved strip
  const VALUE_FONT = 9;
  const PAD_X = 4;
  const ELLIPSIS = '…';

  /** Ink box of a text: what the glyphs themselves cover, not the em box. */
  interface Ink {
    width: number;
    ascent: number;
    descent: number;
  }

  let measureCtx: CanvasRenderingContext2D | null | undefined;

  /**
   * Measure with the very font the SVG renders with, so the placement is based
   * on real glyph metrics instead of assumed ratios (fonts differ noticeably in
   * how far ascenders and descenders reach).
   */
  function measureInk(text: string, fontSize: number, bold: boolean): Ink {
    if (measureCtx === undefined) {
      measureCtx = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    }
    // Rough fallback when no DOM is around (e.g. prerendering).
    if (!measureCtx) return { width: text.length * fontSize * 0.6, ascent: fontSize * 0.78, descent: fontSize * 0.22 };
    measureCtx.font = `${bold ? 700 : 400} ${fontSize}px ${FONT_FAMILY}`;
    const m = measureCtx.measureText(text);
    return {
      width: m.width,
      ascent: m.actualBoundingBoxAscent || fontSize * 0.78,
      descent: m.actualBoundingBoxDescent || fontSize * 0.22,
    };
  }

  function textWidth(text: string, fontSize: number, bold: boolean): number {
    return measureInk(text, fontSize, bold).width;
  }

  /** Longest prefix of `name` (with an ellipsis) that fits into `maxWidth`. */
  function fitText(name: string, maxWidth: number, fontSize: number, bold: boolean): string {
    if (textWidth(name, fontSize, bold) <= maxWidth) return name;
    let lo = 0;
    let hi = name.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (textWidth(name.slice(0, mid) + ELLIPSIS, fontSize, bold) <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return lo > 0 ? name.slice(0, lo) + ELLIPSIS : '';
  }

  /**
   * Height of the strip the layout reserved for each folder's name: the band
   * between the folder's top edge and its topmost drawn child. Rects arrive in
   * pre-order, so a stack walk recovers the parent/child relation.
   *
   * Only rectangles that are actually drawn count: a node too small to be
   * rendered leaves no visible pixel behind, so it must not take label space
   * away from its parent either. Folders without a single drawn child are not
   * part of the map at all - they offer their whole rectangle instead.
   */
  function labelStrips(drawn: TreemapRect[]): Map<TreemapRect, number> {
    const strips = new Map<TreemapRect, number>();
    const stack: TreemapRect[] = [];
    for (const rect of drawn) {
      while (stack.length > 0 && stack[stack.length - 1].depth >= rect.depth) stack.pop();
      const parent = stack[stack.length - 1];
      if (parent) {
        const band = rect.y - parent.y;
        const known = strips.get(parent);
        if (known === undefined || band < known) strips.set(parent, band);
      }
      stack.push(rect);
    }
    return strips;
  }

  interface TextLabel {
    key: string;
    text: string;
    fontSize: number;
    bold: boolean;
    x: number;
    y: number;
    clipId: string;
    clip: { x: number; y: number; width: number; height: number };
  }

  // Unique per component instance - both panels live in the same document.
  const uid = `treemap-labels-${uidCounter++}`;

  function reserveLabel(
    index: number,
    prefix: string,
    text: string,
    fontSize: number,
    bold: boolean,
    x: number,
    y: number,
    clip: { x: number; y: number; width: number; height: number },
  ): TextLabel {
    return { key: `${prefix}-${index}`, text, fontSize, bold, x, y, clipId: `${uid}-${prefix}${index}`, clip };
  }

  /**
   * Every folder that carries a label strip gets its name: the strip is exactly
   * the room the layout reserved for it. Only the font size adapts to the
   * height of that strip, so a narrow strip yields a smaller name instead of no
   * name at all - the glyphs still fit the strip and therefore stay off the
   * neighbouring nodes.
   */
  function placeNames(visible: TreemapRect[], strips: Map<TreemapRect, number>): TextLabel[] {
    const labels: TextLabel[] = [];
    let index = 0;
    for (const rect of visible) {
      if (!rect.hasLabel) continue; // no strip was reserved -> no name

      const band = Math.min(strips.get(rect) ?? rect.height, rect.height);
      if (!(band > 0) || !(rect.width > 0)) continue;

      let fontSize = Math.min(NAME_FONT_MAX, band * NAME_FONT_FIT);
      if (fontSize < NAME_FONT_MIN) continue; // strip far too thin for any text

      const maxWidth = rect.width - 2 * PAD_X;
      if (maxWidth <= 0) continue;

      // Keep at least one real character plus the ellipsis: a bare "…" is
      // noise, but "a…" still marks that a folder sits here.
      let text = fitText(rect.name, maxWidth, fontSize, true);
      if (text.length < 2) continue;

      // The strip has to hold the glyphs, not just the em box: a font whose
      // ascenders and descenders reach beyond the strip is shrunk until its ink
      // fits, so no letter is cut off at the clip edge.
      let ink = measureInk(text, fontSize, true);
      if (ink.ascent + ink.descent > band) {
        fontSize *= band / (ink.ascent + ink.descent);
        if (fontSize < NAME_FONT_MIN) continue;
        text = fitText(rect.name, maxWidth, fontSize, true);
        if (text.length < 2) continue;
        ink = measureInk(text, fontSize, true);
      }

      // Centre the ink box in the strip instead of the em box.
      const baseline = rect.y + Math.max(0, (band - (ink.ascent + ink.descent)) / 2) + ink.ascent;

      labels.push(
        reserveLabel(
          index++,
          'n',
          text,
          fontSize,
          true,
          rect.x + rect.width / 2,
          baseline,
          { x: rect.x, y: rect.y, width: rect.width, height: band },
        ),
      );
    }
    return labels;
  }

  /**
   * Values are only drawn inside leaves and only when the number fits the leaf
   * on its own - a value centred in a folder would sit on top of its children.
   */
  function placeValues(visible: TreemapRect[]): TextLabel[] {
    const labels: TextLabel[] = [];
    let index = 0;
    for (const rect of visible) {
      if (!rect.isLeaf || !(rect.value > 0)) continue;

      const text = formatValue(rect.value);
      const maxWidth = rect.width - 2 * PAD_X;
      if (maxWidth <= 0 || rect.height < VALUE_FONT * 1.6) continue;
      if (textWidth(text, VALUE_FONT, false) > maxWidth) continue;

      labels.push(
        reserveLabel(
          index++,
          'v',
          text,
          VALUE_FONT,
          false,
          rect.x + rect.width / 2,
          rect.y + rect.height / 2 + VALUE_FONT * 0.36,
          { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        ),
      );
    }
    return labels;
  }

  $: strips = labelStrips(visibleRects);
  $: nameLabels = placeNames(visibleRects, strips);
  $: valueLabels = showValues ? placeValues(visibleRects) : [];
</script>

<div class="container">
  <svg width={containerSize} height={containerSize} viewBox="0 0 {containerSize} {containerSize}">
    <defs>
      {#each [...valueLabels, ...nameLabels] as label (label.clipId)}
        <clipPath id={label.clipId}>
          <rect x={label.clip.x} y={label.clip.y} width={label.clip.width} height={label.clip.height} />
        </clipPath>
      {/each}
    </defs>
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
    {#each valueLabels as label (label.clipId)}
      <text
        x={label.x}
        y={label.y}
        text-anchor="middle"
        font-family={FONT_FAMILY}
        font-size={label.fontSize}
        font-weight={label.bold ? 700 : 400}
        fill="#fff"
        opacity="0.9"
        clip-path="url(#{label.clipId})"
        pointer-events="none"
      >{label.text}</text>
    {/each}
    {#each nameLabels as label (label.clipId)}
      <text
        x={label.x}
        y={label.y}
        text-anchor="middle"
        font-family={FONT_FAMILY}
        font-size={label.fontSize}
        font-weight={label.bold ? 700 : 400}
        fill="#fff"
        clip-path="url(#{label.clipId})"
        pointer-events="none"
      >{label.text}</text>
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
