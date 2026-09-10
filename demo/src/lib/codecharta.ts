/**
 * Generic loader for CodeCharta cc.json maps.
 *
 * The demo's internal tree format is { name, children, attributes } where a
 * node's area is read from `attributes[areaMetric]` (default metric "size").
 * A CodeCharta cc.json export wraps the same idea in its own schema:
 *
 *  - v1.x:  { projectName, nodes: [ root ], edges, ... } where every node is
 *           { name, type: "Folder"|"File", attributes: { rloc, mcc, ... }, children }
 *  - v2.0:  { meta: { projectName }, files: [ root ], lenses: { metrics: {
 *             attributes: { <nodeId>: { rloc, ... } } } } } — attributes are keyed
 *           by node id instead of sitting on the node.
 *
 * These functions unwrap either schema into the demo TreeNode format, so raw
 * cc.json files can be dropped into the demo and selected or uploaded without
 * any per-file logic. Folders keep whatever (numeric) attributes the export
 * has; folders without an own value fall back to the sum of their children
 * (same behaviour as the bundled flare/sample data).
 */
import type { TreeNode } from './types';

/** A node as it appears inside a cc.json export. */
interface CcNode {
  name?: string;
  type?: string;
  id?: string;
  attributes?: Record<string, unknown>;
  children?: CcNode[];
}

/** True if the parsed JSON is a CodeCharta cc.json (v1.x or v2.0) instead of a
 *  plain { name, children, attributes } tree. */
export function isCodeChartaJson(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (Array.isArray(v.nodes)) return true;
  if (v.meta !== undefined && Array.isArray(v.files)) return true;
  return false;
}

function toNumericAttributes(attrs: Record<string, unknown> | undefined): Record<string, number> | undefined {
  if (!attrs) return undefined;
  const numeric: Record<string, number> = {};
  for (const [key, val] of Object.entries(attrs)) {
    if (typeof val === 'number' && Number.isFinite(val)) numeric[key] = val;
  }
  return Object.keys(numeric).length > 0 ? numeric : undefined;
}

function convertNode(
  node: CcNode,
  attributesById: Map<string, Record<string, number>> | null
): TreeNode {
  const own = node.attributes !== undefined ? toNumericAttributes(node.attributes) : undefined;
  const attributes = own ?? (node.id ? attributesById?.get(node.id) : undefined);
  const children =
    node.children && node.children.length > 0 ? node.children.map((c) => convertNode(c, attributesById)) : undefined;
  const out: TreeNode = { name: node.name ?? '' };
  if (attributes !== undefined) out.attributes = attributes;
  if (children && children.length > 0) out.children = children;
  return out;
}

/** Convert a parsed cc.json export into the demo TreeNode format. Falls back to
 *  returning the input untouched when it is not a cc.json. */
export function ccJsonToTree(json: unknown): TreeNode {
  if (!isCodeChartaJson(json)) return json as TreeNode;
  const v = json as Record<string, unknown>;

  let roots: CcNode[] = [];
  let attributesById: Map<string, Record<string, number>> | null = null;

  if (Array.isArray(v.nodes)) {
    // v1.x: attributes sit directly on every node.
    roots = v.nodes as CcNode[];
  } else {
    // v2.0: the tree lives in `files`, attributes are keyed by node id.
    const files = (v.files ?? []) as CcNode[];
    roots = files;
    const metrics = (v.lenses as Record<string, unknown> | undefined)?.metrics as Record<string, unknown> | undefined;
    const lensAttrs = metrics?.attributes as Record<string, Record<string, number>> | undefined;
    if (lensAttrs) attributesById = new Map(Object.entries(lensAttrs));
  }

  if (roots.length === 0) return { name: (v.projectName as string) ?? 'root' };
  const converted = roots.map((root) => convertNode(root, attributesById));
  if (converted.length === 1) return converted[0];
  // Merged exports can contain several top-level folders — wrap them in a root.
  return { name: (v.projectName as string) ?? 'root', children: converted };
}

/** True if any node of the tree carries a numeric value for `metric`. */
export function treeHasMetric(tree: TreeNode, metric: string): boolean {
  const visit = (node: TreeNode): boolean => {
    if (typeof node.attributes?.[metric] === 'number') return true;
    if (node.children) for (const child of node.children) if (visit(child)) return true;
    return false;
  };
  return visit(tree);
}

/** Picks the area metric for a freshly loaded cc.json: CodeCharta's canonical
 *  default is `rloc`, so it wins whenever the map carries it at all; otherwise
 *  the first metric found on any node is used. */
export function suggestAreaMetric(tree: TreeNode): string {
  const seen = new Set<string>();
  let first: string | undefined;
  const visit = (node: TreeNode): void => {
    if (node.attributes) {
      for (const key of Object.keys(node.attributes)) {
        if (!first) first = key;
        seen.add(key);
      }
    }
    if (node.children) for (const child of node.children) visit(child);
  };
  visit(tree);
  if (seen.has('rloc')) return 'rloc';
  return first ?? 'size';
}