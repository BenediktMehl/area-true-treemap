/**
 * Demo-local data types (the layout library itself is generic and works with
 * the consumer's own node type).
 */

/** Input tree of the demo datasets. */
export interface TreeNode {
    name: string;
    attributes?: Record<string, number>;
    children?: TreeNode[];
}

/** A rectangle ready for rendering (both panels use this shape). */
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
