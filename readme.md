# area-true-treemap

> Area-true squarified treemap layout with configurable gaps between nodes — without losing any node.

<p align="center">
  <a href="https://benediktmehl.github.io/ImprovedTreeMap/">
    <img src="https://img.shields.io/badge/Live%20Demo-%E2%96%B6%20Open-brightgreen?style=for-the-badge&logo=github" alt="Live Demo" />
  </a>
</p>

👉 **Live-Demo: https://benediktmehl.github.io/ImprovedTreeMap/**

`area-true-treemap` is a dependency-free TypeScript library that computes a **squarified treemap** (Bruls et al.) extended with configurable gaps ("margin") between nodes and optional folder labels. Unlike a plain squarify that simply insets rectangles, the margin is applied during layout so that no node disappears and area proportions are preserved as closely as possible.

The algorithm is based on the concepts described in [Vergleich und Optimierung von 3D-Visualisierungen für die Darstellung von Software-Qualitätsmetriken](https://github.com/BenediktMehl/master-thesis/blob/main/thesis.pdf).

## Features

- Area-true rectangles: proportional areas, no node vanishes.
- Configurable relative gaps between sibling nodes.
- Optional folder labels for the top N hierarchy levels.
- Collapsing of single-child folder chains.
- Configurable sorting (descending / ascending / none).
- Fluent **builder pattern** for configuration.
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
- The value of a **non-leaf** node is the sum of its children and is computed automatically — you do not need to store aggregate values on folders.
- Nodes with a non-positive total value are omitted from the output.

## Configuration (builder pattern)

Build a configuration with the fluent builder and pass it to `TreemapLayout`:

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
| `margin(fraction)` | `number` (0–1) | `0.015` | Relative gap between sibling nodes, as a fraction of the shorter canvas side. |
| `collapseFolders(value)` | `boolean` | `true` | Merge single-child folder chains into a combined name (`a/b/c`). |
| `sorting(value)` | `SortingOption` | `DESCENDING` | Order in which siblings are placed. |
| `labels(topLevels, sizeRatio)` | `number, number` | `3, 0.05` | Number of top levels that get a label and label height as fraction (0–1). |
| `labelPosition(position)` | `LabelPosition` | `TOP` | Where labels are placed: `top`, `bottom`, `left`, or `right`. |
| `aspectRatio(value)` | `number` | `1.618` | Target aspect ratio for the squarify heuristic. |
| `build()` | — | — | Returns a resolved, immutable `TreemapConfig`. |

`SortingOption` is one of `"descending"`, `"ascending"`, or `"none"`. `LabelPosition` is one of `"top"`, `"bottom"`, `"left"`, or `"right"`.

### Settings explained

- **margin** — the core "gap" feature. A value of `0.02` means a gap of roughly 2% of the canvas size between sibling nodes. Because the exact relative distance can only be determined after a layout pass, the value is an approximation based on the first pass (this matches the thesis finding of choosing between 0.5% and 3% relative distance).
- **labels** — `topLevels` is the number of top hierarchy levels that reserve space for a folder label (thesis recommends N between 2 and 5). `sizeRatio` is the label height as a fraction of the canvas (thesis recommends L between 3% and 10%).
- **collapseFolders** — whether to merge single-child folder chains. This is a design decision left to the user; the thesis default is `true`.
- **sorting** — the thesis default is descending by size.

## API

### `TreemapLayout`

```ts
class TreemapLayout {
  constructor(config: TreemapConfig);
  static builder(): TreemapConfigBuilder;
  compute(tree: TreeNode, options?: LayoutOptions): TreemapRect[];
}
```

`LayoutOptions` is `{ width?: number; height?: number }`. When omitted, a square `1000x1000` canvas is used. The layout is scale-invariant: the same tree produces the same relative rectangles for any size.

The returned `TreemapRect[]` contains absolute coordinates starting at the top-left `(0, 0)`. The root container itself is **not** included.

### `TreemapConfigBuilder`

Fluent builder as documented above. All setter methods return `this` for chaining and validate their input (invalid values throw).

### Exported types

`TreeNode`, `TreemapRect`, `TreemapConfig`, `LabelConfig`, `LayoutOptions`, `SortingOption`, `LabelPosition`, `DEFAULT_CONFIG`, `DEFAULT_ASPECT_RATIO`.

## Demo

An interactive demo (Svelte) that lets you tweak every setting live is included in [`demo/`](./demo). It renders the **Area-True Treemap** and the **d3.js Nested Treemap** side by side and compares them using the evaluation metrics defined in the thesis (node visibility, value proportionality, aspect ratio, space utilization, and computation time — see the thesis section "Bewertungsgrundlage").

```bash
npm install
npm run dev:demo      # starts the demo on http://localhost:5174
```

👉 Live version: https://benediktmehl.github.io/ImprovedTreeMap/

## Development

```bash
npm install           # install all workspaces
npm run build         # build the library (ESM + CJS + types)
npm test              # build + run the test suite
npm run typecheck     # type-check the library
```

## License

BSD-3-Clause. See [LICENSE](./LICENSE).
