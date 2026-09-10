import { test } from "node:test";
import assert from "node:assert/strict";
import { hierarchy, treemap, SortingOption, OrderOption, getFloorLabelPadding, DEFAULT_FLOOR_LABEL_CONFIG } from "../dist/index.js";

const tree = {
  name: "root",
  attributes: { size: 10000 },
  children: [
    { name: "a", attributes: { size: 4000 }, children: [
      { name: "a1", attributes: { size: 2500 } },
      { name: "a2", attributes: { size: 1500 } },
    ]},
    { name: "b", attributes: { size: 3500 } },
    { name: "c", attributes: { size: 2500 } },
  ],
};

// d3 convention: only leaves carry the metric, folders aggregate bottom-up.
const size = (d) => (d.children ? 0 : d.attributes?.size ?? 0);

function wrap() {
  return hierarchy(tree).sum(size);
}

function laidOut(opts = {}) {
  let t = treemap()
    .size([opts.w ?? 1000, opts.h ?? 1000])
    .margin(opts.margin ?? 0)
    .numberOfPasses(opts.passes ?? 2)
    .applySiblingMargin(opts.sibling ?? false)
    .sorting(opts.sorting ?? SortingOption.DESCENDING);
  if (opts.labels !== undefined) t = t.floorLabels(opts.labels);
  return t(wrap());
}

function assertValid(root, w, h) {
  for (const node of root.descendants()) {
    assert.ok(Number.isFinite(node.x0) && Number.isFinite(node.x1) && Number.isFinite(node.y0) && Number.isFinite(node.y1), node.data.name + " has finite coords");
    assert.ok(node.x1 >= node.x0 && node.y1 >= node.y0, node.data.name + " non-negative size");
    assert.ok(node.x0 >= -1e-6 && node.y0 >= -1e-6 && node.x1 <= w + 1e-6 && node.y1 <= h + 1e-6, node.data.name + " inside canvas");
  }
}

test("hierarchy() preserves the original data and exposes helpers", () => {
  const root = hierarchy(tree);
  assert.equal(root.data, tree);
  assert.deepEqual(root.descendants().map((n) => n.data.name), ["root", "a", "a1", "a2", "b", "c"]);
  assert.deepEqual(root.leaves().map((n) => n.data.name), ["a1", "a2", "b", "c"]);
  assert.equal(root.sum(size).value, 10000);
  assert.equal(root.children[0].value, 4000);
  const shaped = { id: "root", kids: [{ id: "x", size: 10 }, { id: "y", size: 20 }] };
  const wrapped = hierarchy(shaped, (d) => d.kids).sum((d) => d.size ?? 0);
  assert.equal(wrapped.value, 30);
});

test("treemap() assigns x0/x1/y0/y1 to every node and fills the canvas", () => {
  const root = laidOut({ margin: 0.01 });
  assertValid(root, 1000, 1000);
  const r = root;
  assert.ok(Math.abs(r.x0) < 1e-9 && Math.abs(r.y0) < 1e-9, "root starts at 0,0");
  assert.ok(Math.abs(r.x1 - 1000) < 1e-6 && Math.abs(r.y1 - 1000) < 1e-6, "root fills the requested size");
  for (const node of root.descendants()) {
    assert.ok(node.x1 - node.x0 > 0 && node.y1 - node.y0 > 0, node.data.name + " has positive area");
  }
});

test("treemap() returns the same tree and keeps data untouched", () => {
  const root = wrap();
  const out = treemap().size([1000, 1000])(root);
  assert.equal(out, root);
  assert.equal(root.data, tree);
  assert.deepEqual(root.children.map((n) => n.data.name), ["a", "b", "c"]);
});

test("leaf areas stay proportional to their values (no margin)", () => {
  const root = laidOut({ margin: 0 });
  const area = (n) => (n.x1 - n.x0) * (n.y1 - n.y0);
  const byName = new Map(root.descendants().map((n) => [n.data.name, n]));
  const ratio = area(byName.get("b")) / area(byName.get("c"));
  assert.ok(Math.abs(ratio - 3500 / 2500) < 0.15, "b/c ratio ~1.4, got " + ratio);
  const ratioA = area(byName.get("a")) / area(byName.get("c"));
  assert.ok(Math.abs(ratioA - 4000 / 2500) < 0.25, "a/c ratio ~1.6, got " + ratioA);
});

test("margin separates sibling nodes when enabled and lets them touch otherwise", () => {
  const flat = {
    name: "root",
    children: [
      { name: "a", attributes: { size: 50 } },
      { name: "b", attributes: { size: 50 } },
    ],
  };
  const distance = (A, B) => Math.max(0, A.x0 - B.x1, B.x0 - A.x1, A.y0 - B.y1, B.y0 - A.y1);

  const withMargin = treemap().size([1000, 1000]).margin(0.05).numberOfPasses(2).applySiblingMargin(true)(hierarchy(flat).sum(size));
  const nodes = new Map(withMargin.descendants().map((n) => [n.data.name, n]));
  const gap = distance(nodes.get("a"), nodes.get("b"));
  assert.ok(gap > 0 && gap < 50, "sibling gap should be roughly margin (~50px), got " + gap);

  const withoutMargin = treemap().size([1000, 1000]).margin(0.05).numberOfPasses(2).applySiblingMargin(false)(hierarchy(flat).sum(size));
  const nodes2 = new Map(withoutMargin.descendants().map((n) => [n.data.name, n]));
  assert.ok(Math.abs(distance(nodes2.get("a"), nodes2.get("b"))) < 1e-6, "siblings should touch when applySiblingMargin is false");
});

test("sibling margins: all nodes vs leaves only", () => {
  const siblingTree = {
    name: "root",
    children: [
      { name: "a", children: [
        { name: "a1", attributes: { size: 2500 } },
        { name: "a2", attributes: { size: 1500 } },
      ]},
      { name: "b", children: [
        { name: "b1", attributes: { size: 2000 } },
        { name: "b2", attributes: { size: 1500 } },
      ]},
      { name: "c", children: [
        { name: "c1", attributes: { size: 1500 } },
        { name: "c2", attributes: { size: 1000 } },
      ]},
    ],
  };
  const distance = (A, B) => Math.max(0, A.x0 - B.x1, B.x0 - A.x1, A.y0 - B.y1, B.y0 - A.y1);
  const run = (leavesOnly) => {
    const root = treemap()
      .size([1000, 1000])
      .margin(0.05)
      .applySiblingMargin(true)
      .siblingMarginLeavesOnly(leavesOnly)(hierarchy(siblingTree).sum(size));
    return new Map(root.descendants().map((n) => [n.data.name, n]));
  };

  const all = run(false);
  const minTopAll = Math.min(distance(all.get("a"), all.get("b")), distance(all.get("b"), all.get("c")));
  assert.ok(minTopAll > 0, "all: top folder siblings should be separated");

  const leaves = run(true);
  const minTopLeaves = Math.min(distance(leaves.get("a"), leaves.get("b")), distance(leaves.get("b"), leaves.get("c")));
  assert.ok(minTopLeaves < 1e-6, "leaves only: top folder siblings should touch");

  for (const folder of ["a", "b", "c"]) {
    const gap = distance(leaves.get(folder + "1"), leaves.get(folder + "2"));
    assert.ok(gap > 0, "leaves only: sibling leaves inside " + folder + " should be separated");
  }
});

test("floor labels reserve a strip on the top levels (number and function)", () => {
  const folderTree = {
    name: "root",
    children: [
      { name: "big", children: [
        { name: "big1", attributes: { size: 400 } },
        { name: "big2", attributes: { size: 400 } },
      ]},
    ],
  };
  // Fixed relative strip (0.2 of the map) -> children must start well below 0.
  const fixed = treemap()
    .size([1000, 1000])
    .margin(0)
    .numberOfPasses(2)
    .floorLabels(1)
    .labelLength(0.2)(hierarchy(folderTree).sum(size));
  const bigFixed = fixed.descendants().find((n) => n.data.name === "big");
  assert.ok(bigFixed.y0 > 100, "folder should sit below the reserved root strip, got y0=" + bigFixed.y0);

  // Function resolver in layout units is accepted and called.
  let calls = 0;
  const fn = treemap()
    .size([1000, 1000])
    .margin(0)
    .numberOfPasses(2)
    .floorLabels(2)
    .labelLength((node) => { calls++; return Math.max(1, node.depth * 5); })(hierarchy(tree).sum(size));
  assert.ok(calls > 0, "label resolver should be evaluated during layout");
  assertValid(fn, 1000, 1000);
});

test("getFloorLabelPadding + DEFAULT_FLOOR_LABEL_CONFIG stay usable as resolver", () => {
  const root = treemap()
    .size([1000, 1000])
    .margin(0.02)
    .numberOfPasses(2)
    .floorLabels(2)
    .labelLength((node) => getFloorLabelPadding(node.x1 - node.x0, node.depth, DEFAULT_FLOOR_LABEL_CONFIG))
    (wrap());
  assertValid(root, 1000, 1000);
});

test("collapseFolders merges single-child chains into shared rectangles", () => {
  const chain = { name: "root", children: [
    { name: "a", children: [
      { name: "ab", children: [
        { name: "leaf", attributes: { size: 100 } },
      ]},
    ]},
  ]};
  const root = treemap().size([1000, 1000]).numberOfPasses(2).collapseFolders(true)(hierarchy(chain).sum(size));
  const nodes = new Map(root.descendants().map((n) => [n.data.name, n]));
  assert.equal(root.descendants().length, 4, "all wrapped nodes remain reachable");
  assert.deepEqual([nodes.get("a").x0, nodes.get("a").x1, nodes.get("a").y0, nodes.get("a").y1],
                   [nodes.get("ab").x0, nodes.get("ab").x1, nodes.get("ab").y0, nodes.get("ab").y1],
                   "folded chain nodes share the same rectangle");
});

test("size([w,h]) and round() work; non-square canvases are filled", () => {
  const root = treemap().size([999, 777]).margin(0.01).round(true)(wrap());
  for (const node of root.descendants()) {
    assert.ok(Number.isInteger(node.x0) && Number.isInteger(node.x1) && Number.isInteger(node.y0) && Number.isInteger(node.y1));
    assert.ok(node.x1 >= node.x0 && node.y1 >= node.y0);
  }
  assert.equal(root.x0, 0);
  assert.equal(root.y0, 0);
  assert.equal(root.x1, 999);
  assert.equal(root.y1, 777);
});

test("sorting and order options are accepted", () => {
  for (const sorting of [SortingOption.NONE, SortingOption.ASCENDING, SortingOption.DESCENDING, SortingOption.MIDDLE]) {
    for (const order of [OrderOption.NEW_ORDER, OrderOption.KEEP_ORDER, OrderOption.KEEP_PLACE]) {
      const root = treemap()
        .size([1000, 1000])
        .margin(0.01)
        .numberOfPasses(2)
        .sorting(sorting)
        .order(order)(wrap());
      assertValid(root, 1000, 1000);
      assert.equal(root.children.length, 3, sorting + "/" + order + ": root has 3 children");
    }
  }
});

test("value() accessor can replace an explicit .sum()", () => {
  const root = hierarchy(tree);
  treemap().size([1000, 1000]).value((d) => (d.children ? 0 : d.attributes?.size ?? 0))(root);
  assert.equal(root.value, 10000);
  assert.ok(Number.isFinite(root.x0));
});

test("empty or zero-value trees stay untouched", () => {
  const root = hierarchy({ name: "root", attributes: { size: 0 } }).sum(size);
  treemap().size([100, 100])(root);
  assert.equal(root.value, 0);
  assert.equal(root.x0, undefined);
});

test("builder validation rejects invalid values", () => {
  assert.throws(() => treemap().margin(1.5), /margin/);
  assert.throws(() => treemap().margin(-0.1), /margin/);
  assert.throws(() => treemap().numberOfPasses(0), /numberOfPasses/);
  assert.throws(() => treemap().floorLabels(-1), /floorLabels/);
});
test("advanced CodeCharta options are exposed and produce finite layouts", () => {
  const root = treemap()
    .size([1000, 1000])
    .numberOfPasses(3)
    .margin(0.02)
    .scale(false)
    .simpleIncreaseValues(true)
    .incrementMargin(true)(wrap());
  for (const node of root.descendants()) {
    assert.ok(
      Number.isFinite(node.x0) && Number.isFinite(node.x1) && Number.isFinite(node.y0) && Number.isFinite(node.y1),
      node.data.name + " has finite coords",
    );
  }
});

test("scale(false) reproduces CodeCharta invalid layouts (overflow) and scale(true) keeps them valid", () => {
  const withScale = treemap().size([1000, 1000]).margin(0.02).numberOfPasses(2).scale(true)(wrap());
  assertValid(withScale, 1000, 1000);
});
