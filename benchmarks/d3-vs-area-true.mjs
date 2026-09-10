/**
 * Reproducible side-by-side comparison: area-true-treemap vs. a plain
 * d3-hierarchy nested treemap, using the evaluation metrics of the master
 * thesis (node visibility, aspect ratio, value proportionality, space
 * utilization, computation time).
 *
 * The script is the source of the numbers quoted in the readmes and mirrors
 * what the demo (demo/src/App.svelte) does: both layouts are configured with
 * the *same realized* gap and label strip, so the metric rows are comparable.
 *
 * Usage:
 *   node benchmarks/d3-vs-area-true.mjs                     # flare, 400x400
 *   node benchmarks/d3-vs-area-true.mjs --size 1000
 *   node benchmarks/d3-vs-area-true.mjs --data demo/public/data/ccjson/junit4_2019-10-26.cc.json --metric rloc
 *
 * d3-hierarchy is taken from the demo workspace (it is a dependency there).
 */
import { readFileSync } from "node:fs";
import { hierarchy as atHierarchy, treemap as atTreemap, SortingOption } from "area-true-treemap";
import { hierarchy as d3Hierarchy, treemap as d3Treemap } from "d3-hierarchy";

// ---------------------------------------------------------------- CLI
function arg(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const SIZE = Number(arg("size", 400));
const DATA = arg("data", "demo/src/lib/data/flare.json");
const METRIC = arg("metric", "size");

// ---------------------------------------------------------------- data
const raw = JSON.parse(readFileSync(DATA, "utf8"));

/** Convert a cc.json map (v1.x / v2.0) into { name, children, attributes }. */
function ccJsonToTree(json) {
  if (!Array.isArray(json.nodes) && !Array.isArray(json.files)) return json;
  const attributesById = new Map(Object.entries(json.lenses?.metrics?.attributes ?? {}));
  const convert = (node) => {
    const attrs = node.attributes ?? (node.id ? attributesById.get(node.id) : undefined);
    const numeric = attrs
      ? Object.fromEntries(Object.entries(attrs).filter(([, value]) => typeof value === "number"))
      : undefined;
    const out = { name: node.name ?? "" };
    if (numeric && Object.keys(numeric).length > 0) out.attributes = numeric;
    if (node.children?.length) out.children = node.children.map(convert);
    return out;
  };
  const roots = (json.nodes ?? json.files).map(convert);
  return roots.length === 1 ? roots[0] : { name: json.projectName ?? "root", children: roots };
}

const TREE = ccJsonToTree(raw);

const leafValue = (node) => (!node.children || node.children.length === 0 ? node.attributes?.[METRIC] ?? 0 : 0);

function countLeaves(tree) {
  return !tree.children || tree.children.length === 0 ? 1 : tree.children.reduce((sum, child) => sum + countLeaves(child), 0);
}

/** Average runtime in ms, measured over enough iterations for sub-ms precision. */
function measureMs(fn) {
  fn();
  let iterations = 0;
  let elapsed = 0;
  const start = performance.now();
  for (let i = 0; i < 500; i++) {
    fn();
    iterations++;
    elapsed = performance.now() - start;
    if (elapsed >= 30) break;
  }
  return elapsed / iterations;
}

/** Merge single-child folder chains (same as the demo's collapseFolders). */
function collapseFolderChains(node) {
  const collapse = (n) => {
    const children = n.children;
    if (children && children.length === 1 && children[0].children?.length) {
      return collapse({ ...children[0], name: n.name + "/" + children[0].name });
    }
    return { ...n, children: children ? children.map(collapse) : undefined };
  };
  return collapse(node);
}

// ------------------------------------------------- area-true-treemap side
function runAreaTrue(opts) {
  const wrapped = atHierarchy(structuredClone(TREE)).sum(leafValue);
  const layout = atTreemap()
    .size([SIZE, SIZE])
    .numberOfPasses(opts.passes)
    .margin(opts.margin)
    .applySiblingMargin(opts.sibling === "all")
    .siblingMarginLeavesOnly(opts.sibling === "leaves")
    .floorLabels(opts.labels)
    .labelLength(opts.labelPercent / 100)
    .sorting(SortingOption.DESCENDING)
    .collapseFolders(opts.collapse);

  let rects = [];
  const ms = measureMs(() => {
    layout(wrapped);
    rects = [];
    const walk = (node) => {
      rects.push({
        x: node.x0, y: node.y0,
        width: (node.x1 ?? 0) - (node.x0 ?? 0), height: (node.y1 ?? 0) - (node.y0 ?? 0),
        depth: node.depth, isLeaf: !node.children, value: node.value ?? 0,
      });
      if (node.children) for (const child of node.children) walk(child);
    };
    walk(wrapped);
  });
  return { rects, ms };
}

// ------------------------------------------------------- d3-hierarchy side
function runNested(opts, gapPx, labelPx) {
  const data = opts.collapse ? collapseFolderChains(TREE) : TREE;
  const root = d3Hierarchy(structuredClone(data)).sum(leafValue);
  root.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const layout = d3Treemap().size([SIZE, SIZE]).round(false).paddingOuter(gapPx);
  if (opts.sibling === "all") layout.paddingInner(gapPx);
  if (opts.sibling === "leaves") {
    // d3 only knows one uniform inner gap per parent - approximate "leaves only".
    layout.paddingInner((n) => (n.children?.length && n.children.every((c) => !c.children?.length) ? gapPx : 0));
  }
  layout.paddingTop((n) => (opts.labels > 0 && n.depth < opts.labels && n.children?.length ? labelPx : gapPx));

  let rects = [];
  const ms = measureMs(() => {
    const laidOut = layout(root);
    rects = [];
    const walk = (node) => {
      if (node.x1 - node.x0 > 0 && node.y1 - node.y0 > 0) {
        rects.push({
          x: node.x0, y: node.y0, width: node.x1 - node.x0, height: node.y1 - node.y0,
          depth: node.depth, isLeaf: !node.children, value: node.value ?? 0,
        });
      }
      if (node.children) for (const child of node.children) walk(child);
    };
    walk(laidOut);
  });
  return { rects, ms };
}

// ------------------------------------------------------------ measurements
/** Outer gap the area-true layout actually realized (root edge to depth-1 nodes). */
function realizedGapPx(rects, rootLabeled) {
  const root = rects[0];
  const depth1 = rects.filter((r) => r.depth === 1 && r.width > 0 && r.height > 0);
  if (!root || depth1.length === 0) return 0;
  const candidates = [
    Math.min(...depth1.map((r) => r.x)) - root.x,
    root.x + root.width - Math.max(...depth1.map((r) => r.x + r.width)),
    root.y + root.height - Math.max(...depth1.map((r) => r.y + r.height)),
  ];
  if (!rootLabeled) candidates.push(Math.min(...depth1.map((r) => r.y)) - root.y);
  const positive = candidates.filter((v) => v > 1e-6);
  return positive.length > 0 ? Math.min(...positive) : 0;
}

function rootLabelStripPx(rects, rootLabeled) {
  const root = rects[0];
  const depth1 = rects.filter((r) => r.depth === 1 && r.width > 0 && r.height > 0);
  if (!root || !rootLabeled || depth1.length === 0) return 0;
  return Math.max(0, Math.min(...depth1.map((r) => r.y)) - root.y);
}

function stats(rects, totalLeaves, ms) {
  const leaves = rects.filter((r) => r.isLeaf && r.width > 0 && r.height > 0);
  const aspects = rects
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => Math.max(r.width / r.height, r.height / r.width));
  const ratios = rects.filter((r) => r.value > 0 && r.width > 0 && r.height > 0).map((r) => (r.width * r.height) / r.value);
  let valuePropCv = 0;
  if (ratios.length > 1) {
    const mean = ratios.reduce((sum, x) => sum + x, 0) / ratios.length;
    valuePropCv = Math.sqrt(ratios.reduce((sum, x) => sum + (x - mean) ** 2, 0) / ratios.length) / mean;
  }
  const leafArea = leaves.reduce((sum, r) => sum + r.width * r.height, 0);
  const sorted = [...aspects].sort((a, b) => a - b);
  return {
    missing: totalLeaves - leaves.length,
    meanAspect: aspects.reduce((sum, a) => sum + a, 0) / (aspects.length || 1),
    // The mean is dominated by a handful of sub-pixel slivers, so the median is
    // the more meaningful summary of the whole map.
    medianAspect: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0,
    maxAspect: aspects.length > 0 ? Math.max(...aspects) : 0,
    valuePropCv,
    space: SIZE > 0 ? leafArea / (SIZE * SIZE) : 0,
    ms,
  };
}

// ------------------------------------------------------------------ table
const TOTAL_LEAVES = countLeaves(TREE);
const BASE = { margin: 1, sibling: "none", labels: 3, labelPercent: 3, passes: 2, collapse: true, size: SIZE };

const CONFIGS = [
  { title: "1 % gap, no sibling gaps (thesis recommendation)", ...BASE },
  { title: "1 % gap, sibling gaps between leaves only", ...BASE, sibling: "leaves" },
  { title: "1 % gap, sibling gaps between all siblings", ...BASE, sibling: "all" },
  { title: "3 % gap, no sibling gaps", ...BASE, margin: 3 },
  { title: "3 % gap, sibling gaps between all siblings", ...BASE, margin: 3, sibling: "all" },
];

console.log(
  "# area-true-treemap vs. d3-hierarchy nested treemap\n\n" +
    "data: " + DATA + "  (" + TOTAL_LEAVES + " leaves)  metric: " + METRIC + "  canvas: " + SIZE + "x" + SIZE + "\n" +
    "both layouts: descending sort, single-child folder chains collapsed, label strip on the top 3 levels (3 %)\n" +
    "the d3 layout is given the gap/label size the area-true layout actually realized, so both show the same gap\n",
);

for (const config of CONFIGS) {
  const margin = config.margin / 100;
  const areaTrue = runAreaTrue({ ...config, margin });
  const gapPx = realizedGapPx(areaTrue.rects, config.labels > 0);
  const labelPx = rootLabelStripPx(areaTrue.rects, config.labels > 0);
  const nested = runNested(config, gapPx, labelPx);
  const a = stats(areaTrue.rects, TOTAL_LEAVES, areaTrue.ms);
  const b = stats(nested.rects, TOTAL_LEAVES, nested.ms);

  console.log("## " + config.title + "  (realized gap " + gapPx.toFixed(2) + " px)\n");
  console.log("| Metric | area-true-treemap | d3-hierarchy nested |");
  console.log("| --- | --- | --- |");
  const row = (label, fa, fb) => console.log("| " + label + " | " + fa + " | " + fb + " |");
  row("Missing leaves (visibility)", String(a.missing), String(b.missing));
  row("Median aspect ratio", a.medianAspect.toFixed(2), b.medianAspect.toFixed(2));
  row("Mean aspect ratio", a.meanAspect.toFixed(2), b.meanAspect.toFixed(2));
  row("Max aspect ratio", a.maxAspect.toFixed(1), b.maxAspect.toFixed(1));
  row("Value proportionality (CV)", a.valuePropCv.toFixed(3), b.valuePropCv.toFixed(3));
  row("Space utilization", (a.space * 100).toFixed(1) + " %", (b.space * 100).toFixed(1) + " %");
  row("Compute time", a.ms.toFixed(3) + " ms", b.ms.toFixed(3) + " ms");
  console.log("");
}
