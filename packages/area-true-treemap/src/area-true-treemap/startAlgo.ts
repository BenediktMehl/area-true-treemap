/**
 * Faithful port of the CodeCharta `squarifyLayoutImproved` entry point
 * (`startAlgo.ts`, branch `thesis/improve-treemap-algorithm`).
 *
 * Adaptations on top of the 1:1 port:
 *   - `labelLength` may be a per-node function;
 *   - the label size replaces the margin on the label side (handled in
 *     `squarify.ts`);
 *   - folder nodes without an own `attributes[areaMetric]` fall back to the sum
 *     of their children (equivalent to CodeCharta's `translateAttributesToTop`
 *     preprocessing).
 */

import { TreeNode, TreemapRect } from "../types";
import { SquarifyNode, squarify, OrderOption, LabelLength } from "./squarify";
import { AreaTrueTreemapConfig } from "./config";

/** Raw-margin → algorithm-margin scaling, taken 1:1 from CodeCharta. */
export const MARGIN_DIVISOR = 4.331109347824219 * 3.9340057382606775;

function resolveLabelLength(labelLength: LabelLength, node: SquarifyNode): number {
    return typeof labelLength === "function" ? labelLength(node) : labelLength;
}

function convertToSquarifyNode(
    node: TreeNode,
    areaMetric: string,
    collapseFolders: boolean,
    depth: number,
    labelsEnabled: boolean,
    amountOfTopLabels: number,
): SquarifyNode {
    if (collapseFolders && node.children && node.children.length === 1) {
        const child = node.children[0];
        if (child.children && child.children.length > 0) {
            const childCopy = { ...child, name: `${node.name}/${child.name}` };
            return convertToSquarifyNode(childCopy, areaMetric, collapseFolders, depth, labelsEnabled, amountOfTopLabels);
        }
    }

    const isLeaf = !node.children || node.children.length === 0;
    const ownValue = node.attributes?.[areaMetric];

    // Convert the children first so their (recursively aggregated) values are
    // available — mirrors CodeCharta's `translateAttributesToTop`, which sums
    // each folder from the already-aggregated child values bottom-up.
    const children = (node.children ?? []).map(child =>
        convertToSquarifyNode(child, areaMetric, collapseFolders, depth + 1, labelsEnabled, amountOfTopLabels),
    );

    let value: number;
    if (isLeaf) {
        value = ownValue ?? 0;
    } else {
        const childrenValues = children.reduce((sum, child) => sum + child.value, 0);
        value = ownValue ?? childrenValues;
    }

    return {
        name: node.name,
        value,
        originalValue: value,
        children,
        rows: [],
        attributes: node.attributes,
        hasLabel: !isLeaf && depth < amountOfTopLabels && labelsEnabled,
        depth,
        x0: 0,
        y0: 0,
        x1: 0,
        y1: 0,
    };
}

interface LayoutNode {
    name: string;
    width: number;
    length: number;
    depth: number;
    isLeaf: boolean;
    attributes?: Record<string, number>;
    hasLabel: boolean;
    relativeX: number;
    relativeY: number;
    updatedValue: number;
    children?: LayoutNode[];
}

function convertToLayoutNode(node: SquarifyNode, depth: number, parentX: number, parentY: number): LayoutNode {
    const isLeaf = node.children.length === 0;
    let layoutNode: LayoutNode;

    if (node.value <= 0) {
        layoutNode = {
            name: node.name,
            width: 0,
            length: 0,
            depth,
            isLeaf,
            attributes: node.attributes,
            hasLabel: false,
            relativeX: 0,
            relativeY: 0,
            updatedValue: 0,
        };
    } else {
        const width = node.x1 - node.x0;
        const length = node.y1 - node.y0;
        layoutNode = {
            name: node.name,
            width,
            length,
            depth,
            isLeaf,
            attributes: node.attributes,
            hasLabel: node.hasLabel,
            relativeX: node.x0 - parentX,
            relativeY: node.y0 - parentY,
            updatedValue: node.value,
        };
    }

    if (!isLeaf) {
        layoutNode.children = node.children.map(child => convertToLayoutNode(child, depth + 1, node.x0, node.y0));
    }

    return layoutNode;
}

function updateValues(
    node: SquarifyNode,
    margin: number,
    oldMargin: number,
    applySiblingMargin: boolean,
    depth: number,
    labelsEnabled: boolean,
    labelLength: LabelLength,
): number {
    const isLeaf = node.children.length === 0;

    if (node.originalValue <= 0) {
        return 0;
    }

    let childrenValueIncrease = 0;
    if (node.children.length > 0) {
        for (const child of node.children) {
            childrenValueIncrease += updateValues(child, margin, oldMargin, true, depth + 1, labelsEnabled, labelLength);
        }
    } else if (isLeaf && !applySiblingMargin) {
        return 0;
    }
    const ratioOriginalValue = Math.sqrt((node.originalValue + childrenValueIncrease) / node.value);

    let width = (node.x1 - node.x0 - oldMargin * 2) * ratioOriginalValue;
    let length = (node.y1 - node.y0 - oldMargin * 2) * ratioOriginalValue;
    if (width <= 0 && length <= 0) {
        width = 1;
        length = 1;
    }
    if (width <= 0) {
        width = length / 2;
        length = length / 2;
    }
    if (length <= 0) {
        length = width / 2;
        width = width / 2;
    }

    const valueBefore = node.value;
    node.value = width * length;
    return node.value - valueBefore;
}

function increaseValuesSimple(
    node: SquarifyNode,
    margin: number,
    applySiblingMargin: boolean,
    depth: number,
    labelsEnabled: boolean,
    labelLength: LabelLength,
): number {
    if (node.value <= 0) {
        return 0;
    }
    const isLeaf = node.children.length === 0;
    const needsLabel = labelsEnabled && node.hasLabel && !isLeaf;

    let childrenValueIncrease = 0;
    if (!isLeaf) {
        for (const child of node.children) {
            childrenValueIncrease += increaseValuesSimple(child, margin, applySiblingMargin, depth + 1, labelsEnabled, labelLength);
        }
    } else if (!applySiblingMargin && isLeaf) {
        return 0;
    }
    const width = node.x1 - node.x0;
    const length = node.y1 - node.y0;

    let valueIncrease = width * margin + length * margin + margin * margin * 2 + childrenValueIncrease;

    if (needsLabel) {
        valueIncrease += width * resolveLabelLength(labelLength, node);
    }

    node.value += valueIncrease;
    return valueIncrease;
}

function increaseValues(
    node: SquarifyNode,
    margin: number,
    applySiblingMargin: boolean,
    depth: number,
    labelsEnabled: boolean,
    labelLength: LabelLength,
): number {
    const isLeaf = node.children.length === 0;
    const needsLabel = labelsEnabled && node.hasLabel && !isLeaf;

    if (!applySiblingMargin && isLeaf) {
        return 0;
    }
    if (node.value <= 0) {
        return 0;
    }

    const width = node.x1 - node.x0;
    const length = node.y1 - node.y0;

    if (isLeaf) {
        const valueIncrease = width * margin + length * margin + margin * margin;
        node.value += valueIncrease;
        return valueIncrease;
    }

    let childrenValueIncrease = 0;
    for (const child of node.children) {
        childrenValueIncrease += increaseValues(child, margin, applySiblingMargin, depth + 1, labelsEnabled, labelLength);
    }
    const ratioChildrenValueIncrease = (node.value + childrenValueIncrease) / node.value;

    let valueIncrease =
        Math.sqrt(ratioChildrenValueIncrease) * width * margin +
        Math.sqrt(ratioChildrenValueIncrease) * length * margin +
        margin * margin +
        childrenValueIncrease;

    if (needsLabel) {
        valueIncrease += width * resolveLabelLength(labelLength, node);
    }

    node.value += valueIncrease;
    return valueIncrease;
}

function shrinkRect(node: SquarifyNode, margin: number): void {
    node.x0 += margin / 2;
    node.y0 += margin / 2;
    node.x1 -= margin / 2;
    node.y1 -= margin / 2;

    if (node.x1 - node.x0 <= 0 || node.y1 - node.y0 <= 0) {
        node.x0 = 0;
        node.y0 = 0;
        node.x1 = 0;
        node.y1 = 0;
    }
}

function shrink(node: SquarifyNode, margin: number): void {
    shrinkRect(node, margin);
    for (const child of node.children) {
        shrink(child, margin);
    }
}

/**
 * Sibling gaps only between leaf nodes: shrink only the leaves, leave folder
 * rectangles untouched (additive extension via `siblingMarginLeavesOnly`).
 */
function shrinkLeavesOnly(node: SquarifyNode, margin: number): void {
    if (node.children.length === 0) {
        shrinkRect(node, margin);
        return;
    }
    for (const child of node.children) {
        shrinkLeavesOnly(child, margin);
    }
}

function flattenLayoutNode(node: LayoutNode, areaMetric: string, xOffset: number, yOffset: number, rects: TreemapRect[]): void {
    const x = xOffset + node.relativeX;
    const y = yOffset + node.relativeY;
    rects.push({
        x,
        y,
        width: node.width,
        height: node.length,
        name: node.name,
        depth: node.depth,
        isLeaf: node.isLeaf,
        hasLabel: node.hasLabel,
        value: node.attributes?.[areaMetric] ?? 0,
        attributes: node.attributes,
    });
    if (node.children) {
        for (const child of node.children) {
            flattenLayoutNode(child, areaMetric, x, y, rects);
        }
    }
}

/**
 * Lay out `tree` with the CodeCharta improved squarify algorithm and return the
 * flattened rectangles (all nodes, including the root). Coordinates are in the
 * algorithm's own unit — the layout square is `sqrt(totalValue)` ×
 * `sqrt(totalValue)`.
 */
export function generateAreaTrueSquarifyLayoutNodes(tree: TreeNode, config: AreaTrueTreemapConfig): TreemapRect[] {
    const margin = config.margin / MARGIN_DIVISOR;
    const labelsEnabled = config.enableFloorLabels;
    const squarifyNode = convertToSquarifyNode(
        tree,
        config.areaMetric,
        config.collapseFolders,
        0,
        labelsEnabled,
        config.amountOfTopLabels,
    );

    const width = Math.sqrt(squarifyNode.value);
    squarifyNode.x0 = 0;
    squarifyNode.y0 = 0;
    squarifyNode.x1 = width;
    squarifyNode.y1 = width;

    squarify(squarifyNode, 0, false, config.sortingOption, OrderOption.NEW_ORDER, false, 0);

    if (config.numberOfPasses >= 2) {
        const marginIncrement = margin / (config.numberOfPasses - 1);
        let currentMargin = config.incrementMargin ? marginIncrement : margin;
        let oldMargin = currentMargin;

        if (config.simpleIncreaseValues) {
            increaseValuesSimple(squarifyNode, currentMargin, config.applySiblingMargin, 0, labelsEnabled, config.labelLength);
        } else {
            increaseValues(squarifyNode, currentMargin, config.applySiblingMargin, 0, labelsEnabled, config.labelLength);
        }
        squarifyNode.x1 = Math.sqrt(squarifyNode.value);
        squarifyNode.y1 = Math.sqrt(squarifyNode.value);
        const scaleNow = config.scale && config.numberOfPasses === 2;
        squarify(squarifyNode, currentMargin, scaleNow, config.sortingOption, config.orderOption, labelsEnabled, config.labelLength);

        if (config.numberOfPasses > 2) {
            oldMargin = currentMargin;
            currentMargin = config.incrementMargin ? currentMargin + marginIncrement : currentMargin;
            updateValues(squarifyNode, currentMargin, oldMargin, config.applySiblingMargin, 0, labelsEnabled, config.labelLength);
            for (let i = 0; i < config.numberOfPasses - 3; i++) {
                squarify(squarifyNode, currentMargin, false, config.sortingOption, config.orderOption, labelsEnabled, config.labelLength);
                oldMargin = currentMargin;
                currentMargin = config.incrementMargin ? currentMargin + marginIncrement : currentMargin;
                updateValues(squarifyNode, currentMargin, oldMargin, config.applySiblingMargin, 0, labelsEnabled, config.labelLength);
            }
            squarify(squarifyNode, currentMargin, config.scale, config.sortingOption, config.orderOption, labelsEnabled, config.labelLength);
        }

        if (config.applySiblingMargin) {
            if (config.siblingMarginLeavesOnly === true) {
                shrinkLeavesOnly(squarifyNode, currentMargin);
            } else {
                shrink(squarifyNode, currentMargin);
            }
        }
    }

    const layoutNode = convertToLayoutNode(squarifyNode, 0, 0, 0);
    const rects: TreemapRect[] = [];
    flattenLayoutNode(layoutNode, config.areaMetric, 0, 0, rects);
    return rects;
}
