import { test } from "node:test";
import assert from "node:assert/strict";
import { TreemapLayout, TreemapConfigBuilder, SortingOption, LabelPosition } from "../dist/index.js";

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

function layout(overrides = {}) {
  const config = new TreemapConfigBuilder()
    .areaMetric("size")
    .margin(0.02)
    .labels(2, 0.05)
    .collapseFolders(true)
    .sorting(SortingOption.DESCENDING);
  // allow per-test overrides via a fresh builder with defaults
  return new TreemapLayout(config.build()).compute(tree, { width: 1000, height: 1000 });
}

test("produces rectangles for all leaves", () => {
  const rects = layout();
  const leaves = rects.filter((r) => r.isLeaf);
  assert.equal(leaves.length, 4); // a1, a2, b, c
});

test("all rectangles are within the canvas and have positive area", () => {
  for (const r of layout()) {
    assert.ok(r.width > 0, `width of ${r.name} should be positive`);
    assert.ok(r.height > 0, `height of ${r.name} should be positive`);
    assert.ok(r.x >= 0 && r.y >= 0, `${r.name} should start inside the canvas`);
    assert.ok(r.x + r.width <= 1000 + 1e-6, `${r.name} should end inside the canvas`);
    assert.ok(r.y + r.height <= 1000 + 1e-6, `${r.name} should end inside the canvas`);
  }
});

test("root container is not part of the output", () => {
  assert.ok(layout().every((r) => r.name !== "root"));
});

test("areas are proportional (no node disappears)", () => {
  const rects = layout();
  const top = rects.filter((r) => r.depth === 1);
  const byName = Object.fromEntries(top.map((r) => [r.name, r.width * r.height]));
  // b (3500) and c (2500) are direct siblings -> ratio should hold approximately
  const ratio = byName["b"] / byName["c"];
  assert.ok(Math.abs(ratio - 3500 / 2500) < 0.2, `area ratio b/c should be ~1.4, got ${ratio}`);
  const ratioA = byName["a"] / byName["c"];
  assert.ok(Math.abs(ratioA - 4000 / 2500) < 0.3, `area ratio a/c should be ~1.6, got ${ratioA}`);
});

test("builder validation rejects invalid margin", () => {
  assert.throws(() => new TreemapConfigBuilder().margin(1.5), /margin/);
  assert.throws(() => new TreemapConfigBuilder().margin(-0.1), /margin/);
  assert.throws(() => new TreemapConfigBuilder().labels(2, 2), /labels/);
});

/** Distance between two non-overlapping rectangles along their separating axis. */
function gapBetween(first, second) {
  const gapX = Math.max(first.x, second.x) - Math.min(first.x + first.width, second.x + second.width);
  const gapY = Math.max(first.y, second.y) - Math.min(first.y + first.height, second.y + second.height);
  return Math.max(gapX, gapY);
}

test("applySiblingMargin separates sibling nodes by one margin", () => {
  const flat = {
    name: "root",
    children: [
      { name: "a", attributes: { size: 50 } },
      { name: "b", attributes: { size: 50 } },
    ],
  };
  const rects = new TreemapLayout(new TreemapConfigBuilder().margin(0.05).applySiblingMargin(true).build())
    .compute(flat, { width: 1000, height: 1000 });
  const sorted = [...rects].sort((p, q) => p.y - q.y || p.x - q.x);
  const [first, second] = sorted;
  // Each node is shrunk by margin/2 on each side -> siblings end up separated by a full margin (~50px).
  const gap = gapBetween(first, second);
  assert.ok(gap > 40 && gap < 60, `expected ~50px sibling gap (= margin), got ${gap}`);
  assert.ok(first.width > 0 && first.height > 0 && second.width > 0 && second.height > 0);
});

test("applySiblingMargin false leaves siblings touching", () => {
  const flat = {
    name: "root",
    children: [
      { name: "a", attributes: { size: 50 } },
      { name: "b", attributes: { size: 50 } },
    ],
  };
  const rects = new TreemapLayout(new TreemapConfigBuilder().margin(0.05).applySiblingMargin(false).build())
    .compute(flat, { width: 1000, height: 1000 });
  const sorted = [...rects].sort((p, q) => p.y - q.y || p.x - q.x);
  const [first, second] = sorted;
  assert.ok(Math.abs(gapBetween(first, second)) < 1e-6, "siblings should share an edge when applySiblingMargin is false");
});

test("empty input returns an empty list", () => {
  const config = new TreemapConfigBuilder().build();
  const rects = new TreemapLayout(config).compute({ name: "root", attributes: { size: 0 } });
  assert.deepEqual(rects, []);
});

test("unknown area metric yields empty result", () => {
  const config = new TreemapConfigBuilder().areaMetric("nope").build();
  const rects = new TreemapLayout(config).compute(tree);
  assert.deepEqual(rects, []);
});

test("all label positions produce a valid layout", () => {
  for (const position of [LabelPosition.TOP, LabelPosition.BOTTOM, LabelPosition.LEFT, LabelPosition.RIGHT]) {
    const config = new TreemapConfigBuilder().labels(3, 0.05).labelPosition(position).build();
    const rects = new TreemapLayout(config).compute(tree, { width: 1000, height: 1000 });
    assert.ok(rects.length > 0, `${position}: should produce rectangles`);
    for (const r of rects) {
      assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.width) && Number.isFinite(r.height), `${position}: ${r.name} has finite coords`);
      assert.ok(r.width > 0 && r.height > 0, `${position}: ${r.name} has positive size`);
      assert.ok(r.x >= -1e-6 && r.y >= -1e-6, `${position}: ${r.name} inside canvas`);
      assert.ok(r.x + r.width <= 1000 + 1e-6 && r.y + r.height <= 1000 + 1e-6, `${position}: ${r.name} inside canvas`);
    }
  }
});
