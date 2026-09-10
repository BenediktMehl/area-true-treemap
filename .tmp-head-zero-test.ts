import { AreaTrueTreemapLayout, AreaTrueSortingOption } from './.tmp-head/packages/area-true-treemap/src/index';
import type { TreeNode } from './.tmp-head/packages/area-true-treemap/src/types';

function run(label: string, tree: TreeNode, metric = 'size') {
  const cfg = AreaTrueTreemapLayout.builder()
    .areaMetric(metric)
    .numberOfPasses(2)
    .margin(1)
    .floorLabels(true)
    .amountOfTopLabels(3)
    .labelLength(3)
    .sorting(AreaTrueSortingOption.DESCENDING)
    .build();
  const rects = new AreaTrueTreemapLayout(cfg).compute(tree);
  let nan = 0, zero = 0;
  for (const r of rects) { if (!Number.isFinite(r.x) || !Number.isFinite(r.y) || !Number.isFinite(r.width) || !Number.isFinite(r.height)) nan++; else if (r.width <= 0 || r.height <= 0) zero++; }
  console.log(label.padEnd(34), '| rects', rects.length, '| NaN', nan, '| nullflaeche', zero);
}
const withZero: TreeNode = { name: 'root', children: [
  { name: 'a', children: [{ name: 'a1', attributes: { size: 10 } }, { name: 'a2', attributes: { size: 0 } }] },
  { name: 'b', children: [{ name: 'b1', attributes: { size: 5 } }, { name: 'b2' }] },
]};
run('HEAD: synthetisch mit Nullwerten', withZero);
const allPositive: TreeNode = { name: 'root', children: [
  { name: 'a', children: [{ name: 'a1', attributes: { size: 10 } }, { name: 'a2', attributes: { size: 1 } }] },
  { name: 'b', children: [{ name: 'b1', attributes: { size: 5 } }, { name: 'b2', attributes: { size: 1 } }] },
]};
run('HEAD: synthetisch ohne Nullwerte', allPositive);
