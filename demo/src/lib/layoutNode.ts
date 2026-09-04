/**
 * LayoutNode represents a positioned and sized node in the treemap
 * This is an adapter for the missing ../../../layoutNode from the original repo
 */
export class LayoutNode {
  name: string;
  width: number;
  length: number;
  depth: number;
  isLeaf: boolean;
  attributes?: Record<string, number>;
  hasLabel: boolean;
  relativeX: number = 0;
  relativeY: number = 0;
  updatedValue: number = 0;
  children: LayoutNode[] = [];

  constructor(
    name: string,
    width: number,
    length: number,
    depth: number,
    isLeaf: boolean,
    attributes?: Record<string, number>,
    hasLabel: boolean = false
  ) {
    this.name = name;
    this.width = width;
    this.length = length;
    this.depth = depth;
    this.isLeaf = isLeaf;
    this.attributes = attributes;
    this.hasLabel = hasLabel;
  }
}
