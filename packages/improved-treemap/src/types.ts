/**
 * Input tree accepted by {@link TreemapLayout}.
 *
 * The area of a node is read from `attributes[areaMetric]` (default metric:
 * `"size"`). Leaf nodes contribute their own value; the value of a non-leaf
 * node is the sum of its children and is computed automatically.
 */
export interface TreeNode {
    name: string;
    attributes?: Record<string, number>;
    children?: TreeNode[];
}

/**
 * A single laid-out rectangle. Coordinates are absolute, starting at the
 * top-left corner (0, 0) of the requested layout size.
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
 * Output dimensions of the layout. When omitted, a square 1000x1000 canvas is
 * used. The layout is scale-invariant: the same tree produces the same relative
 * rectangles for any size, only the absolute coordinates (and pixel-based gaps)
 * change.
 */
export interface LayoutOptions {
    width?: number;
    height?: number;
}
