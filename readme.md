# area-true-treemap

> Area-true squarified treemap layout with configurable gaps between nodes — a drop-in replacement for
> d3-hierarchy's `treemap()` that does not lose nodes to its own padding.

<p align="center">
  <a href="https://benediktmehl.github.io/area-true-treemap/">
    <img src="https://img.shields.io/badge/Live%20Demo-%E2%96%B6%20Open-brightgreen?style=for-the-badge&logo=github" alt="Live Demo" />
  </a>
</p>

Live demo (area-true vs. d3, side by side, with all settings):
<https://benediktmehl.github.io/area-true-treemap/>

**The difference in one sentence:** `d3.treemap()` pays for its padding by **shrinking every rectangle**, so a
node smaller than the gap collapses to zero area and disappears from the picture. This library pays for the gap
by **growing the node values during the layout**, so the gap costs the map — never the smallest node.

`area-true-treemap` is a dependency-free TypeScript library implementing the **improved squarify algorithm**
from the master thesis
[Vergleich und Optimierung von 3D-Visualisierungen für die Darstellung von Software-Qualitätsmetriken](https://github.com/BenediktMehl/master-thesis/blob/main/thesis.pdf)
(a faithful port of CodeCharta's `squarifyLayoutImproved`). It ships a **d3-hierarchy-compatible API**
(`hierarchy()` + `treemap()`), so a consumer that already lays out a treemap with d3 swaps one import and
keeps everything else: renderer, traversal, data layer.

## Why this instead of `d3.treemap()`?

Both libraries lay out a squarified treemap and write the same `x0/y0/x1/y1` onto your nodes. The difference
is *who pays for the gap* — everything else follows from it.

### The two mechanisms

**d3 cuts the gap out of the rectangles.** `padding()` shrinks the parent box, the children tile what is left,
and every child is inset again when it becomes a parent:

```js
// what d3.treemap() does with padding, simplified
const inner = [x0 + pad, y0 + pad, x1 - pad, y1 - pad];  // paddingTop/Right/Bottom/Left
tile(parent, ...inner);                                   // children tile the shrunken box
```

So a node whose value share is smaller than the gap ends up with width or height `0`: it is still in your
tree, but it is gone from the picture. And because `pad` is a **pixel** value, the same configuration behaves
differently on a 400 px thumbnail and on a 4K canvas.

**area-true-treemap lets the values pay.** The gap is built **into** the layout instead of subtracted
afterwards — three steps, that is the whole idea (`src/algorithm/engine.ts`):

```ts
squarify(root, 0, false, …);       // 1) plain squarify without gap/labels → estimates where every node sits
increaseValues(root, margin, …);   // 2) grow each value by the area its margins / label strip will consume
squarify(root, margin, …, true);   // 3) lay out again with the real gap → the remaining boxes stay proportional
```

The gap therefore comes out of the map, not out of the smallest node, and it is a **fraction of the map width**
(`margin(0.02)` = 2 %), so one configuration is right at every canvas size.

### Side by side

| | `d3.treemap()` | `area-true-treemap` |
| --- | --- | --- |
| How the gap is realized | insetting every rectangle (`padding()`, `paddingInner()`, `paddingOuter()`) | growing node values, then a second layout pass with the real gap |
| Who pays for the gap | the smallest nodes — below the gap size they collapse to area `0` | the map; every node keeps its proportional area |
| Gap unit | pixels | fraction of `size()[0]` (`4 / width` is still exactly 4 px) |
| Where gaps appear | around every parent (`padding`/`paddingOuter`) and between all siblings (`paddingInner`) | parent↔children, between siblings, or **only between leaves** (`siblingMarginLeavesOnly`) |
| Label strips | hand-rolled `paddingTop(fn)` plus patched padding | `floorLabels(n)` + `labelLength(x)`; the strip *replaces* the top gap |
| Single-child folder chains | your own preprocessing | `collapseFolders(true)` |
| Children stay inside their parent | implied by the padding, paid for with area | `scale(true)` rescales in the final pass |
| Tiling | six tilings (`slice`, `dice`, `binary`, `sliceDice`, `squarify`, `resquarify`) | squarified with the golden-ratio target (1.618) |
| Zero-area nodes | possible at any gap | impossible by construction |

### Measured, at the same realized gap

Both layouts get the **same data, same canvas and the same realized gap** — the d3 panel is handed the gap and
label strip the area-true layout actually produced, exactly like the demo and `npm run benchmark` do.
`flare`, 220 leaves, 400×400, descending sort, folder chains collapsed, label strip on the top 3 levels; values
are **area-true · d3**:

| Metric | 1 % gap, no sibling gaps (thesis recommendation) | 1 % gap, sibling gaps | 3 % gap, sibling gaps |
| --- | --- | --- | --- |
| **Missing leaves** (visibility) | 0 · 0 | **0** · 4 | **6** · 67 |
| Value proportionality (CV) | **0.210** · 0.262 | **0.285** · 0.490 | 0.846 · **0.759** |
| Median aspect ratio | **1.72** · 1.77 | **1.96** · 2.05 | 2.35 · **1.90** |
| Space utilization | 65.3 % · 66.5 % | 52.8 % · 54.4 % | 23.9 % · 29.6 % |
| Compute time | 0.219 ms · 0.068 ms | 0.126 ms · 0.055 ms | 0.094 ms · 0.056 ms |

Bold marks the better value (space utilization has no better or worse — it only has to be similar so the other
numbers are comparable at all).

The headline is the missing-leaves row: **as soon as siblings are separated — which is how d3 draws a treemap by
default — its padding starts deleting nodes**, 67 of 220 at a 3 % gap and 4 of 220 at 1 %, while the area-true
layout realizes the same gap and keeps them. With larger maps the absolute numbers grow: `junit4` (625 leaves,
1000×1000) loses 226 leaves with d3 and 178 with this library at a 1 % sibling gap, 445 vs. 355 at 3 %. That is
not a rendering trick — same SVG, same rectangles, just rectangles that did not lose their area to the padding.

![Median number of nodes without area over the relative gap — improved squarify vs. d3.js nested treemap](./docs/img/missing-nodes-vs-d3.png)

*Missing nodes (y) over the relative gap in percent (x), median across the 70 software projects evaluated in the
[master thesis](https://github.com/BenediktMehl/master-thesis). `Verbesserter Squarify-Algorithmus` is this
library, `d3.js - Nested Treemap mit Beschriftung` is the d3 panel: d3 already loses ~200 nodes without any gap
at all, this library only reaches that level at a gap of ~2 %. The thesis figures used here are copied into
[`docs/img/`](./docs/img).*

Reproduce it yourself:

```bash
npm install && npm run benchmark
```

### What it costs

The trade-offs, because the picture is not one-sided:

- **Compute time** is roughly 2–3× a plain d3 squarify (0.22 ms vs. 0.07 ms for flare at 400×400). Both are far
  below a frame budget, and the layout does not re-run per frame.
- **Above ~3 % gap** the treemap problem dominates and both layouts degrade (the thesis recommends 0.5–3 %). The
  area-true layout keeps small nodes alive as sub-pixel slivers, which shows up in the *mean* aspect ratio
  (median stays good).
- **Sibling gaps are the expensive feature** on both sides. `applySiblingMargin(true)` shrinks rectangles after
  the layout and is the same failure mode as d3's `paddingInner` — it just hits far less often. The thesis
  recommends *no* sibling gaps and outlines instead.
- **Small canvas, huge map**: if a leaf's value share is below one pixel, no algorithm can show it. At 1000×1000
  both libraries lose the same number of leaves on `junit4` at a 1 % gap without sibling gaps (163 vs. 163) —
  that is a resolution limit, not an algorithm property.
- **Only one tiling**: slice-and-dice, binary, `sliceDice` and `treemapResquarify` (stable re-layouts for
  animated transitions) are not implemented. If you need those, keep d3 for that view.

Full guide with the complete option mapping, all measured configurations and every trade-off:
**[docs/porting-from-d3-hierarchy.md](./docs/porting-from-d3-hierarchy.md)**.

## Features

- **d3-style API**: wrap your tree with `hierarchy()`, configure the layout with a chainable `treemap()` and
  call it — the tree gets `x0/x1/y0/y1` in place, exactly like `d3.treemap()`.
- **Area-true**: proportional node areas; the gap is paid for by the layout, not by the smallest node.
- **Multi-pass squarify**: 1 pass = plain squarify baseline, 2+ passes = the area-true layout in which margins
  and labels take effect.
- **Margins between nodes** — between all siblings, only between leaves, or off.
- **Floor labels** on the top N folder levels, fixed-size or CodeCharta-style variable per-folder sizing.
- Configurable **sorting** (none / ascending / descending / middle) and **row order across passes**.
- CodeCharta options **scale**, **simple increase values** and **increment margin** exposed as chainable setters.
- Collapsing of single-child folder chains, optional integer rounding.
- Zero runtime dependencies, tree-shakeable, ships ESM + CJS + TypeScript types.

## Installation

```bash
npm install area-true-treemap
```

## Quick start

```ts
import { hierarchy, treemap, SortingOption } from "area-true-treemap";

const data = {
  name: "root",
  children: [
    {
      name: "src",
      children: [
        { name: "index.ts", attributes: { size: 1200 } },
        { name: "layout.ts", attributes: { size: 800 } },
      ],
    },
    { name: "README.md", attributes: { size: 300 } },
  ],
};

// 1) Wrap the tree and set the area values (like d3-hierarchy).
const root = hierarchy(data).sum((d) => (!d.children || d.children.length === 0 ? d.attributes?.size ?? 0 : 0));

// 2) Configure the layout and run it - it mutates the wrapped tree in place.
treemap()
  .size([1000, 1000])     // output coordinates
  .numberOfPasses(2)      // area-true two-pass layout
  .margin(0.01)           // gap: 1 % of the map width
  .applySiblingMargin(false)  // thesis recommendation: no gaps between siblings
  .floorLabels(2)         // label strips on the top 2 folder levels
  .labelLength(0.03)      // strip size: 3 % of the map width
  .collapseFolders(true)  // merge single-child folder chains
  .sorting(SortingOption.DESCENDING)(root);

for (const node of root.descendants()) {
  // node.x0, node.x1, node.y0, node.y1 -> rectangle in the units of size()
  // node.data                            -> your original node
  // node.depth, node.children, node.value
}
```

The layout returns the same root and — exactly like `d3.treemap` — writes the coordinates onto every node
(leaves and folders); your data stays untouched on `node.data` and `node.value` is not modified. The root
rectangle always covers the whole requested `size()`.

## Coming from d3-hierarchy

The integration shape is identical — swap the import and replace d3's padding calls with `margin()`:

```diff
- import { hierarchy, treemap } from "d3-hierarchy";
+ import { hierarchy, treemap } from "area-true-treemap";

  const root = hierarchy(map).sum((node) => calculateAreaValue(node));
- treemap().size([width, height]).padding(2).paddingInner(2).paddingOuter(2)(root);
+ treemap().size([width, height]).margin(2 / width).applySiblingMargin(true)(root);
```

| d3-hierarchy | area-true-treemap |
| --- | --- |
| `padding(px)`, `paddingOuter(px)` | `margin(fraction)` — fraction of `size()[0]`, e.g. `4 / width` |
| `paddingInner(px)` | `applySiblingMargin(true)`, or `siblingMarginLeavesOnly(true)` for gaps only between files |
| `paddingTop(fn)` for label strips | `floorLabels(n)` + `labelLength(x)` (the strip *replaces* the top margin) |
| `root.sort(...)` | `sorting(SortingOption.DESCENDING)` |
| `round(true)` | `round(true)` |
| `tile(d3.treemapSquarify)` | built in (golden-ratio target 1.618); no `.tile()` setter |
| `node.copy()` | not available — rebuild with `hierarchy(data)` |

Everything else stays: `hierarchy(data, children)` with `.sum()` / `.count()` / `.sort()`, in-place mutation,
`x0/y0/x1/y1` on every node, and the traversal helpers (`each*`, `descendants`, `leaves`, `links`, `path`,
`ancestors`, `find`, iteration).

Full guide — the complete option mapping, all measured configurations and when *not* to switch:
**[docs/porting-from-d3-hierarchy.md](./docs/porting-from-d3-hierarchy.md)**.

## Input data & values

Any node type works — pass a `children` accessor if your tree uses another shape:

```ts
const root = hierarchy(myNode, (node) => node.kids).sum((node) => node.metric ?? 0);
```

- `.sum(accessor)` works like d3: a node's `value` is `accessor(node.data)` plus the sum of its children. For
  datasets where only leaves carry the metric, return `0` for folders (see Quick start) — then folders
  aggregate bottom-up.
- Nodes without a positive value are omitted from the layout (their coordinates stay `undefined`).
- Alternatively set the accessor on the layout: `treemap().value((d) => area(d))(root)`.

## Layout options

```ts
const layout = treemap()
  .size([1000, 1000])              // default [1000, 1000]
  .numberOfPasses(2)               // default 2
  .margin(0.01)                    // gap as a fraction of the map width (default 0.02)
  .applySiblingMargin(false)       // default true (CodeCharta-compatible)
  .siblingMarginLeavesOnly(false)  // default false
  .floorLabels(2)                  // top levels that get a label strip, 0 = off (default 2)
  .labelLength(0.03)               // number = fraction of the map width, or a per-node function
  .sorting(SortingOption.DESCENDING)
  .order(OrderOption.NEW_ORDER)
  .collapseFolders(false)
  .scale(true)                     // CodeCharta "Apply Scaling" (default true)
  .simpleIncreaseValues(false)
  .incrementMargin(false)
  .round(false);
```

| Method | Type | Default | Description |
| --- | --- | --- | --- |
| `size([w, h])` / `size(w, h)` | `number` | `1000x1000` | Output size; the root covers exactly this area. |
| `value(accessor)` | `(data) => number` | - | Area accessor; replaces an explicit `.sum()` on the hierarchy. |
| `numberOfPasses(n)` | `number` | `2` | 1 = plain squarify baseline, 2+ = area-true multi-pass layout. |
| `margin(fraction)` | `number` (0..1) | `0.02` | Target gap between a folder and its children, as a fraction of `size()[0]`. |
| `applySiblingMargin(value)` | `boolean` | `true` | Also separate siblings (not just parent and children). |
| `siblingMarginLeavesOnly(value)` | `boolean` | `false` | Shrink only leaves, so gaps appear only between leaves. |
| `floorLabels(topLevels)` | `number` | `2` | Reserve a label strip on the top N folder levels (root counts, 0 = off). |
| `labelLength(value)` | `number \| (node) => number` | `0.03` | Strip size: fraction of the map width, or a per-folder function in `size()` units. |
| `sorting(option)` | `SortingOption` | `DESCENDING` | `NONE`, `ASCENDING`, `DESCENDING`, `MIDDLE`. |
| `order(option)` | `OrderOption` | `NEW_ORDER` | `NEW_ORDER`, `KEEP_ORDER`, `KEEP_PLACE`. |
| `collapseFolders(value)` | `boolean` | `false` | Merge single-child folder chains (folded nodes share a rectangle). |
| `scale(value)` | `boolean` | `true` | Rescale children onto the available parent area in the final pass (keeps layouts valid). |
| `simpleIncreaseValues(value)` | `boolean` | `false` | Simpler absolute size adjustment between the passes. |
| `incrementMargin(value)` | `boolean` | `false` | Increase the margin gradually across passes (>2 passes). |
| `round(value)` | `boolean` | `false` | Round all coordinates to integers. |

All setters validate their input and throw on invalid values.

### Settings explained

- **margin / applySiblingMargin** — the core "gap" feature. The thesis recommends a gap of 0.5–3 % and *no*
  sibling gaps (use outlines instead); sibling gaps shrink rectangles after the layout, which is the same
  failure mode as d3's `paddingInner`, just much rarer. Above ~3 % the treemap problem dominates for both
  libraries.
- **numberOfPasses** — 1 lays out the pure squarify baseline (margin and labels stay inert), 2 is the
  recommended area-true layout: the first pass estimates the layout, the second one increases the values to
  make room for margins and labels and rescales the children onto the available area.
- **floorLabels / labelLength** — the top folder levels reserve a label strip; larger strips mean larger text
  but less leaf area. The library reserves the strip — you still draw the text (a folder with a label draws it
  at the top of its rectangle, its children start below the strip).
- **collapseFolders** — merging single-child folder chains was the biggest single win for node visibility in
  the thesis evaluation; it is off by default for compatibility.
- **scale** — rescaling the children in the final pass keeps layouts valid (nodes stay inside their parent).
  Turning it off reproduces CodeCharta's invalid-layout comparison.
- **sorting / order** — sibling order and how rows are placed in the later passes.

### Variable floor labels (CodeCharta style)

Pass a function to `labelLength` for variable, per-folder strips — for example CodeCharta's own formula:

```ts
import { treemap, getFloorLabelPadding, DEFAULT_FLOOR_LABEL_CONFIG } from "area-true-treemap";

treemap()
  .floorLabels(3)
  .labelLength((node) => getFloorLabelPadding(node.x1 - node.x0, node.depth, DEFAULT_FLOOR_LABEL_CONFIG))
  (root);
```

The resolver receives the internal layout node in `size()` units (`x0/x1/y0/y1`, `depth`, `name`) and returns
the strip thickness in the same units.

## API

```ts
function hierarchy<T>(data: T, children?: (node: T) => T[] | undefined): HierarchyNode<T>;
function treemap<T>(): Treemap<T>;              // callable, chainable layout
```

The wrapped nodes expose the d3-hierarchy surface: `data`, `depth`, `height`, `parent`, `children`,
`value`, `x0/y0/x1/y1`, the traversal helpers (`each`, `eachBefore`, `eachAfter`, `descendants`, `leaves`,
`links`, `path`, `ancestors`, `find`, `sum`, `count`, `sort`) and iteration.

Exported symbols: `hierarchy`, `treemap`, `HierarchyNode`, `HierarchyLink`, `HierarchyChildrenAccessor`,
`Treemap`, `AreaValue`, `SortingOption`, `OrderOption`, `LabelLength`, `LabelSizeResolver`, `SquarifyNode`,
`FloorLabelConfig`, `DEFAULT_FLOOR_LABEL_CONFIG`, `getFloorLabelPadding`.

## Demo

An interactive demo (Svelte) is included in [`demo/`](./demo). It renders the **Area-True Treemap** (this
library) and a **d3.js Nested Treemap** side by side and compares them using the evaluation metrics defined in
the thesis (node visibility, value proportionality, aspect ratio, space utilization, and computation time).
Both layouts are driven by the same settings, and the d3 panel is given the gap/label strip the area-true
layout actually realized, so the metrics are comparable. The page opens with a short explanation of the
mechanism difference described [above](#why-this-instead-of-d3treemap), aimed at the *Missing nodes* row of the
metrics table.

By default the demo loads the real-world **flare** dataset. A small synthetic example and a set of real
CodeCharta maps (**JUnit 4**, **JUnit 5**, **httpd**, **Apache OpenOffice**, **NetBeans** — raw `cc.json`
files from the [CodeCharta showcase](https://github.com/MaibornWolff/codecharta), loaded on demand) can be
selected via the *Sample data* dropdown, and CodeCharta `cc.json` exports (1.x and 2.0) or any JSON file can
be loaded as well. The UI is available in German and English.

```bash
npm install
npm run dev:demo      # starts the demo on http://localhost:5174
```

Live version: <https://benediktmehl.github.io/area-true-treemap/>

## Benchmark

The comparison quoted above is reproducible:

```bash
npm run benchmark     # flare, 400x400, markdown tables
node benchmarks/d3-vs-area-true.mjs --size 1000
node benchmarks/d3-vs-area-true.mjs --data demo/public/data/ccjson/junit4_2019-10-26.cc.json --metric rloc
```

### Value proportionality: how area-true the layout really is

The other half of the name is *value proportionality*: how proportional a node's drawn area is to the value it
represents, measured as the coefficient of variation of the area/value ratio, where 0 is perfect. It is the row
**Value proportionality** in the demo's live metrics table.

![Median coefficient of variation of the value–area ratio over the realized relative gap — improved squarify vs. d3.js nested treemap](./docs/img/value-proportionality-vs-d3.png)

*The thesis' Wertproportionalität (y) — the coefficient of variation of the area/value ratio — over the realized
relative gap (x), median across the 70 projects evaluated there. The thesis summarises this figure as values "um
den Faktor von etwa 2,5 besser", i.e. roughly 2.5× better than the d3.js nested treemap: the layout stays
area-true while it realizes its gap. The same metric is the **Value proportionality** row of the live demo table
and of the benchmark above (figure from the thesis, see [`docs/img/`](./docs/img)).*

## Development

```bash
npm install           # install all workspaces
npm run build         # build the library (ESM + CJS + types)
npm test              # build + run the test suite
npm run typecheck     # type-check the library
```

## License

BSD-3-Clause. See [LICENSE](./LICENSE).
