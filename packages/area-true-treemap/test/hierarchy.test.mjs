import { test } from "node:test";
import assert from "node:assert/strict";
import { hierarchy, treemap, SortingOption, LabelPosition } from "../dist/index.js";

const tree = {
  name: "root",
  children: [
    {
      name: "a",
      children: [
        { name: "a1", attributes: { size: 2500 } },
        { name: "a2", attributes: { size: 1500 } },
      ],
    },
    { name: "b", attributes: { size: 3500 } },
    { name: "c", attributes: { size: 2500 } },
  ],
};

// Mirror the way CodeCharta integrates d3-hierarchy: wrap the tree, set an area
// accessor via .sum(), run a fluent layout, read x0/x1/y0/y1 per node.
function layoutTree(size = 1000) {
  const root = hierarchy(tree).sum((d) => (d.children ? 0 : d.attributes?.size ?? 0));
  return treemap().size([size, size]).margin(0.02)(root);
}

test("hierarchy() preserves the original data on node.data", () => {
  const root = hierarchy(tree);
  assert.equal(root.data, tree);
  assert.equal(root.children[0].data, tree.children[0]);
  assert.equal(root.depth, 0);
  assert.equal(root.children[0].depth, 1);
});

test("descendants() visits every node in pre-order", () => {
  const names = hierarchy(tree).descendants().map((n) => n.data.name);
  assert.deepEqual(names, ["root", "a", "a1", "a2", "b", "c"]);
});

test("leaves() returns only leaf nodes", () => {
  const names = hierarchy(tree).leaves().map((n) => n.data.name);
  assert.deepEqual(names, ["a1", "a2", "b", "c"]);
});

test("sum() aggregates leaf values upward", () => {
  const root = hierarchy(tree).sum((d) => d.attributes?.size ?? 0);
  assert.equal(root.value, 10000);
  assert.equal(root.children[0].value, 4000);
  assert.equal(root.children[1].value, 3500);
});

test("treemap() assigns x0/x1/y0/y1 to every node, preserving the tree", () => {
  const root = layoutTree();
  for (const node of root.descendants()) {
    assert.ok(Number.isFinite(node.x0), `${node.data.name} has x0`);
    assert.ok(Number.isFinite(node.x1), `${node.data.name} has x1`);
    assert.ok(Number.isFinite(node.y0), `${node.data.name} has y0`);
    assert.ok(Number.isFinite(node.y1), `${node.data.name} has y1`);
    assert.ok(node.x1 >= node.x0, `${node.data.name} width non-negative`);
    assert.ok(node.y1 >= node.y0, `${node.data.name} height non-negative`);
  }
});

test("treemap() returns the same tree (data unchanged, in place)", () => {
  const root = hierarchy(tree);
  const laidOut = treemap().size([1000, 1000]).value((d) => (d.children ? 0 : d.attributes?.size ?? 0))(root);
  assert.equal(laidOut, root);
  assert.equal(root.data, tree);
  assert.equal(root.children[0].data.name, "a");
});

test("leaf areas stay proportional after layout", () => {
  const root = layoutTree();
  const area = (n) => (n.x1 - n.x0) * (n.y1 - n.y0);
  const b = root.descendants().find((n) => n.data.name === "b");
  const c = root.descendants().find((n) => n.data.name === "c");
  const ratio = area(b) / area(c);
  assert.ok(Math.abs(ratio - 3500 / 2500) < 0.2, `area ratio b/c should be ~1.4, got ${ratio}`);
});

test("leaves stay within the canvas", () => {
  const root = layoutTree();
  for (const leaf of root.leaves()) {
    assert.ok(leaf.x0 >= -1e-6 && leaf.y0 >= -1e-6, `${leaf.data.name} starts inside canvas`);
    assert.ok(leaf.x1 <= 1000 + 1e-6 && leaf.y1 <= 1000 + 1e-6, `${leaf.data.name} ends inside canvas`);
    assert.ok(leaf.x1 - leaf.x0 > 0 && leaf.y1 - leaf.y0 > 0, `${leaf.data.name} has positive area`);
  }
});

test("a custom children accessor supports non-'children' node shapes", () => {
  const shaped = { id: "root", kids: [{ id: "x", size: 10 }, { id: "y", size: 20 }] };
  const root = hierarchy(shaped, (d) => d.kids).sum((d) => d.size ?? 0);
  assert.equal(root.value, 30);
  assert.equal(root.children.length, 2);
});

test("round() snaps coordinates to integers", () => {
  const root = hierarchy(tree).sum((d) => (d.children ? 0 : d.attributes?.size ?? 0));
  treemap().size([999, 777]).round(true)(root);
  for (const node of root.descendants()) {
    assert.ok(Number.isInteger(node.x0) && Number.isInteger(node.x1) && Number.isInteger(node.y0) && Number.isInteger(node.y1));
  }
});

test("label positions all produce valid, finite layouts", () => {
  for (const position of [LabelPosition.TOP, LabelPosition.BOTTOM, LabelPosition.LEFT, LabelPosition.RIGHT]) {
    const root = hierarchy(tree).sum((d) => (d.children ? 0 : d.attributes?.size ?? 0));
    treemap().size([1000, 1000]).labels(3, 0.05).labelPosition(position)(root);
    for (const node of root.descendants()) {
      assert.ok(Number.isFinite(node.x0) && Number.isFinite(node.y0) && Number.isFinite(node.x1) && Number.isFinite(node.y1));
    }
  }
});

test("empty/zero value produces an untouched tree", () => {
  const root = hierarchy({ name: "root", attributes: { size: 0 } }).sum((d) => d.attributes?.size ?? 0);
  treemap().size([100, 100])(root);
  assert.equal(root.value, 0);
  assert.equal(root.x0, undefined);
});

test("sorting option is accepted and layout remains valid", () => {
  for (const option of [SortingOption.NONE, SortingOption.ASCENDING, SortingOption.DESCENDING]) {
    const root = hierarchy(tree).sum((d) => (d.children ? 0 : d.attributes?.size ?? 0));
    treemap().size([1000, 1000]).sorting(option)(root);
    assert.ok(root.children.length === 3, `${option}: root has 3 children`);
  }
});
