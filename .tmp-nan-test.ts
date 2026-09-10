import { readFileSync } from 'fs';
import { hierarchy, treemap } from 'area-true-treemap';
import type { TreeNode } from './demo/src/lib/types';

function run(label: string, tree: TreeNode, metric = 'size') {
  const root = hierarchy(structuredClone(tree) as any).sum((d: any) => (!d.children || d.children.length === 0 ? d.attributes?.[metric] ?? 0 : 0));
  treemap<TreeNode>().size([400, 400]).numberOfPasses(2).margin(0.01).floorLabels(3).labelLength(0.03)(root);
  let nan = 0, zero = 0, total = 0;
  root.each((n: any) => { total++; const w = n.x1 - n.x0, h = n.y1 - n.y0; if (!Number.isFinite(w) || !Number.isFinite(h)) nan++; else if (w <= 0 || h <= 0) zero++; });
  console.log(label.padEnd(34), '| knoten', total, '| NaN', nan, '| nullflaeche', zero);
}

run('flare (bundled, alle > 0)', JSON.parse(readFileSync('demo/src/lib/data/flare.json', 'utf8')));
run('sample (bundled, alle > 0)', JSON.parse(readFileSync('demo/src/lib/data/sample.json', 'utf8')));

const withZero: TreeNode = { name: 'root', children: [
  { name: 'a', children: [{ name: 'a1', attributes: { size: 10 } }, { name: 'a2', attributes: { size: 0 } }] },
  { name: 'b', children: [{ name: 'b1', attributes: { size: 5 } }, { name: 'b2' }] },
]};
run('synthetisch mit Nullwerten', withZero);

const onlyPositive: TreeNode = { name: 'root', children: [
  { name: 'a', children: [{ name: 'a1', attributes: { size: 10 } }, { name: 'a2', attributes: { size: 1 } }] },
  { name: 'b', children: [{ name: 'b1', attributes: { size: 5 } }, { name: 'b2', attributes: { size: 1 } }] },
]};
run('synthetisch ohne Nullwerte', onlyPositive);
