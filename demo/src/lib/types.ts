/**
 * Minimal tree node type for treemap input (CodeCharta-like)
 */
export interface TreeNode {
  name: string;
  value?: number;
  attributes?: Record<string, number>;
  children?: TreeNode[];
}

/**
 * Flattened rectangle output from treemap algorithm
 */
export interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  depth: number;
  isLeaf: boolean;
  hasLabel: boolean;
  value: number;
  attributes?: Record<string, number>;
}

/**
 * Margin preset levels
 */
export type MarginPreset = 'auto' | '0.5%' | '1%' | '2%' | '3%';

/**
 * Label configuration preset
 */
export interface LabelPreset {
  topN: number;
  sizePercent: number;
}

/**
 * Main settings for the treemap algorithm
 */
export interface TreemapSettings {
  margin: MarginPreset;
  labelPreset: LabelPreset;
  collapseFolders: boolean;
  applySiblingMargin: boolean;
  minSize: number; // in pixels, for rendering filter
  areaMetric: string;
}
