import { TreemapRect, TreemapSettings, TreeNode } from '$lib/types';
import { LayoutNode } from '$lib/layoutNode';
import { squarify, SquarifyNode, SortingOption, OrderOption } from './squarify';

/**
 * Adapter for area-true treemap layout algorithm
 * Converts input tree to layout and flattens rectangles for 2D rendering
 */

function convertToSquarifyNode(
  node: TreeNode,
  areaMetric: string,
  collapseFolders: boolean,
  depth: number,
  labelsEnabled: boolean,
  amountOfTopLabels: number
): SquarifyNode | null {
  // Skip nodes with no value
  if (node.attributes?.[areaMetric] === undefined || node.attributes[areaMetric] <= 0) {
    return null;
  }

  // Collapse single-child folder chains
  let current = node;
  if (collapseFolders && current.children && current.children.length === 1) {
    const child = current.children[0];
    if (child.children && child.children.length > 0) {
      const childCopy = { ...child };
      childCopy.name = `${current.name}/${child.name}`;
      return convertToSquarifyNode(childCopy, areaMetric, collapseFolders, depth, labelsEnabled, amountOfTopLabels);
    }
  }

  const isLeaf = !current.children || current.children.length === 0;
  const value = current.attributes?.[areaMetric] || 0;

  const children = (current.children || [])
    .map((child) => convertToSquarifyNode(child, areaMetric, collapseFolders, depth + 1, labelsEnabled, amountOfTopLabels))
    .filter((x): x is SquarifyNode => x !== null);

  return {
    name: current.name,
    value,
    originalValue: value,
    children,
    rows: [],
    hasLabel: !isLeaf && depth < amountOfTopLabels && labelsEnabled,
    attributes: current.attributes,
  };
}

function convertToLayoutNode(node: SquarifyNode, depth: number, parentX: number, parentY: number): LayoutNode {
  const isLeaf = !node.children || node.children.length === 0;
  let layoutNode: LayoutNode;

  if (node.value <= 0) {
    layoutNode = new LayoutNode(node.name, 0, 0, depth, isLeaf, node.attributes);
    layoutNode.relativeX = 0;
    layoutNode.relativeY = 0;
    layoutNode.updatedValue = 0;
  } else {
    const width = (node.x1 || 0) - (node.x0 || 0);
    const length = (node.y1 || 0) - (node.y0 || 0);

    layoutNode = new LayoutNode(node.name, width, length, depth, isLeaf, node.attributes, node.hasLabel);
    layoutNode.relativeX = (node.x0 || 0) - parentX;
    layoutNode.relativeY = (node.y0 || 0) - parentY;
    layoutNode.updatedValue = node.value;
  }

  if (!isLeaf) {
    layoutNode.children = node.children
      .map((child) => convertToLayoutNode(child, depth + 1, node.x0 || 0, node.y0 || 0))
      .filter((x) => x !== null);
  }

  return layoutNode;
}

/**
 * Flatten a LayoutNode tree into a list of rectangles for rendering
 */
function flattenLayoutNodes(
  node: LayoutNode,
  absoluteX: number = 0,
  absoluteY: number = 0
): TreemapRect[] {
  const x = absoluteX + node.relativeX;
  const y = absoluteY + node.relativeY;

  const rects: TreemapRect[] = [];

  if (node.width > 0 && node.length > 0) {
    rects.push({
      x,
      y,
      width: node.width,
      height: node.length,
      name: node.name,
      depth: node.depth,
      isLeaf: node.isLeaf,
      hasLabel: node.hasLabel,
      value: node.updatedValue,
      attributes: node.attributes,
    });
  }

  // Recursively flatten children
  for (const child of node.children) {
    rects.push(...flattenLayoutNodes(child, x, y));
  }

  return rects;
}

/**
 * Map margin preset to actual pixel value (approximation based on first pass)
 */
function getMarginPixels(preset: string, containerSize: number): number {
  const map: Record<string, number> = {
    '0.5%': 0.005,
    '1%': 0.01,
    '2%': 0.02,
    '3%': 0.03,
    auto: 0.015, // default to ~1.5%
  };
  const percentage = map[preset] || 0.015;
  return containerSize * percentage;
}

/**
 * Map label preset to label length in pixels
 * N is max number of top labels, L is size as percentage of parent height
 */
function getLabelLengthPixels(topN: number, sizePercent: number, containerSize: number): number {
  // L is stored as percentage (e.g., 5 for 5%)
  return (containerSize * sizePercent) / 100;
}

/**
 * Run the area-true squarify algorithm with the given settings
 */
export function runAreaTrueLayout(tree: TreeNode, settings: TreemapSettings, containerSize: number = 1000): TreemapRect[] {
  // Convert to SquarifyNode
  const squarifyNode = convertToSquarifyNode(tree, settings.areaMetric, settings.collapseFolders, 0, true, settings.labelPreset.topN);

  if (!squarifyNode || squarifyNode.value <= 0) {
    return [];
  }

  // Initialize root coordinates (square container)
  const width = containerSize;
  squarifyNode.x0 = 0;
  squarifyNode.y0 = 0;
  squarifyNode.x1 = width;
  squarifyNode.y1 = width;

  // Run squarify with thesis-aligned settings:
  // - Fixed: aspect ratio 1, sort descending, relative sizing, single run, reorder on second pass
  // - Variable: margin, labels, collapseFolders, applySiblingMargin
  
  const margin = getMarginPixels(settings.margin, width);
  const labelLength = getLabelLengthPixels(settings.labelPreset.topN, settings.labelPreset.sizePercent, width);

  squarify(
    squarifyNode,
    settings.applySiblingMargin ? margin : 0, // Only apply margin if sibling margin enabled
    false, // scale
    SortingOption.DESCENDING, // Sort descending (fixed)
    OrderOption.NEW_ORDER, // New order (fixed)
    true, // labels enabled
    labelLength
  );

  // Convert to LayoutNode tree, then flatten
  const layoutNode = convertToLayoutNode(squarifyNode, 0, 0, 0);
  const rects = flattenLayoutNodes(layoutNode);

  return rects;
}
