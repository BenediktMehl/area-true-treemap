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

`area-true-treemap` is a dependency-free TypeScript library implementing the **improved squarify algorithm**
from the master thesis
[Vergleich und Optimierung von 3D-Visualisierungen für die Darstellung von Software-Qualitätsmetriken](https://github.com/BenediktMehl/master-thesis/blob/main/thesis.pdf)
(a faithful port of CodeCharta's `squarifyLayoutImproved`).

It ships a **d3-hierarchy-compatible API** (`hierarchy()` + `treemap()`), so a consumer that already lays out
a treemap with d3 swaps one import and keeps everything else — renderer, traversal, data layer. The layout
itself is different: the gap is realized **during** the layout by growing the node values, instead of insetting
every rectangle afterwards. That is why gaps do not make nodes collapse to zero area the way d3's `padding`
does.

## Why not just `d3.treemap().padding()`?

- **The gap stops eating the smallest nodes.** d3 subtracts the padding from every rectangle, so a node smaller
  than the padding disappears. The area-true layout inflates the values so the requested gap fits; at equal
  realized gaps it loses roughly an order of magnitude fewer leaves (measured: 6 vs. 67 on the flare dataset at
  a 3 % gap, 0 vs. 4 at 1 %).
- **Gaps are relative, not pixels.** `margin(0.02)` means 2 % of the map width, so one configuration is
  correct on a thumbnail and on a 4K canvas.
- **Labels, sibling-gap modes and folder collapsing are part of the layout** (`floorLabels`, `labelLength`,
  `siblingMarginLeavesOnly`, `collapseFolders`) instead of glue code around it.

The details, the option-by-option mapping, the measured comparison and the honest trade-offs are in
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

Full guide — including what the algorithm does differently, the complete option mapping, the measured
comparison and when *not* to switch: **[docs/porting-from-d3-hierarchy.md](./docs/porting-from-d3-hierarchy.md)**.

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
layout actually realized, so the metrics are comparable.

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

## Development

```bash
npm install           # install all workspaces
npm run build         # build the library (ESM + CJS + types)
npm test              # build + run the test suite
npm run typecheck     # type-check the library
```

## License

BSD-3-Clause. See [LICENSE](./LICENSE).
