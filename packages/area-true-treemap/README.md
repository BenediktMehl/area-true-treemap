# area-true-treemap

> Area-true squarified treemap layout with configurable gaps between nodes — without losing any node.

`area-true-treemap` is a dependency-free TypeScript library that computes a **squarified treemap** (Bruls et al.) extended with configurable gaps ("margin") between nodes and optional folder labels. Unlike a plain squarify that simply insets rectangles, the margin is applied during layout so that no node disappears and area proportions are preserved as closely as possible.

## Features

- Area-true rectangles: proportional areas, no node vanishes.
- Configurable relative gaps between sibling nodes.
- Optional folder labels for the top N hierarchy levels, either fixed-size or CodeCharta-style variable per-folder sizing.
- Collapsing of single-child folder chains.
- Configurable sorting (descending / ascending / none).
- Fluent **builder pattern** for configuration.
- A `d3-hierarchy`-compatible API (`hierarchy()` + `treemap()`) so it can be dropped into consumers that already integrate a treemap via `d3-hierarchy` (e.g. CodeCharta).
- Zero runtime dependencies, tree-shakeable, ships ESM + CJS + TypeScript types.

## Installation

```bash
npm install area-true-treemap
```

## Quick start

```ts
import { TreemapLayout, SortingOption } from "area-true-treemap";

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

const config = TreemapLayout.builder()
  .areaMetric("size")
  .margin(0.02) // 2% gap between siblings
  .labels(3, 0.05) // labels on top 3 levels, 5% height
  .collapseFolders(true)
  .sorting(SortingOption.DESCENDING)
  .build();

const layout = new TreemapLayout(config);
const rects = layout.compute(data, { width: 1000, height: 1000 });
// rects: [{ x, y, width, height, name, depth, isLeaf, hasLabel, value, ... }, ...]
```

## Drop-in integration (d3-hierarchy compatible)

For consumers that already lay out a treemap with `d3-hierarchy` — CodeCharta does
exactly this in `renderer/threeViewer/algorithm/treeMapLayout/treeMapGenerator.ts` —
the package exposes a `d3-hierarchy`-shaped API. You pass your **own** node type
unchanged, set an area accessor, run the layout, and read `x0/x1/y0/y1` off the
same tree you passed in:

```ts
import { hierarchy, treemap } from "area-true-treemap";

// Any node type works — CodeCharta's CodeMapNode, your own, whatever has children.
const root = hierarchy(map) // wraps the tree (original data stays on .data)
  .sum((node) => calculateAreaValue(node)); // area accessor, exactly like d3's .sum()

const layout = treemap<CodeMapNode>()
  .size([width, height])
  .margin(0.02); // area-true gap between siblings (replaces d3's padding*)

layout(root); // lays out in place; returns root

for (const node of root.descendants()) {
  // node.x0, node.x1, node.y0, node.y1  → the rectangle
  // node.data                          → the original node
  // node.depth, node.children           → hierarchy info
}
```

This mirrors the exact shape of `d3-hierarchy`'s `hierarchy().sum()` +
`treemap().size()` integration, so swapping it in is a matter of changing the
import and replacing the `.padding*()` calls with `.margin()`. The layout mutates
the hierarchy in place (like `d3-treemap`) and returns the root; every node — leaf
**and** folder — receives coordinates, and the original data stays untouched.

### `treemap()` methods

| Method | Type | Default | Description |
| --- | --- | --- | --- |
| `size([w, h])` / `size(w, h)` | `number[]` | `[1000, 1000]` | Canvas size in layout units. |
| `value(accessor)` | `(node) => number` | — | Area accessor (like d3's `.sum()`). Optional if you call `.sum()` on the hierarchy instead. |
| `margin(fraction)` | `number` (0–1) | `0.015` | Relative outer gap between a node and its children, as a fraction of the shorter canvas side. |
| `applySiblingMargin(value)` | `boolean` | `true` | Also inset every node by `margin/2` so siblings are separated by a full `margin`. |
| `labels(topLevels, sizeRatio?)` | `number, number` | `3, 0.05` | Reserve space for folder labels on the top N levels (fixed size). |
| `floorLabels(overrides?)` | `object` | — | Use CodeCharta-style variable per-folder label sizing (see below). |
| `labelSize(resolver)` | `(node) => number` | — | Custom label-size function, evaluated per folder during layout (like CodeCharta's `paddingRight`). |
| `labelPosition(position)` | `LabelPosition` | `TOP` | Where labels are placed. |
| `collapseFolders(value)` | `boolean` | `false` | Merge single-child folder chains (all folded nodes share the rectangle). |
| `sorting(option)` | `SortingOption` | `DESCENDING` | Order in which siblings are placed. |
| `aspectRatio(ratio)` | `number` | `1.618` | Target aspect ratio for the squarify heuristic. |
| `round(value)` | `boolean` | `false` | Round coordinates to integers. |

### CodeCharta integration example

CodeCharta's `getSquarifiedTreeMap` currently does:

```ts
import { hierarchy, treemap } from "d3-hierarchy"

const treeMap = treemap<CodeMapNode>()
    .size([width, height])
    .paddingOuter(node => proportionalPadding(node) / 2)
    .paddingInner(proportionalPadding)
    .paddingRight(node => /* floor-label padding */)

return { treeMap: treeMap(hierarchy(map).sum(node => calculateAreaValue(node, ...))) }
```

With this package it becomes:

```ts
import { hierarchy, treemap } from "area-true-treemap"

const treeMap = treemap<CodeMapNode>()
    .size([width, height])
    .margin(marginFraction) // area-true gap instead of d3's padding* inset

return { treeMap: treeMap(hierarchy(map).sum(node => calculateAreaValue(node, ...))) }
```

The returned nodes expose the same `x0`, `x1`, `y0`, `y1`, `data`, `depth` and
`children` that CodeCharta's `TreeMapHelper.buildNodeFrom()` already consumes, so
the downstream 3D-building code needs no changes.

### `hierarchy()` node API

The wrapped nodes expose the `d3-hierarchy` traversal surface: `each`, `eachBefore`,
`eachAfter`, `sum`, `count`, `sort`, `descendants`, `leaves`, `ancestors`, `links`,
`path`, `find`, plus `data`, `depth`, `height`, `parent`, `children`, `value` and
the layout fields `x0`, `x1`, `y0`, `y1`.

## Input data format

```ts
interface TreeNode {
  name: string;
  attributes?: Record<string, number>; // numeric metrics, e.g. { size: 1234 }
  children?: TreeNode[];
}
```

- The area of a node is read from `attributes[areaMetric]` (default metric `"size"`).
- **Leaf** nodes contribute their own attribute value.
- The value of a **non-leaf** node is the sum of its children and is computed automatically.
- Nodes with a non-positive total value are omitted from the output.

## Configuration (builder pattern)

```ts
const config = TreemapLayout.builder()
  .areaMetric("size")
  .margin(0.015)
  .labels(3, 0.05)
  .labelPosition(LabelPosition.TOP)
  .collapseFolders(true)
  .sorting(SortingOption.DESCENDING)
  .aspectRatio(1.618)
  .build();
```

### Builder methods

| Method | Type | Default | Description |
| --- | --- | --- | --- |
| `areaMetric(name)` | `string` | `"size"` | Attribute name used for the area of each node. |
| `margin(fraction)` | `number` (0–1) | `0.015` | Relative outer gap between a node and its children, as a fraction of the shorter canvas side. |
| `applySiblingMargin(value)` | `boolean` | `true` | Also inset every node by `margin/2` so siblings are separated by a full `margin`. |
| `collapseFolders(value)` | `boolean` | `true` | Merge single-child folder chains into a combined name (`a/b/c`). |
| `sorting(value)` | `SortingOption` | `DESCENDING` | Order in which siblings are placed. |
| `labels(topLevels, sizeRatio)` | `number, number` | `3, 0.05` | Number of top levels that get a label and label height as fraction (0–1). |
| `floorLabels(overrides?)` | `object` | — | Use CodeCharta-style variable per-folder label sizing (see below). |
| `labelSize(resolver)` | `(node) => number` | — | Custom label-size function, evaluated per folder during layout (like CodeCharta's `paddingRight`). |
| `labelPosition(position)` | `LabelPosition` | `TOP` | Where labels are placed: `top`, `bottom`, `left`, or `right`. |
| `aspectRatio(value)` | `number` | `1.618` | Target aspect ratio for the squarify heuristic. |
| `build()` | — | — | Returns a resolved, immutable `TreemapConfig`. |

`SortingOption` is one of `"descending"`, `"ascending"`, or `"none"`. `LabelPosition` is one of `"top"`, `"bottom"`, `"left"`, or `"right"`.

### Settings explained

- **margin** — the outer gap between a node and its children. `0.02` means a gap of roughly 2% of the canvas size between a folder and the nodes inside it. The value is an approximation based on the first layout pass (matching the thesis finding of choosing between 0.5% and 3% relative distance).
- **applySiblingMargin** — a switch (default `true`) that also separates sibling nodes. When enabled, every node is additionally inset by `margin/2` on each side after the layout pass, so two adjacent siblings end up separated by a full `margin` (the d3 `paddingInner` equivalent, mirroring the CodeCharta improved algorithm's `applySiblingMargin` step). There is no separate distance — it reuses `margin`.
- **labels** — `topLevels` reserves space for folder labels on the top N levels (thesis recommends 2–5). `sizeRatio` is the label height as a fraction of the canvas (thesis recommends 3%–10%).
- **collapseFolders** — whether to merge single-child folder chains (thesis default: `true`).
- **sorting** — the thesis default is descending by size.

### Variable floor labels (CodeCharta-compatible)

By default every labeled folder reserves the same fixed `sizeRatio` strip. Call
`.floorLabels()` to switch to CodeCharta's variable sizing instead — each folder
reserves a strip proportional to **its own width**, ported 1:1 from CodeCharta's
`getFloorLabelPadding(folderWidth, depth)`:

```ts
Math.min(Math.max(folderWidth * scaling, minimumPadding), folderWidth * maxFraction)
// scaling:        0.035 for the root (depth 0) / 0.028 for sub-folders
// minimumPadding: 120 for the root / 95 for sub-folders
// maxFraction:    0.15 (never more than 15% of the folder)
```

```ts
const config = TreemapLayout.builder()
  .labels(3, 0.05)   // topLevels, fixed sizeRatio (replaced by floorLabels below)
  .floorLabels()     // enable variable per-folder sizing
  .labelPosition(LabelPosition.RIGHT) // CodeCharta puts labels on the right
  .build();

// Or tweak individual parameters:
TreemapLayout.builder().floorLabels({ rootScaling: 0.04, subScaling: 0.03 }).build();
```

The `treemap()` d3-compatible API has the same method: `treemap().floorLabels()`. The
resolved strip thickness is exposed on each `TreemapRect` as `labelSize` (0 for
unlabeled nodes). The `getFloorLabelPadding()` function and `DEFAULT_FLOOR_LABEL_CONFIG`
are exported directly so consumers (e.g. a CodeCharta floor-label drawer) can reproduce
the same numbers.

### Custom label function (drop-in for CodeCharta's `paddingRight`)

Instead of `.floorLabels()`, you can pass an arbitrary function — exactly how
CodeCharta configures d3's treemap. The function is called once per labeled folder
with the laid-out node (fields `x0`, `x1`, `y0`, `y1`, `depth`, `name`) and returns
the reserved strip thickness:

```ts
// CodeCharta today (d3):
//   treemap().paddingRight(node => getFloorLabelPadding(node.x1 - node.x0, node.depth))
//
// area-true-treemap:
const config = TreemapLayout.builder()
  .labels(3, 0.05)
  .labelSize((node) => getFloorLabelPadding(node.x1 - node.x0, node.depth))
  .labelPosition(LabelPosition.RIGHT)
  .build();

// d3-compatible API:
treemap<CodeMapNode>()
  .size([width, height])
  .margin(marginFraction)
  .labelSize((node) => getFloorLabelPadding(node.x1 - node.x0, node.depth))
  .labelPosition(LabelPosition.RIGHT)
```

The resolver type is `LabelSizeResolver = (node: SquarifyNode) => number` and is
exported; `.labelSize()` takes precedence over `labels()` and `floorLabels()`.

## API

### `TreemapLayout`

```ts
class TreemapLayout {
  constructor(config: TreemapConfig);
  static builder(): TreemapConfigBuilder;
  compute(tree: TreeNode, options?: LayoutOptions): TreemapRect[];
}
```

`LayoutOptions` is `{ width?: number; height?: number }`. When omitted, a square `1000x1000` canvas is used. The layout is scale-invariant.

The returned `TreemapRect[]` contains absolute coordinates starting at `(0, 0)`. The root container itself is **not** included.

### Exported types

`TreeNode`, `TreemapRect`, `TreemapConfig`, `LabelConfig`, `FloorLabelConfig`, `LayoutOptions`, `SortingOption`, `LabelPosition`, `DEFAULT_CONFIG`, `DEFAULT_ASPECT_RATIO`, `DEFAULT_FLOOR_LABEL_CONFIG`, `getFloorLabelPadding`, `floorLabelSizeResolver`, `LabelSizeResolver`, `SquarifyNode`, `SquarifyRow`.

From the d3-compatible API: `hierarchy`, `treemap`, `HierarchyNode`, `HierarchyLink`, `HierarchyChildrenAccessor`, `Treemap`, `AreaValue`.

## Development

```bash
npm install       # install dev dependencies
npm run build     # build ESM + CJS + types (dist/)
npm test          # build + run tests
npm run typecheck # type-check
```

## License

BSD-3-Clause. See [LICENSE](./LICENSE).
