# area-true-treemap

> Area-true squarified treemap layout with configurable gaps between nodes - without losing any node.

`area-true-treemap` is a dependency-free TypeScript library implementing the **improved squarify algorithm** from the master thesis [Vergleich und Optimierung von 3D-Visualisierungen für die Darstellung von Software-Qualitätsmetriken](https://github.com/BenediktMehl/master-thesis/blob/main/thesis.pdf).

It exposes a **d3-hierarchy-compatible API** (`hierarchy()` + `treemap()`): the layout is a callable function that you configure with chained setters - exactly like `d3.treemap()` - so it can be dropped into consumers that already integrate a treemap through d3 (e.g. CodeCharta). The layout itself is a faithful 1:1 port of CodeCharta's `squarifyLayoutImproved` (branch `thesis/improve-treemap-algorithm`) with real margins applied **during** the layout, so gaps never make a node collapse to zero area.

Three additive adaptations on top of the 1:1 port:

1. The floor-label size can be a per-node function (CodeCharta's `paddingRight(node => ...)` style).
2. The floor-label strip **replaces** the margin on the label side instead of being added on top of it.
3. Folder nodes without an own metric aggregate bottom-up (equivalent to CodeCharta's `translateAttributesToTop` preprocessing).

## Features

- **d3-style API**: `hierarchy()` + chainable `treemap()`, coordinates written in place onto the wrapped tree.
- **Area-true**: proportional node areas, no node vanishes.
- **Multi-pass squarify**: 1 pass = plain squarify baseline, 2+ passes = the area-true layout where margins and labels take effect.
- **Margins between nodes** - between all siblings or only between leaves.
- **Floor labels** on the top N folder levels, fixed-size or CodeCharta-style variable per-folder sizing.
- Configurable **sorting** (none / ascending / descending / middle) and **row order across passes**.
- CodeCharta options **scale**, **simple increase values** and **increment margin** as chainable setters.
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
  .size([1000, 1000])
  .numberOfPasses(2)
  .margin(0.02)
  .floorLabels(2)
  .labelLength(0.03)
  .sorting(SortingOption.DESCENDING)(root);

for (const node of root.descendants()) {
  // node.x0, node.x1, node.y0, node.y1 -> rectangle in the units of size()
  // node.data                            -> your original node
}
```

## Migrating from d3-hierarchy

The integration shape is identical - swap the import and replace d3's padding calls with `margin()`:

```diff
- import { hierarchy, treemap } from "d3-hierarchy";
+ import { hierarchy, treemap } from "area-true-treemap";

  const root = hierarchy(map).sum((node) => calculateAreaValue(node));
- treemap().size([width, height]).padding(2).paddingInner(2)(root);
+ treemap().size([width, height]).margin(0.02).applySiblingMargin(true)(root);
```

d3 insets rectangles with per-edge `padding*` (nodes can collapse to zero area); this library grows the values during a second pass so the requested gap is realized without losing any node. The wrapped nodes expose the same surface (`data`, `depth`, `parent`, `children`, `value`, `x0/y0/x1/y1`, `each`, `descendants`, `leaves`, `links`, `path`, `sum`, `sort`, ...).

## Input data & values

Any node type works - pass a `children` accessor if your tree uses another shape:

```ts
const root = hierarchy(myNode, (node) => node.kids).sum((node) => node.metric ?? 0);
```

- `.sum(accessor)` works like d3: a node's `value` is `accessor(node.data)` plus the sum of its children. For datasets where only leaves carry the metric, return `0` for folders (see Quick start) - then folders aggregate bottom-up.
- Nodes without a positive value are omitted from the layout.
- Alternatively set the accessor on the layout: `treemap().value((d) => area(d))(root)`.

## Layout options

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
| `scale(value)` | `boolean` | `true` | CodeCharta "Apply Scaling": rescale children onto the available parent area in the final pass. |
| `simpleIncreaseValues(value)` | `boolean` | `false` | Simpler absolute size adjustment between the passes. |
| `incrementMargin(value)` | `boolean` | `false` | Increase the margin gradually across passes (>2 passes). |
| `round(value)` | `boolean` | `false` | Round all coordinates to integers. |

All setters validate their input and throw on invalid values.

### Settings explained

- **margin** - the core "gap" feature: the target distance between neighbouring nodes as a fraction of the map. Structure is recognisable from roughly 0.5 %, above roughly 3 % the treemap problem dominates (thesis recommendation: 0.5-3 %). Only effective with `numberOfPasses >= 2`.
- **numberOfPasses** - 1 lays out the pure squarify baseline (margin and labels stay inert), 2 is the recommended area-true layout: the first pass estimates the layout, the second one increases the values to make room for margins and labels, and rescales the children onto the available area.
- **floorLabels / labelLength** - the top folder levels reserve a label strip; larger strips mean larger text but less leaf area. A number is a fraction of the map, a function is evaluated per folder in `size()` units.
- **scale** - rescaling the children in the final pass keeps layouts valid (nodes stay inside their parent). Turning it off reproduces CodeCharta's invalid-layout comparison.
- **sorting / order** - sibling order and how rows are placed in the later passes.

### Variable floor labels (CodeCharta style)

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

`treemap()(root)` mutates the passed hierarchy in place (like `d3-treemap`) and returns the root. Every node - leaf and folder - receives `x0`, `x1`, `y0`, `y1` in the units of `size()`; the root rectangle covers the whole canvas.

Exported symbols: `hierarchy`, `treemap`, `HierarchyNode`, `HierarchyLink`, `HierarchyChildrenAccessor`, `Treemap`, `AreaValue`, `SortingOption`, `OrderOption`, `LabelLength`, `LabelSizeResolver`, `SquarifyNode`, `FloorLabelConfig`, `DEFAULT_FLOOR_LABEL_CONFIG`, `getFloorLabelPadding`.

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
