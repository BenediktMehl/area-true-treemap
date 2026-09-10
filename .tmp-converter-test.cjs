// .tmp-converter-test.ts
var import_fs = require("fs");

// demo/src/lib/codecharta.ts
function isCodeChartaJson(value) {
  if (!value || typeof value !== "object") return false;
  const v = value;
  if (Array.isArray(v.nodes)) return true;
  if (v.meta !== void 0 && Array.isArray(v.files)) return true;
  return false;
}
function toNumericAttributes(attrs) {
  if (!attrs) return void 0;
  const numeric = {};
  for (const [key, val] of Object.entries(attrs)) {
    if (typeof val === "number" && Number.isFinite(val)) numeric[key] = val;
  }
  return Object.keys(numeric).length > 0 ? numeric : void 0;
}
function convertNode(node, attributesById) {
  const own = node.attributes !== void 0 ? toNumericAttributes(node.attributes) : void 0;
  const attributes = own ?? (node.id ? attributesById?.get(node.id) : void 0);
  const children = node.children && node.children.length > 0 ? node.children.map((c) => convertNode(c, attributesById)) : void 0;
  const out = { name: node.name ?? "" };
  if (attributes !== void 0) out.attributes = attributes;
  if (children && children.length > 0) out.children = children;
  return out;
}
function ccJsonToTree(json) {
  if (!isCodeChartaJson(json)) return json;
  const v = json;
  let roots = [];
  let attributesById = null;
  if (Array.isArray(v.nodes)) {
    roots = v.nodes;
  } else {
    const files = v.files ?? [];
    roots = files;
    const metrics = v.lenses?.metrics;
    const lensAttrs = metrics?.attributes;
    if (lensAttrs) attributesById = new Map(Object.entries(lensAttrs));
  }
  if (roots.length === 0) return { name: v.projectName ?? "root" };
  const converted = roots.map((root) => convertNode(root, attributesById));
  if (converted.length === 1) return converted[0];
  return { name: v.projectName ?? "root", children: converted };
}
function suggestAreaMetric(tree) {
  const seen = /* @__PURE__ */ new Set();
  let first;
  const visit = (node) => {
    if (node.attributes) {
      for (const key of Object.keys(node.attributes)) {
        if (!first) first = key;
        seen.add(key);
      }
    }
    if (node.children) for (const child of node.children) visit(child);
  };
  visit(tree);
  if (seen.has("rloc")) return "rloc";
  return first ?? "size";
}

// .tmp-converter-test.ts
var dir = "demo/public/data/ccjson";
for (const f of (0, import_fs.readdirSync)(dir)) {
  const doc = JSON.parse((0, import_fs.readFileSync)(dir + "/" + f, "utf8"));
  const tree = ccJsonToTree(doc);
  let nodes = 0, leaves = 0, leavesWithRloc = 0;
  const walk = (n) => {
    nodes++;
    const kids = n.children || [];
    if (kids.length === 0) {
      leaves++;
      if (typeof n.attributes?.rloc === "number") leavesWithRloc++;
    }
    kids.forEach(walk);
  };
  walk(tree);
  console.log(f, "| nodes:", nodes, "| leaves:", leaves, "| leaves_mit_rloc:", leavesWithRloc, "| metric:", suggestAreaMetric(tree));
}
var v2 = JSON.parse((0, import_fs.readFileSync)("/home/bene/Repositories/codecharta/visualization/app/codeCharta/assets/sample1.cc.json", "utf8"));
console.log("v2 sample:", isCodeChartaJson(v2), "| metric:", suggestAreaMetric(ccJsonToTree(v2)));
var plain = { name: "r", children: [{ name: "a", attributes: { size: 1 } }] };
console.log("plain passthrough:", JSON.stringify(ccJsonToTree(plain)) === JSON.stringify(plain));
