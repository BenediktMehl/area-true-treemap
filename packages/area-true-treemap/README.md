# area-true-treemap

> Area-true squarified treemap layout with configurable gaps between nodes - without losing any node.

`area-true-treemap` is a dependency-free TypeScript library implementing the **improved squarify algorithm** from the master thesis [Vergleich und Optimierung von 3D-Visualisierungen für die Darstellung von Software-Qualitätsmetriken](https://github.com/BenediktMehl/master-thesis/blob/main/thesis.pdf).

The layout is a **faithful 1:1 port of CodeCharta's `squarifyLayoutImproved`** (branch `thesis/improve-treemap-algorithm`, files `squarify.ts` + `startAlgo.ts`). Unlike a plain squarify that simply insets rectangles, the margin is applied **during the layout** so that no node disappears and area proportions are preserved as closely as possible.

Three additive adaptations on top of the 1:1 port:

1. `labelLength` may also be a per-node function (CodeCharta's `paddingRight(node => ...)` style).
2. The floor-label strip **replaces** the margin on the label side instead of being added on top of it.
3. Folder nodes without their own `attributes[areaMetric]` fall back to the sum of their children (equivalent to CodeCharta's `translateAttributesToTop` preprocessing).

## Features

- **Area-true layout**: proportional node areas, no node vanishes.
- **Multi-pass squarify** (`numberOfPasses`): 1 pass = plain squarify, 2+ passes = the area-true two-pass algorithm with margin compensation.
- **Margins between nodes** - between all siblings or only between leaves (`applySiblingMargin` / `siblingMarginLeavesOnly`).
- **Floor labels** on the top N folder levels - fixed strip or CodeCharta-style variable per-folder sizing (`getFloorLabelPadding`).
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
  .margin(10)
  .numberOfPasses(2)
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

All setter methods return `this` for chaining and validate their input (invalid values throw).

### Settings explained

- **margin** - the raw margin value. The algorithm applies CodeCharta's internal scaling (`config.margin / MARGIN_DIVISOR`) and only uses the margin in multi-pass mode (`numberOfPasses` >= 2); a single pass lays out the pure, unscaled squarify.
- **numberOfPasses** - the core of the "area-true" behaviour: a first pass estimates the layout, the second pass increases node values to make room for the margins, and a final pass lays out the grown values so no node is shrunk to zero area.
- **floorLabels / amountOfTopLabels / labelLength** - the top folder levels reserve a label strip. `labelLength` can be a fixed number or a per-node function (see below) for CodeCharta-style variable strips.
- **sorting / order** - control the sibling order and how rows are placed in later passes (`order(OrderOption.KEEP_PLACE)` keeps the previously computed rows).
- **collapseFolders** - whether to merge single-child folder chains.

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

`compute` runs the layout and returns the flattened list of rectangles - **including the root** as the first entry. Coordinates are in the algorithm's own unit: the layout square is `Math.sqrt(totalValue)` wide (plus reserved label/margin space in multi-pass mode). Scale the result to your canvas with `factor = canvasSize / rects[0].width`.

### Exported symbols

- `AreaTrueTreemapLayout`, `AreaTrueTreemapConfig`, `AreaTrueTreemapConfigBuilder`, `DEFAULT_AREA_TRUE_CONFIG`
- `AreaTrueSortingOption` (`SortingOption`: `none` / `ascending` / `descending` / `middle`), `OrderOption` (`newOrder` / `keepOrder` / `keepPlace`)
- `AreaTrueLabelLength` (`number | AreaTrueLabelSizeResolver`), `AreaTrueLabelSizeResolver` (`(node) => number`)
- `generateAreaTrueSquarifyLayoutNodes` (low-level entry: `(tree, config) => TreemapRect[]`), `MARGIN_DIVISOR`
- `getFloorLabelPadding`, `DEFAULT_FLOOR_LABEL_CONFIG`, `FloorLabelConfig`
- `TreeNode`, `TreemapRect`

## Live demo

An interactive demo compares this layout against a **d3.js Nested Treemap** on the real-world flare dataset, using the evaluation metrics defined in the thesis (node visibility, value proportionality, aspect ratio, space utilization, and computation time):

https://benediktmehl.github.io/area-true-treemap/

## Development

```bash
npm install          # install all workspaces
npm run build        # build the library (ESM + CJS + types)
npm test             # build + run the test suite
npm run typecheck    # type-check the library
```

## License

BSD-3-Clause. See [LICENSE](./LICENSE).
