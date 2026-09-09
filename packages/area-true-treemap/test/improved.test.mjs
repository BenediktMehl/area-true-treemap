import { test } from "node:test";
import assert from "node:assert/strict";
import {
    ImprovedTreemapLayout,
    ImprovedTreemapConfigBuilder,
    ImprovedSortingOption,
    MARGIN_DIVISOR,
} from "../dist/index.js";

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

test("single pass lays out every node; root is sqrt(total value)", () => {
  const rects = new ImprovedTreemapLayout(
    new ImprovedTreemapConfigBuilder().areaMetric("size").floorLabels(false).sorting(ImprovedSortingOption.DESCENDING).build(),
  ).compute(tree);
  assert.deepEqual(rects.map((r) => r.name), ["root", "a", "a1", "a2", "b", "c"]);
  const root = rects[0];
  assert.ok(Math.abs(root.width - 100) < 1e-9, `root width should be sqrt(10000)=100, got ${root.width}`);
  assert.ok(Math.abs(root.height - 100) < 1e-9);
});

test("leaves are all present", () => {
  const rects = new ImprovedTreemapLayout(
    new ImprovedTreemapConfigBuilder().areaMetric("size").floorLabels(false).build(),
  ).compute(tree);
  const leaves = rects.filter((r) => r.isLeaf);
  assert.equal(leaves.length, 4);
});

test("two passes grow the root and give root + depth-1 folders labels", () => {
  const rects = new ImprovedTreemapLayout(
    new ImprovedTreemapConfigBuilder()
      .areaMetric("size")
      .floorLabels(true)
      .amountOfTopLabels(2)
      .labelLength(1)
      .numberOfPasses(2)
      .applySiblingMargin(false)
      .build(),
  ).compute(tree);
  const root = rects.find((r) => r.depth === 0);
  const a = rects.find((r) => r.name === "a");
  assert.equal(root.hasLabel, true, "root (depth 0 < amountOfTopLabels=2) should have a label");
  assert.equal(a.hasLabel, true, "folder a (depth 1 < 2) should have a label");
  assert.ok(root.width > 100, `root should grow after value increase, got ${root.width}`);
});

test("labelLength accepts a per-node function", () => {
  const rects = new ImprovedTreemapLayout(
    new ImprovedTreemapConfigBuilder()
      .areaMetric("size")
      .floorLabels(true)
      .amountOfTopLabels(2)
      .labelLength((node) => node.depth * 3)
      .numberOfPasses(2)
      .applySiblingMargin(false)
      .build(),
  ).compute(tree);
  for (const r of rects) {
    assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.width) && Number.isFinite(r.height));
  }
});

test("label size replaces the margin (independent of margin)", () => {
  const flat = {
    name: "root",
    attributes: { size: 100 },
    children: [
      { name: "a", attributes: { size: 50 } },
      { name: "b", attributes: { size: 50 } },
    ],
  };
  const run = (margin) =>
    new ImprovedTreemapLayout(
      new ImprovedTreemapConfigBuilder()
        .areaMetric("size")
        .margin(margin)
        .floorLabels(true)
        .amountOfTopLabels(1)
        .labelLength(1)
        .numberOfPasses(2)
        .applySiblingMargin(false)
        .build(),
    ).compute(flat);

  const small = run(0);
  const large = run(100); // raw margin 100 → large algorithm margin
  const aSmall = small.find((r) => r.name === "a");
  const aLarge = large.find((r) => r.name === "a");
  // The label strip sets the position to exactly `labelLength`, independent of the margin.
  assert.ok(Math.abs(aSmall.y - 1) < 1e-6, `a.y should equal labelLength=1, got ${aSmall.y}`);
  assert.ok(Math.abs(aLarge.y - aSmall.y) < 1e-6, `changing the margin must not move the label inset (${aSmall.y} vs ${aLarge.y})`);
});

test("folders without an own metric aggregate bottom-up (flare-style trees)", () => {
  // Only leaves carry a metric; every folder has no `size` attribute.
  const flareLike = {
    name: "flare",
    children: [
      { name: "analytics", children: [
        { name: "cluster", children: [
          { name: "AgglomerativeCluster", attributes: { size: 3938 } },
          { name: "CommunityStructure", attributes: { size: 3812 } },
        ]},
        { name: "graph", children: [
          { name: "BetweennessCentrality", attributes: { size: 3534 } },
        ]},
      ]},
      { name: "animate", children: [
        { name: "Easing", attributes: { size: 17010 } },
        { name: "FunctionSequence", attributes: { size: 5842 } },
      ]},
    ],
  };
  const rects = new ImprovedTreemapLayout(
    new ImprovedTreemapConfigBuilder().areaMetric("size").floorLabels(false).numberOfPasses(1).build(),
  ).compute(flareLike);
  const root = rects[0];
  // sqrt(3938+3812+3534+17010+5842) = sqrt(34136) ≈ 184.76
  assert.ok(Math.abs(root.width - Math.sqrt(34136)) < 1e-6, `root should aggregate all leaves, got ${root.width}`);
  const leaves = rects.filter((r) => r.isLeaf);
  assert.equal(leaves.length, 5);
});

test("builder validation rejects invalid values", () => {
  assert.throws(() => new ImprovedTreemapConfigBuilder().margin(-1), /margin/);
  assert.throws(() => new ImprovedTreemapConfigBuilder().numberOfPasses(0), /numberOfPasses/);
  assert.throws(() => new ImprovedTreemapConfigBuilder().labelLength("x"), /labelLength/);
});

test("sibling margins: all nodes vs leaves-only", () => {
  const siblingTree = {
    name: "root",
    attributes: { size: 10000 },
    children: [
      {
        name: "a",
        children: [
          { name: "a1", attributes: { size: 2500 } },
          { name: "a2", attributes: { size: 1500 } },
        ],
      },
      {
        name: "b",
        children: [
          { name: "b1", attributes: { size: 2000 } },
          { name: "b2", attributes: { size: 1500 } },
        ],
      },
      {
        name: "c",
        children: [
          { name: "c1", attributes: { size: 1500 } },
          { name: "c2", attributes: { size: 1000 } },
        ],
      },
    ],
  };

  const rawMargin = 20;
  const algoMargin = rawMargin / MARGIN_DIVISOR;
  const run = (leavesOnly) => {
    const rects = new ImprovedTreemapLayout(
      new ImprovedTreemapConfigBuilder()
        .areaMetric("size")
        .floorLabels(false)
        .sorting(ImprovedSortingOption.DESCENDING)
        .numberOfPasses(2)
        .scale(true)
        .margin(rawMargin)
        .applySiblingMargin(true)
        .siblingMarginLeavesOnly(leavesOnly)
        .build(),
    ).compute(siblingTree);
    return new Map(rects.map((r) => [r.name, r]));
  };

  // Face distance between two axis-aligned rects (0 = touching).
  const distance = (A, B) =>
    Math.max(0, A.x - (B.x + B.width), B.x - (A.x + A.width), A.y - (B.y + B.height), B.y - (A.y + A.height));

  // Top-level children a/b/c are folders whose children are all leaves.
  const all = run(false);
  const minTopAll = Math.min(
    distance(all.get("a"), all.get("b")),
    distance(all.get("a"), all.get("c")),
    distance(all.get("b"), all.get("c")),
  );
  assert.ok(Math.abs(minTopAll - algoMargin) < 1e-6, `"all": adjacent top siblings should be spaced by margin, got ${minTopAll}`);

  const leaves = run(true);
  const minTopLeaves = Math.min(
    distance(leaves.get("a"), leaves.get("b")),
    distance(leaves.get("a"), leaves.get("c")),
    distance(leaves.get("b"), leaves.get("c")),
  );
  assert.ok(minTopLeaves < 1e-6, `"leaves only": adjacent folder siblings should touch (no gap), got ${minTopLeaves}`);

  // Inside every folder both children are leaves -> spaced by margin in both modes.
  for (const [mode, rects] of [
    ["all", all],
    ["leaves only", leaves],
  ]) {
    for (const folder of ["a", "b", "c"]) {
      const [x1, x2] = [`${folder}1`, `${folder}2`];
      const gap = distance(rects.get(x1), rects.get(x2));
      assert.ok(Math.abs(gap - algoMargin) < 1e-6, `${mode}: sibling leaves ${x1}/${x2} should be spaced by margin, got ${gap}`);
    }
  }
});
