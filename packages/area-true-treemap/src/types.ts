/**
 * Input tree accepted by {@link AreaTrueTreemapLayout}.
 *
 * The area of a node is read from `attributes[areaMetric]` (default metric:
 * `"size"`). Leaf nodes contribute their own attribute value; the value of a
 * folder is computed automatically from its children.
 */
export interface TreeNode {
    name: string;
    attributes?: Record<string, number>;
    children?: TreeNode[];
}

/**
 * A single laid-out rectangle. Coordinates are absolute and start at the
 * top-left corner (0, 0) of the algorithm's layout square; unlike the root
 * container, every folder and leaf is part of the result list. The layout
 * square is `Math.sqrt(total value)` wide (plus reserved label/margin space in
 * multi-pass mode) — scale the rectangles to your canvas with
 * `factor = canvasSize / root.width`.
 */
export interface TreemapRect {
    x: number;
    y: number;
    width: number;
    height: number;
    name: string;
    depth: number;
    isLeaf: boolean;
    /** Whether this folder reserves a floor-label strip (folders only). */
    hasLabel: boolean;
    /** The node's own value for the configured area metric (`attributes[areaMetric]`). */
    value: number;
    attributes?: Record<string, number>;
}
