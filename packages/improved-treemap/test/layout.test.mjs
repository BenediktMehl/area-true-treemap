import { test } from "node:test";
import assert from "node:assert/strict";
import { TreemapLayout, TreemapConfigBuilder, SortingOption } from "../dist/index.js";

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
