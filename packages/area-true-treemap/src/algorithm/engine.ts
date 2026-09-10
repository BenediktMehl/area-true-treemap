/**
 * Internal layout engine for the area-true squarify algorithm.
 *
 * This module runs the multi-pass "area-true" layout on an already built
 * {@link SquarifyNode} tree (in place); the tree construction and the
 * write-back of the coordinates are handled by the callers (plain-tree
 * converter or the d3-style `treemap()` wrapper).
 */

import {
    squarify,
    OrderOption,
    type SquarifyNode,
    type LabelLength,
    type SortingOption,
} from "./squarify";

/** Options controlling the layout passes (the evaluated setting combinations). */
export interface EngineOptions {
    /** Raw margin in layout units. */
    margin: number;
    /** Number of layout passes (1 = single pass, 2 = two-pass area-true, ...). */
    numberOfPasses: number;
    /** Scale node values in the final pass. */
    scale: boolean;
    /** Use the simpler increase-values variant. */
    simpleIncreaseValues: boolean;
    /** Order in which siblings are placed. */
    sortingOption: SortingOption;
    /** How the row order is handled across passes. */
    orderOption: OrderOption;
    /** Increment the margin between passes instead of keeping it constant. */
    incrementMargin: boolean;
    /** Separate sibling nodes by a margin. */
    applySiblingMargin: boolean;
    /** Shrink only leaf nodes (gaps only between leaves, not folders). */
    siblingMarginLeavesOnly: boolean;
    /** Reserve floor-label space (folders already carry `hasLabel`). */
    labelsEnabled: boolean;
    /** Floor-label strip size: a fixed value or a per-node function. */
    labelLength: LabelLength;
}

function resolveLabelLength(labelLength: LabelLength, node: SquarifyNode): number {
    return typeof labelLength === "function" ? labelLength(node) : labelLength;
}

/**
 * Lay out `root` in place: sets the initial layout square to
 * `sqrt(root.value)` and runs the configured number of passes.
 */
export function runLayout(root: SquarifyNode, options: EngineOptions): void {
    const width = Math.sqrt(root.value);
    root.x0 = 0;
    root.y0 = 0;
    root.x1 = width;
    root.y1 = width;

    // First pass without margin/labels (estimates the pure layout).
    squarify(root, 0, false, options.sortingOption, OrderOption.NEW_ORDER, false, 0);

    if (options.numberOfPasses < 2) {
        return;
    }

    const margin = options.margin;
    const marginIncrement = margin / (options.numberOfPasses - 1);
    let currentMargin = options.incrementMargin ? marginIncrement : margin;
    let oldMargin = currentMargin;

    if (options.simpleIncreaseValues) {
        increaseValuesSimple(root, currentMargin, options.applySiblingMargin, 0, options.labelsEnabled, options.labelLength);
    } else {
        increaseValues(root, currentMargin, options.applySiblingMargin, 0, options.labelsEnabled, options.labelLength);
    }
    root.x1 = Math.sqrt(root.value);
    root.y1 = Math.sqrt(root.value);
    const scaleNow = options.scale && options.numberOfPasses === 2;
    squarify(root, currentMargin, scaleNow, options.sortingOption, options.orderOption, options.labelsEnabled, options.labelLength);

    if (options.numberOfPasses > 2) {
        oldMargin = currentMargin;
        currentMargin = options.incrementMargin ? currentMargin + marginIncrement : currentMargin;
        updateValues(root, currentMargin, oldMargin, options.applySiblingMargin, 0, options.labelsEnabled, options.labelLength);
        for (let i = 0; i < options.numberOfPasses - 3; i++) {
            squarify(root, currentMargin, false, options.sortingOption, options.orderOption, options.labelsEnabled, options.labelLength);
            oldMargin = currentMargin;
            currentMargin = options.incrementMargin ? currentMargin + marginIncrement : currentMargin;
            updateValues(root, currentMargin, oldMargin, options.applySiblingMargin, 0, options.labelsEnabled, options.labelLength);
        }
        squarify(root, currentMargin, options.scale, options.sortingOption, options.orderOption, options.labelsEnabled, options.labelLength);
    }

    if (options.applySiblingMargin) {
        if (options.siblingMarginLeavesOnly) {
            shrinkLeavesOnly(root, currentMargin);
        } else {
            shrink(root, currentMargin);
        }
    }
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
