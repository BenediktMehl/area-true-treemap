const fs=require('fs');
const dir='demo/public/data/ccjson';
for (const f of fs.readdirSync(dir)) {
  const doc=JSON.parse(fs.readFileSync(dir+'/'+f,'utf8'));
  const roots=doc.nodes||doc.files;
  let folders=0, foldersWithMetric=0, badAgg=0;
  const walk=(n)=>{ const kids=n.children||[];
    if (kids.length>0) { folders++; const own=(n.attributes||{}).rloc; const sum=kids.reduce((s,c)=>s+((c.attributes||{}).rloc||0),0);
      if (typeof own==='number') { foldersWithMetric++; if (sum>0 && Math.abs(own-sum)>0.001) badAgg++; } }
    kids.forEach(walk); };
  roots.forEach(walk);
  console.log(f, '| folders:',folders, '| folders_mit_rloc:',foldersWithMetric, '| abweichend_von_summe:',badAgg);
}
