import { readFileSync } from 'fs';
import { hierarchy, treemap } from 'area-true-treemap';
import { ccJsonToTree } from './demo/src/lib/codecharta';
import type { TreeNode } from './demo/src/lib/types';

const dir = 'demo/public/data/ccjson/';
const files = ['junit4_2019-10-26.cc.json', 'httpd_2019-10-26.cc.json', 'netbeans_2019-10-19.cc.json', 'aoo_2019-08-02.cc.json'];
for (const f of files) {
  const tree = ccJsonToTree(JSON.parse(readFileSync(dir + f, 'utf8'))) as TreeNode;
  const t0 = Date.now();
  const root = hierarchy(structuredClone(tree)).sum((d: any) => (!d.children || d.children.length === 0 ? d.attributes?.rloc ?? 0 : 0));
  const layout = treemap<TreeNode>().size([400, 400]).numberOfPasses(2).margin(0.01).floorLabels(3).labelLength(0.03);
  const t1 = Date.now();
  layout(root);
  const t2 = Date.now();
  let rects = 0, zeros = 0, nan = 0, leaves = 0, visibleLeaves = 0;
  root.each((n: any) => {
    rects++;
    const w = n.x1 - n.x0, h = n.y1 - n.y0;
    if (!Number.isFinite(w) || !Number.isFinite(h)) nan++;
    if (w <= 0 || h <= 0) zeros++;
    const isLeaf = !n.children || n.children.length === 0;
    if (isLeaf) { leaves++; if (w > 0 && h > 0) visibleLeaves++; }
  });
  console.log(f.padEnd(30), '| build', (t1-t0)+'ms', '| layout', (t2-t1)+'ms', '| rects', rects, '| blätter', leaves, '| sichtbar', visibleLeaves, '| nullflaeche', zeros, '| NaN', nan);
}
