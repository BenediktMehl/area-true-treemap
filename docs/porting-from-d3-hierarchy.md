# Porting from d3.js (d3-hierarchy) to area-true-treemap

This guide is for code that lays out a treemap with [`d3-hierarchy`](https://github.com/d3/d3-hierarchy) today
(`d3.hierarchy()` + `d3.treemap()`, typically together with `padding()`, `paddingInner()`, `paddingOuter()`
and a manually reserved label strip) and wants to move to `area-true-treemap`.

- [TL;DR](#tldr)
- [1. What d3 does with padding, and where it hurts](#1-what-d3-does-with-padding-and-where-it-hurts)
- [2. What area-true-treemap does differently](#2-what-area-true-treemap-does-differently)
- [3. Porting in four steps](#3-porting-in-four-steps)
- [4. Option mapping](#4-option-mapping)
- [5. What stays identical](#5-what-stays-identical)
- [6. What is not available](#6-what-is-not-available)
- [7. Advantages, measured](#7-advantages-measured)
- [8. Trade-offs and when not to switch](#8-trade-offs-and-when-not-to-switch)
- [9. Recipes and FAQ](#9-recipes-and-faq)
- [10. Reproducing the numbers](#10-reproducing-the-numbers)

---

## TL;DR

The integration shape is the same - `hierarchy()` wraps your data, the layout is a configured function that
mutates the wrapped tree in place and returns the root, every node ends up with `x0/y0/x1/y1`:

```diff
- import { hierarchy, treemap } from "d3-hierarchy";
+ import { hierarchy, treemap } from "area-true-treemap";

  const root = hierarchy(map).sum((node) => area(node));
- treemap().size([width, height]).padding(2).paddingInner(2).paddingOuter(2)(root);
+ treemap().size([width, height]).margin(2 / width).applySiblingMargin(true)(root);
```

The important difference is *what the gap costs*: d3 insets every rectangle, so a node smaller than the padding
collapses to zero area and disappears. `area-true-treemap` grows the node values during the layout so the
requested gap fits **without** taking that area away from the smallest nodes - at equal realized gaps it loses
roughly an order of magnitude fewer leaves (measured: 6 vs. 67 on the flare dataset at a 3 % sibling gap, and
0 vs. 4 at the 1 % gap the demo ships with - see [section 7](#7-advantages-measured)).

Checklist for a port:

1. Replace the import (drop-in).
2. Keep `hierarchy(data).sum(accessor)` (or move the accessor to `treemap().value(accessor)`).
3. Replace `padding()` / `paddingInner()` / `paddingOuter()` with `margin()` (as a *fraction* of the map
   width) and `applySiblingMargin()` / `siblingMarginLeavesOnly()`.
4. Replace a hand-rolled label strip (`paddingTop` + extra `padding`) with `floorLabels()` +
   `labelLength()`.
5. Delete whatever you wrote to collapse single-child folder chains, to sort, or to round coordinates -
   all of it is built in.
6. Keep reading `x0/y0/x1/y1` when you render. Only the numbers change, never your renderer.

---

## 1. What d3 does with padding, and where it hurts

`d3.treemap()` lays a parent's children out into the parent rectangle *minus* the padding:

```js
// what d3 does, simplified
const inner = [x0 + pad, y0 + pad, x1 - pad, y1 - pad];   // paddingTop/Right/Bottom/Left
tile(parent, ...inner);                                    // children tile the shrunken box
```

The gap therefore comes out of the rectangles themselves, and twice over: once through the parent (its
children box is smaller) and once through the child itself (when it becomes a parent). Two consequences:

- A node whose value share is smaller than the gap loses its entire area. It is still in your tree, but
  `x1 - x0` or `y1 - y0` is `0`: the node is gone from the picture. On real maps with thousands of files this
  is the dominant reason for "invisible" leaves, and it gets worse with every extra pixel of padding.
- Because the padding is a fixed pixel amount, the same configuration behaves differently on a 400 px preview
  and a 4K screen, and on a deep hierarchy the padding of the upper levels eats a large share of the canvas
  (space utilization drops) while the leaf areas stay proportional only *within* the remaining box.

d3 is not wrong here - `padding` is a simple, predictable inset, and `treemapResquarify` builds on exactly that
predictability. It is just the wrong trade-off when the gap is a first-class design element.

## 2. What area-true-treemap does differently

The library implements the **improved squarify algorithm** from the master thesis
[*Vergleich und Optimierung von 3D-Visualisierungen für die Darstellung von Software-Qualitätsmetriken*](https://github.com/BenediktMehl/master-thesis)
(a faithful port of CodeCharta's `squarifyLayoutImproved`). Instead of insetting rectangles, it takes the gap
into account while the layout is computed, in two passes:

1. **Pass 1** runs a plain squarify without gaps or labels. This estimates where every node would sit and how
   much box it would get.
2. **Increase values.** Every node's value is increased by the area its margins and its label strip will
   consume - leaves by `width · margin + length · margin + margin²`, folders additionally by the growth of
   their children (`increaseValues()` in `src/algorithm/engine.ts`).
3. **Pass 2** lays the tree out again with the real `margin` (and label strips). Because the values now
   include the gap, the *remaining* boxes are proportional again - the gap is taken into account by the layout
   instead of being cut out of the smallest node.
4. Optionally the siblings are separated (`applySiblingMargin`): every rectangle is shrunk by `margin / 2` per
   side, or - with `siblingMarginLeavesOnly(true)` - only the leaves, so folders stay seamless.

Two details worth knowing:

- `margin` and `labelLength` are **fractions of the requested width**, not pixel values. `.margin(0.02)` means
  "2 % of `size()[0]`" and therefore behaves identically at every canvas size (the layout is scale-invariant:
  the median aspect ratio is the same for 400×400 and 1000×1000, only the px gap changes).
- `scale(true)` (the default, CodeCharta's "Apply Scaling") rescales the children onto the actually available
  parent area in the final pass, which is what keeps the layout valid - without it nodes can overflow their
  parent. d3 has no equivalent switch because it never inflates values.

## 3. Porting in four steps

### Step 1 - the import

```diff
- import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
+ import { hierarchy, treemap, SortingOption } from "area-true-treemap";
```

Nothing else in your data layer changes.

### Step 2 - the hierarchy

Identical, `sum()` included:

```ts
// before (d3) and after (area-true) - unchanged
const root = hierarchy(map).sum((node) => (!node.children?.length ? area(node) : 0));
```

If you prefer to keep the whole configuration in one place, you can move the accessor to the layout -
`treemap().value((d) => area(d))(root)` does the `.sum()` for you.

### Step 3 - padding becomes margin

```diff
- const layout = treemap()
-   .size([width, height])
-   .round(false)
-   .paddingOuter(4)        // px, all four sides of every parent
-   .paddingInner(4)        // px, between siblings
-   .paddingTop((n) => (labeled(n) ? 24 : 4));
+ const layout = treemap()
+   .size([width, height])
+   .round(false)
+   .margin(4 / width)      // fraction of the map width, all four sides
+   .applySiblingMargin(true)   // = d3's paddingInner
+   .numberOfPasses(2);
```

The two knobs d3 splits into `paddingOuter`/`paddingInner` are `margin()` (folder to children) and
`applySiblingMargin()` (sibling to sibling) here. Per-edge padding has no direct equivalent; the only special
case is the label side (see step 4).

### Step 4 - labels

d3 users usually reserve label space with `paddingTop()` and patch `padding()` at the same time, or draw the
label into the folder rectangle and hope it fits. Here the strip is part of the layout:

```diff
- .paddingTop((n) => (isLabeled(n) ? 24 : 4))
+ .floorLabels(3)          // top 3 levels (root = level 0) get a label strip
+ .labelLength(0.03)       // strip thickness: 3 % of the map width
```

`labelLength()` also accepts a function `(node) => thickness` in layout units, which is how CodeCharta's
variable per-folder sizing is reproduced:

```ts
import { getFloorLabelPadding, DEFAULT_FLOOR_LABEL_CONFIG } from "area-true-treemap";

layout.labelLength((node) => getFloorLabelPadding(node.x1 - node.x0, node.depth, DEFAULT_FLOOR_LABEL_CONFIG));
```

The library only **reserves** the strip - you still draw the text. The strip sits at the top of the folder
rectangle, so a folder with `hasLabel` is labelled at `rect.y + fontAscent`; its children start below the
strip, and `child.y0 - folder.y0` is the strip thickness the layout realized (`labelLength`, minus the usual
rounding of the box arithmetic).

### The whole port, side by side

```ts
// ---------------------------------------------------------------- before: d3-hierarchy
import { hierarchy, treemap } from "d3-hierarchy";

const root = hierarchy(map).sum((n) => (!n.children?.length ? n.attributes.rloc : 0));
root.sort((a, b) => b.value - a.value);

treemap()
  .size([width, height])
  .round(false)
  .padding(2)
  .paddingInner(2)
  .paddingOuter(2)
  .paddingTop((n) => (n.depth < 3 && n.children ? labelHeight : 2))(root);

// ------------------------------------------------- after: area-true-treemap
import { hierarchy, treemap, SortingOption } from "area-true-treemap";

const root = hierarchy(map).sum((n) => (!n.children?.length ? n.attributes.rloc : 0));

treemap()
  .size([width, height])
  .round(false)
  .margin(2 / width)          // same 2 px gap, expressed relative to the map
  .applySiblingMargin(true)   // d3's paddingInner
  .numberOfPasses(2)          // area-true two-pass layout
  .sorting(SortingOption.DESCENDING)  // replaces root.sort(...)
  .collapseFolders(true)      // what you used to hand-roll
  .floorLabels(3)             // replaces paddingTop for labels
  .labelLength(labelHeight / width)(root);

// rendering is untouched:
for (const node of root.descendants()) {
  rect(node.x0, node.y0, node.x1 - node.x0, node.y1 - node.y0);
}
```

## 4. Option mapping

| d3-hierarchy | area-true-treemap | Notes |
| --- | --- | --- |
| `hierarchy(data, children)` | `hierarchy(data, children)` | Same signature; the default accessor reads `children`. |
| `.sum(fn)` / `.count()` / `.sort(fn)` | same | Same semantics; `sort()` is not needed for the layout - `sorting(SortingOption.DESCENDING)` sorts during layout. |
| `treemap()(root)` | `treemap()(root)` | Both mutate `root` in place and return it. |
| `.size([w, h])` | `.size([w, h])` / `.size(w, h)` | No getter form in this library. |
| `.padding(px)` | `.margin(fraction)` | Fraction of `size()[0]` (e.g. `4 / width` for 4 px), applied on all four sides of every parent. |
| `.paddingInner(px)` | `.applySiblingMargin(true)` | Separates siblings. `.siblingMarginLeavesOnly(true)` shrinks leaves only (gaps only between files), which d3 cannot express. |
| `.paddingOuter(px)` | `.margin(fraction)` | Folder to children - the same `margin` value. |
| `.paddingTop(fn)` for labels | `.floorLabels(n)` + `.labelLength(x)` | The strip replaces the margin on the label side instead of adding to it. |
| `.paddingTop/Right/Bottom/Left` | - | No per-edge padding; a strip on the label side is the only asymmetry. |
| `.round(true)` | `.round(true)` | Same. |
| `.tile(d3.treemapSquarify)` | built in | Squarify with the golden-ratio target (1.618) is the only tiling. No `.tile()` setter. |
| `.tile(d3.treemapResquarify)` | - | No "keep the previous layout" tiling, see [section 6](#6-what-is-not-available). |
| `node.copy()` | - | The wrapped nodes are plain objects; re-run `hierarchy(data)` instead. |
| - | `.value(accessor)` | Area accessor on the layout instead of `.sum()`. |
| - | `.numberOfPasses(n)` | 1 = plain squarify baseline, 2 = area-true (default), >2 = iterative refinement (not recommended by the thesis). |
| - | `.collapseFolders(true)` | Merges single-child folder chains; the folded ancestors share the rectangle. |
| - | `.order(OrderOption.*)` | How rows are re-placed across passes: `NEW_ORDER` (default), `KEEP_ORDER`, `KEEP_PLACE`. |
| - | `.scale(true)` | CodeCharta "Apply Scaling"; rescales children onto the available parent area in the final pass. |
| - | `.simpleIncreaseValues(false)` | Absolute instead of relative value growth between passes. |
| - | `.incrementMargin(false)` | Grow the gap across multiple passes (>2 passes). |

## 5. What stays identical

These guarantees are true for both libraries, so a port does not have to touch the rest of your code:

- `hierarchy(data)` returns a wrapper; your data stays untouched on `node.data`.
- Every node - leaves **and** folders - receives `x0`, `y0`, `x1`, `y1` in the units of `size()`.
- The root rectangle covers exactly the requested size (`(0, 0)` to `(w, h)`).
- The layout is a reusable function: configure once, call it for every render. Re-running it on the same tree
  produces the same coordinates, and the same layout instance can lay out different trees.
- `node.value` is **not** modified by the layout (the value inflation happens on an internal copy), so metric
  read-outs and colours keep working.
- Traversal helpers: `data`, `depth`, `height`, `parent`, `children`, `value`, `each`, `eachBefore`,
  `eachAfter`, `descendants`, `leaves`, `links`, `path`, `ancestors`, `find`, `sum`, `count`, `sort`
  and iteration with `for...of`.
- `treemap()` is chainable and validated: invalid values (`margin(1.5)`, `numberOfPasses(0)`, ...) throw
  instead of producing a broken layout.

## 6. What is not available

| Missing | Workaround |
| --- | --- |
| `.tile()` - binary, slice, dice, sliceDice, resquarify | Only the squarified layout (the one this library is about). If you need a different tiling, keep d3 for that view. |
| `treemapResquarify` (stable re-layouts for animated transitions) | Not implemented. Re-running the layout with the same data is deterministic and idempotent, so nothing jumps while the data is unchanged - but when the data changes, the layout is recomputed from scratch instead of being nudged towards the previous one. |
| `node.copy()` | Build a second hierarchy from the same data. |
| `d3.stratify()`, `d3.tree()`, `d3.cluster()`, `d3.pack()`, `d3.partition()` | Out of scope - the package is a treemap layout, not a hierarchy toolkit. Both can live side by side: use `d3.stratify()` to build the tree, this library to lay it out. |
| Getters (`layout.size()`, `layout.padding()`) | Keep the values you configured in your own variables. |
| Per-edge padding in px | Express the gap relative to the map and use the label strip for the top edge. |

## 7. Advantages, measured

All numbers below come from [`benchmarks/d3-vs-area-true.mjs`](../benchmarks/d3-vs-area-true.mjs)
(`npm run benchmark`), which lays both libraries out with **the same realized gap and label strip** - the d3
layout is handed the gap the area-true layout actually produced, exactly like the demo does. Metrics are the
ones defined in the thesis: node visibility, aspect ratio, value proportionality, space utilization,
computation time.

### More nodes survive the same gap

`flare`, 220 leaves, 400×400, label strip on the top 3 levels (3 %), single-child folder chains collapsed,
measured with area-true-treemap 4.0.0:

| Metric | area-true (1 % gap, no sibling gaps) | d3 nested (same gap) | area-true (3 % gap, sibling gaps) | d3 nested (same gap) |
| --- | --- | --- | --- | --- |
| Missing leaves | **0** | 0 | **6** | 67 |
| Median aspect ratio | 1.72 | 1.77 | 2.35 | 1.90 |
| Value proportionality (CV) | **0.210** | 0.262 | 0.846 | 0.759 |
| Space utilization | 65.3 % | 66.5 % | 23.9 % | 29.6 % |
| Compute time | 0.21 ms | 0.075 ms | 0.076 ms | 0.037 ms |

The headline is the *missing leaves* column: at a 3 % sibling gap the d3 layout loses 67 of 220 leaves
(30 %), the area-true layout 6. Same input, same gap, same canvas. At the smaller gap the demo ships with
(1 %) the difference is 4 missing leaves for d3 versus 0 here - and at larger gaps it grows further (measured
on `junit4`, 625 leaves, 1000×1000: 178 vs. 226 missing at 1 % sibling gaps, 355 vs. 445 at 3 %, again
area-true first).

That is not a rendering trick: the same SVG, same rectangles, just rectangles that did not lose their area to
the padding.

### Things you would otherwise write yourself

The demo needs roughly 80 lines of glue to fake these features for the d3 panel; with this library they are
one setter each:

- **Floor labels** incl. CodeCharta's variable per-folder sizing (`floorLabels`, `labelLength`).
- **Gap only between files**, keeping folders seamless (`siblingMarginLeavesOnly`).
- **Collapsing single-child folder chains** (`collapseFolders`), which was the thesis' single biggest win for
  node visibility.
- **Sorting and row-order strategy** (`sorting`, `order`) instead of `root.sort()` plus hope.
- **Resolution independence**: gaps as a fraction of the map, so the same configuration is right on a
  thumbnail and on a 4K display.
- **Validity at any margin**: `scale(true)` guarantees children stay inside their parent.

### What it costs

- **Compute time**: roughly 2-3× a plain d3 squarify (0.21 ms vs. 0.075 ms for flare at 400×400; 0.74 ms vs.
  0.23 ms for 625 leaves at 1000×1000). Both are far below a frame budget, and the library does not re-run on
  every frame unless you ask it to.
- **Median aspect ratio**: essentially identical (1.72 vs. 1.77 at the recommended settings) - the gap does
  not come out of the layout quality.
- **Space utilization**: comparable at equal gaps (65.3 % vs. 66.5 %), which is what makes the other numbers
  comparable at all.

## 8. Trade-offs and when not to switch

- **Large gaps.** Above roughly 3 % the treemap problem dominates and both layouts degrade; the area-true
  layout then loses fewer nodes but can keep them as sub-pixel slivers, which shows up as a poor *mean*
  aspect ratio (the median stays good). The thesis recommends 0.5-3 %.
- **Sibling gaps are the expensive feature.** `applySiblingMargin(true)` shrinks rectangles after the layout,
  which is the same failure mode as d3's `paddingInner` - it just happens far less often. The thesis
  recommends *no* sibling gaps and outlines instead; if you need them, prefer
  `siblingMarginLeavesOnly(true)` or margins `≤ 1 %`.
  Heads-up: the library constructor defaults are `margin(0.02)` **with** `applySiblingMargin(true)` (the
  CodeCharta-compatible default). On a 625-leaf map that default costs ~84 extra invisible leaves compared
  to the same 2 % gap with sibling gaps switched off (257 vs. 173 missing leaves).
- **Very large maps at a small canvas.** If a leaf's value share is below one pixel, no algorithm can show it.
  At 1000×1000 both libraries lose about the same number of leaves on `junit4` (163 vs. 163 at 1 % gap), which
  is a resolution limit, not an algorithm property - render bigger or filter tiny nodes.
- **Animated transitions.** If you rely on `treemapResquarify`'s stable re-layouts, this library will not
  reproduce them.
- **Other tilings.** Slice-and-dice, binary or `sliceDice` layouts are not available.

## 9. Recipes and FAQ

**"My layout lost nodes - how do I get all of them back?"**
Set `applySiblingMargin(false)`, use `margin(0.005-0.02)`, keep `floorLabels` at 2-3 levels with
`labelLength` ≤ 0.04, and enable `collapseFolders(true)`. That is the thesis configuration and the one the
demo starts from.

**"How do I reproduce d3's `padding(4)` exactly?"**
`margin(4 / width)` with `applySiblingMargin(true)`. Note that the realized gap can be slightly smaller than
requested (the layout targets it, the box arithmetic rounds) - the demo even measures the realized gap and
mirrors it onto the d3 panel for a fair comparison.

**"I want the plain squarify baseline."**
`.numberOfPasses(1)` lays out pure squarify: gaps and labels stay inert, areas are exactly proportional,
value proportionality is 0. Good for showing what the improvement actually buys you.

**"Do I have to call `.sort()` on the hierarchy?"**
No. `sorting(SortingOption.DESCENDING)` (the default) is applied inside each layout pass;
`SortingOption.NONE` keeps your order. `OrderOption` controls whether the later passes re-sort or keep the
first pass's order/placement.

**"Are gaps in px or in percent?"**
Both: `margin(0.02)` is 2 % of `size()[0]`, `margin(4 / width)` is 4 px. Fractional values are the portable
choice.

**"Does the layout work on a non-square canvas?"**
Yes - `size([1000, 500])` is supported, the root fills it exactly, and the margin stays a scalar (relative to
the width) on both axes.

**"Is it safe in a render loop?"**
Yes. The layout is pure with respect to your data: it rebuilds its internal structure on every call, is
idempotent for the same input, does not mutate `node.value`, and can be reused for different trees.

## 10. Reproducing the numbers

```bash
npm install          # installs the workspace, incl. d3-hierarchy for the comparison
npm run benchmark    # flare, 400x400, markdown tables
node benchmarks/d3-vs-area-true.mjs --size 1000
node benchmarks/d3-vs-area-true.mjs --data demo/public/data/ccjson/junit4_2019-10-26.cc.json --metric rloc --size 1000
```

The same comparison is available interactively (both maps side by side, with live settings and a metrics
table) at <https://benediktmehl.github.io/area-true-treemap/>; its source is in
[`demo/`](../demo).
