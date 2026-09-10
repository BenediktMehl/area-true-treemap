# area-true-treemap

> Area-true squarified treemap layout with configurable gaps between nodes - without losing any node.

<p align="center">
  <a href="https://benediktmehl.github.io/area-true-treemap/">
    <img src="https://img.shields.io/badge/Live%20Demo-%E2%96%B6%20Open-brightgreen?style=for-the-badge&logo=github" alt="Live Demo" />
  </a>
</p>

Live-Demo: https://benediktmehl.github.io/area-true-treemap/

`area-true-treemap` is a dependency-free TypeScript library implementing the **improved squarify algorithm** from the master thesis [Vergleich und Optimierung von 3D-Visualisierungen für die Darstellung von Software-Qualitätsmetriken](https://github.com/BenediktMehl/master-thesis/blob/main/thesis.pdf).

It ships a **d3-hierarchy-compatible API** (`hierarchy()` + `treemap()`) so it can be dropped into consumers that already lay out treemaps with d3 (e.g. CodeCharta). Unlike a plain squarify that merely insets rectangles, the margin is realized **during the layout**, so gaps never make a node collapse to zero area.

## Features

- **d3-style API**: wrap your tree with `hierarchy()`, configure the layout with a chainable `treemap()` and call it - the tree gets `x0/x1/y0/y1` in place.
- **Area-true**: proportional node areas, no node vanishes.
- **Multi-pass squarify**: 1 pass = plain squarify baseline, 2+ passes = the area-true layout where margins and labels take effect.
- **Margins between nodes** - between all siblings or only between leaves.
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
  .margin(0.02)           // gap: ~2 % of the map size
  .floorLabels(2)         // label strips on the top 2 folder levels
  .labelLength(0.03)      // strip size: 3 % of the map size
  .sorting(SortingOption.DESCENDING)(root);

for (const node of root.descendants()) {
  // node.x0, node.x1, node.y0, node.y1 -> rectangle in the units of size()
  // node.data                            -> your original node
  // node.depth, node.children, node.value
}
```

The layout returns the same root and - exactly like `d3-treemap` - writes the coordinates onto every node (leaves and folders); your data stays untouched on `node.data`. The root rectangle always covers the whole requested `size()`.

## Input data & values

Any node type works - pass a `children` accessor if your tree uses another shape:

```ts
const root = hierarchy(myNode, (node) => node.kids).sum((node) => node.metric ?? 0);
```

- `.sum(accessor)` works like d3: a node's `value` is `accessor(node.data)` plus the sum of its children. For datasets where only leaves carry the metric, return `0` for folders (see Quick start) - then folders aggregate bottom-up.
- Nodes without a positive value are omitted from the layout.
- Alternatively set the accessor on the layout: `treemap().value((d) => area(d))(root)`.

## Layout options

```ts
const layout = treemap()
  .size([1000, 1000])              // default [1000, 1000]
  .numberOfPasses(2)               // default 2
  .margin(0.02)                    // gap, fraction of the map (default 0.02)
  .applySiblingMargin(true)        // default true
  .siblingMarginLeavesOnly(false)  // default false
  .floorLabels(2)                  // top levels that get a label strip, 0 = off (default 2)
  .labelLength(0.03)               // number = fraction of the map, or a function (default 0.03)
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
| `margin(fraction)` | `number` (0..1) | `0.02` | Target gap between sibling nodes as a fraction of the map size. |
| `applySiblingMargin(value)` | `boolean` | `true` | Also separate siblings (not just parent and children). |
| `siblingMarginLeavesOnly(value)` | `boolean` | `false` | Shrink only leaves, so gaps appear only between leaves. |
| `floorLabels(topLevels)` | `number` | `2` | Reserve a label strip on the top N folder levels (root counts, 0 = off). |
| `labelLength(value)` | `number | (node) => number` | `0.03` | Strip size: fraction of the map, or a per-folder function in `size()` units. |
| `sorting(option)` | `SortingOption` | `DESCENDING` | `NONE`, `ASCENDING`, `DESCENDING`, `MIDDLE`. |
| `order(option)` | `OrderOption` | `NEW_ORDER` | `NEW_ORDER`, `KEEP_ORDER`, `KEEP_PLACE`. |
| `collapseFolders(value)` | `boolean` | `false` | Merge single-child folder chains (folded nodes share a rectangle). |
| `scale(value)` | `boolean` | `true` | Rescale children onto the available parent area in the final pass (keeps layouts valid). |
| `simpleIncreaseValues(value)` | `boolean` | `false` | Simpler absolute size adjustment between the passes. |
| `incrementMargin(value)` | `boolean` | `false` | Increase the margin gradually across passes (>2 passes). |
| `round(value)` | `boolean` | `false` | Round all coordinates to integers. |

All setters validate their input and throw on invalid values.

### Variable floor labels (CodeCharta style)

Pass a function to `labelLength` for variable, per-folder strips - for example CodeCharta's own formula:

```ts
import { treemap, getFloorLabelPadding, DEFAULT_FLOOR_LABEL_CONFIG } from "area-true-treemap";

treemap()
  .floorLabels(3)
  .labelLength((node) => getFloorLabelPadding(node.x1 - node.x0, node.depth, DEFAULT_FLOOR_LABEL_CONFIG))
  (root);
```

The resolver receives the internal layout node in `size()` units (`x0/x1/y0/y1`, `depth`, `name`) and returns the strip thickness in the same units.

## API

```ts
function hierarchy<T>(data: T, children?: (node: T) => T[] | undefined): HierarchyNode<T>;
function treemap<T>(): Treemap<T>;              // callable, chainable layout
```

The wrapped nodes expose the d3-hierarchy surface: `data`, `depth`, `height`, `parent`, `children`, `value`, `x0/y0/x1/y1`, the traversal helpers (`each`, `eachBefore`, `eachAfter`, `descendants`, `leaves`, `links`, `path`, `ancestors`, `find`, `sum`, `count`, `sort`) and iteration.

Exported symbols: `hierarchy`, `treemap`, `HierarchyNode`, `HierarchyLink`, `HierarchyChildrenAccessor`, `Treemap`, `AreaValue`, `SortingOption`, `OrderOption`, `LabelLength`, `LabelSizeResolver`, `SquarifyNode`, `FloorLabelConfig`, `DEFAULT_FLOOR_LABEL_CONFIG`, `getFloorLabelPadding`.

## Demo

An interactive demo (Svelte) is included in [`demo/`](./demo). It renders the **Area-True Treemap** (this library) and a **d3.js Nested Treemap** side by side and compares them using the evaluation metrics defined in the thesis (node visibility, value proportionality, aspect ratio, space utilization, and computation time).

By default the demo loads the real-world **flare** dataset. A small synthetic example can be selected via the *Sample data* dropdown, and CodeCharta `cc.json` exports or any JSON file can be loaded as well.

```bash
npm install
npm run dev:demo      # starts the demo on http://localhost:5174
```

Live version: https://benediktmehl.github.io/area-true-treemap/

## Development

```bash
npm install           # install all workspaces
npm run build         # build the library (ESM + CJS + types)
npm test              # build + run the test suite
npm run typecheck     # type-check the library
```

## License

BSD-3-Clause. See [LICENSE](./LICENSE).
