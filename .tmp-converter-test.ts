import { readFileSync, readdirSync } from 'fs';
import { ccJsonToTree, isCodeChartaJson, suggestAreaMetric } from './demo/src/lib/codecharta';
const dir = 'demo/public/data/ccjson';
for (const f of readdirSync(dir)) {
  const doc = JSON.parse(readFileSync(dir + '/' + f, 'utf8'));
  const tree = ccJsonToTree(doc);
  let nodes = 0, leaves = 0, leavesWithRloc = 0;
  const walk = (n: any) => { nodes++; const kids = n.children || []; if (kids.length === 0) { leaves++; if (typeof n.attributes?.rloc === 'number') leavesWithRloc++; } kids.forEach(walk); };
  walk(tree);
  console.log(f, '| nodes:', nodes, '| leaves:', leaves, '| leaves_mit_rloc:', leavesWithRloc, '| metric:', suggestAreaMetric(tree));
}
const v2 = JSON.parse(readFileSync('/home/bene/Repositories/codecharta/visualization/app/codeCharta/assets/sample1.cc.json', 'utf8'));
console.log('v2 sample:', isCodeChartaJson(v2), '| metric:', suggestAreaMetric(ccJsonToTree(v2)));
const plain = { name: 'r', children: [{ name: 'a', attributes: { size: 1 } }] };
console.log('plain passthrough:', JSON.stringify(ccJsonToTree(plain)) === JSON.stringify(plain));
