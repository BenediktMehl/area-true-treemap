# area-true-treemap

> Area-true squarified treemap layout with configurable gaps between nodes - without losing any node.

<p align="center">
  <a href="https://benediktmehl.github.io/area-true-treemap/">
    <img src="https://img.shields.io/badge/Live%20Demo-%E2%96%B6%20Open-brightgreen?style=for-the-badge&logo=github" alt="Live Demo" />
  </a>
</p>

Live-Demo: https://benediktmehl.github.io/area-true-treemap/

`area-true-treemap` is a dependency-free TypeScript library implementing the **improved squarify algorithm** from the master thesis [Vergleich und Optimierung von 3D-Visualisierungen für die Darstellung von Software-Qualitätsmetriken](https://github.com/BenediktMehl/master-thesis/blob/main/thesis.pdf). It is a faithful 1:1 port of CodeCharta's `squarifyLayoutImproved` (branch `thesis/improve-treemap-algorithm`) that adds **real margins between nodes during the layout**, so gaps are realized without any node collapsing to zero area.

## Features

- **Area-true layout**: proportional node areas, no node vanishes.
- **Multi-pass squarify** (`numberOfPasses`): 1 pass = plain squarify, 2+ passes = the area-true two-pass algorithm with margin compensation.
- **Margins between nodes** - between all siblings or only between leaves (`applySiblingMargin` / `siblingMarginLeavesOnly`).
- **Floor labels** on the top N folder levels - fixed strip or CodeCharta-style variable per-folder sizing.
- Configurable **sorting** (none / ascending / descending / middle) and **row order across passes**.
- Collapsing of single-child folder chains.
- Fluent **builder pattern** for configuration.
- Zero runtime dependencies, tree-shakeable, ships ESM + CJS + TypeScript types.

## Installation

```bash
npm install area-true-treemap
```

## Quick start

```ts
import { AreaTrueTreemapLayout, AreaTrueSortingOption } from "area-true-treemap";

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

const config = AreaTrueTreemapLayout.builder()
  .areaMetric("size")
  .numberOfPasses(2)
  .applySiblingMargin(true)
  .sorting(AreaTrueSortingOption.DESCENDING)
  .floorLabels(true)
  .amountOfTopLabels(2)
  .build();

const rects = new AreaTrueTreemapLayout(config).compute(data);

// rects[0] is the root container. Scale everything to your canvas size:
const scale = 1000 / rects[0].width;
const px = rects.map((r) => ({
  x: r.x * scale,
  y: r.y * scale,
  width: r.width * scale,
  height: r.height * scale,
  name: r.name,
  depth: r.depth,
  isLeaf: r.isLeaf,
  hasLabel: r.hasLabel,
}));
```

## Input data format

The input is a plain tree of nodes:

```ts
interface TreeNode {
  name: string;
  attributes?: Record<string, number>; // numeric metrics, e.g. { size: 1234 }
  children?: TreeNode[];
}
```

- The area of a node is read from `attributes[areaMetric]` (default metric `"size"`).
- **Leaf** nodes contribute their own attribute value.
- The value of a **folder** is its own attribute value if present, otherwise the sum of its children - you do not need to store aggregate values on folders.

## Configuration (builder pattern)

Build a configuration with the fluent builder and pass it to `AreaTrueTreemapLayout`:

```ts
const config = AreaTrueTreemapLayout.builder()
  .areaMetric("size")
  .margin(10)           // raw margin value, applied in multi-pass mode
  .numberOfPasses(2)    // 2 = area-true two-pass algorithm
  .applySiblingMargin(true)
  .floorLabels(true)
  .amountOfTopLabels(2)
  .build();
```

### Builder methods

| Method | Type | Default | Description |
| --- | --- | --- | --- |
| `areaMetric(name)` | `string` | `"size"` | Attribute name used for the area of each node. |
| `margin(value)` | `number` (>= 0) | `10` | Raw margin; scaled internally by `MARGIN_DIVISOR` (CodeCharta formula). Takes effect with `numberOfPasses` >= 2. |
| `numberOfPasses(value)` | `number` | `1` | 1 = single squarify pass, 2+ = area-true multi-pass layout. |
| `scale(value)` | `boolean` | `false` | Scale node values in the final pass. |
| `simpleIncreaseValues(value)` | `boolean` | `false` | Use the simpler increase-values variant for the second pass. |
| `sorting(option)` | `AreaTrueSortingOption` | `NONE` | Sibling order: `NONE`, `ASCENDING`, `DESCENDING`, `MIDDLE`. |
| `order(option)` | `OrderOption` | `NEW_ORDER` | Row order across passes: `NEW_ORDER`, `KEEP_ORDER`, `KEEP_PLACE`. |
| `incrementMargin(value)` | `boolean` | `false` | Grow the margin between passes instead of keeping it constant. |
| `applySiblingMargin(value)` | `boolean` | `true` | Separate sibling nodes by a margin (multi-pass mode). |
| `siblingMarginLeavesOnly(value)` | `boolean` | `false` | Shrink only leaf nodes, so gaps appear only between leaves (additive extension). |
| `collapseFolders(value)` | `boolean` | `false` | Merge single-child folder chains into a combined name (`a/b/c`). |
| `floorLabels(enabled)` | `boolean` | `true` | Reserve space for folder floor labels. |
| `amountOfTopLabels(value)` | `number` | `2` | Number of top levels (including the root) that get a floor label. |
| `labelLength(value)` | `number | (node) => number` | `1` | Fixed strip size or per-folder function. |
| `build()` | - | - | Returns a resolved, immutable `AreaTrueTreemapConfig`. |

`AreaTrueSortingOption` is one of `"none"`, `"ascending"`, `"descending"`, `"middle"`; `OrderOption` is one of `"newOrder"`, `"keepOrder"`, `"keepPlace"`.

### Variable floor-label sizing

Pass a per-folder function to `labelLength` for CodeCharta-style variable strips - each folder reserves a strip proportional to its own width, clamped between a depth-dependent minimum and 15% of the folder:

```ts
import { getFloorLabelPadding, DEFAULT_FLOOR_LABEL_CONFIG } from "area-true-treemap";

const config = AreaTrueTreemapLayout.builder()
  .labelLength((node) => getFloorLabelPadding(node.x1 - node.x0, node.depth, DEFAULT_FLOOR_LABEL_CONFIG))
  .build();
```

## API

### `AreaTrueTreemapLayout`

```ts
class AreaTrueTreemapLayout {
  constructor(config: AreaTrueTreemapConfig);
  static builder(): AreaTrueTreemapConfigBuilder;
  compute(tree: TreeNode): TreemapRect[];
}
```

`compute` returns the flattened list of rectangles - **including the root** as the first entry. Coordinates are in the algorithm's own unit: the layout square is `Math.sqrt(totalValue)` wide (plus reserved label/margin space in multi-pass mode). Scale the result to your canvas (see Quick start).

### Exported symbols

`AreaTrueTreemapLayout`, `AreaTrueTreemapConfigBuilder`, `AreaTrueTreemapConfig`, `DEFAULT_AREA_TRUE_CONFIG`, `AreaTrueSortingOption`, `OrderOption`, `AreaTrueLabelLength`, `AreaTrueLabelSizeResolver`, `generateAreaTrueSquarifyLayoutNodes`, `MARGIN_DIVISOR`, `FloorLabelConfig`, `DEFAULT_FLOOR_LABEL_CONFIG`, `getFloorLabelPadding`, `TreeNode`, `TreemapRect`.

## Demo

An interactive demo (Svelte) is included in [`demo/`](./demo). It renders the **Area-True Treemap** (this library) and a **d3.js Nested Treemap** side by side and compares them using the evaluation metrics defined in the thesis (node visibility, value proportionality, aspect ratio, space utilization, and computation time).

By default the demo loads the real-world **flare** dataset. A small synthetic example can be selected via the *Sample data* dropdown, and any JSON file can be uploaded as well.

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
