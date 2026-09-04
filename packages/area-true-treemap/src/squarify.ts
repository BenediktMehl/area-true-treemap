/**
 * Core "area-true" squarify treemap layout.
 *
 * This is a squarified treemap (Bruls et al.) extended with configurable gaps
 * ("margin") between nodes and optional folder labels. Unlike a plain squarify
 * that simply insets rectangles, the margin is applied during the layout so
 * that no node disappears and area proportions are preserved as closely as
 * possible.
 *
 * The module is dependency-free and pure: it only mutates the nodes passed to
 * it (which are built internally by the public API) and never touches the
 * caller's input tree.
 */

/** Default target aspect ratio used by the squarify worst-ratio heuristic. */
export const DEFAULT_ASPECT_RATIO = 1.618;

export interface SquarifyNode {
    name: string;
    /** Layout value (scaled to area units during layout). */
    value: number;
    /** Original data value, preserved for the output. */
    originalValue: number;
    depth: number;
    children: SquarifyNode[];
    rows: SquarifyRow[];
    hasLabel: boolean;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    attributes?: Record<string, number>;
}

export interface SquarifyRow {
    name: string;
    dice: boolean;
    children: SquarifyNode[];
}

export enum SortingOption {
    NONE = "none",
    ASCENDING = "ascending",
    DESCENDING = "descending",
}

/** Where a folder label is placed relative to its node. */
export enum LabelPosition {
    TOP = "top",
    BOTTOM = "bottom",
    LEFT = "left",
    RIGHT = "right",
}

/**
 * Recursively lay out `parent` and all of its descendants in place.
 *
 * @param margin        Absolute gap (in layout units) between sibling nodes.
 * @param sortingOption Order in which siblings are placed.
 * @param labelsEnabled Whether folder labels reserve space.
 * @param labelLength   Absolute height (in layout units) reserved per label.
 * @param labelPosition Where labels are placed.
 * @param aspectRatio   Target aspect ratio for the squarify heuristic.
 */
export function squarify(
    parent: SquarifyNode,
    margin: number,
    sortingOption: SortingOption,
    labelsEnabled: boolean,
    labelLength: number,
    labelPosition: LabelPosition,
    aspectRatio: number,
): void {
    squarifyNode(parent, margin, sortingOption, labelsEnabled, labelLength, labelPosition, aspectRatio);
    for (const child of parent.children) {
        if (child.children.length > 0) {
            squarify(child, margin, sortingOption, labelsEnabled, labelLength, labelPosition, aspectRatio);
        }
    }
}

function squarifyNode(
    parent: SquarifyNode,
    margin: number,
    sortingOption: SortingOption,
    labelsEnabled: boolean,
    labelLength: number,
    labelPosition: LabelPosition,
    aspectRatio: number,
): void {
    const nodes = parent.children;
    const isLeaf = nodes.length === 0;
    const needsLabel = labelsEnabled && parent.hasLabel && !isLeaf;

    if (sortingOption !== SortingOption.NONE && nodes.length > 0) {
        nodes.sort((a, b) => (sortingOption === SortingOption.ASCENDING ? a.value - b.value : b.value - a.value));
    }

    let x0 = parent.x0 + margin;
    let y0 = parent.y0 + margin;
    let x1 = parent.x1 - margin;
    let y1 = parent.y1 - margin;

    if (needsLabel) {
        if (labelPosition === LabelPosition.BOTTOM) {
            y1 -= labelLength;
        } else if (labelPosition === LabelPosition.LEFT) {
            x0 += labelLength;
        } else if (labelPosition === LabelPosition.RIGHT) {
            x1 -= labelLength;
        } else {
            y0 += labelLength;
        }
    }

    const numberOfChildren = nodes.length;
    let i = 0;
    let j = 0;
    let value = (x1 - x0) * (y1 - y0);

    // Scale the children so their values exactly fill the available area
    // (after margin and label space have been subtracted). This keeps every
    // node inside its parent and preserves relative proportions.
    let childrenValues = 0;
    for (const child of nodes) {
        childrenValues += child.value;
    }
    if (childrenValues > 0) {
        const scaleFactor = value / childrenValues;
        for (const child of nodes) {
            child.value *= scaleFactor;
        }
    }

    while (i < numberOfChildren) {
        const width = x1 - x0;
        const length = y1 - y0;

        // All children are guaranteed to have a positive value (the public API
        // filters them out before reaching this point).
        let sumValue = nodes[j++].value;
        while (!sumValue && j < numberOfChildren) {
            sumValue = nodes[j++].value;
        }

        let minValue = sumValue;
        let maxValue = sumValue;
        const alpha = Math.max(length / width, width / length) / (value * aspectRatio);
        let beta = sumValue * sumValue * alpha;
        let minRatio = Math.max(maxValue / beta, beta / minValue);

        // Keep adding nodes while the aspect ratio maintains or improves.
        for (; j < numberOfChildren; ++j) {
            const nodeValue = nodes[j].value;
            sumValue += nodeValue;
            if (nodeValue < minValue) minValue = nodeValue;
            if (nodeValue > maxValue) maxValue = nodeValue;
            beta = sumValue * sumValue * alpha;
            const newRatio = Math.max(maxValue / beta, beta / minValue);
            if (newRatio > minRatio) {
                sumValue -= nodeValue;
                break;
            }
            minRatio = newRatio;
        }

        const row: SquarifyRow = { name: parent.name, dice: width < length, children: nodes.slice(i, j) };
        if (row.dice) {
            treemapDice(sumValue, row.children, x0, y0, x1, value ? (y0 += (length * sumValue) / value) : y0);
        } else {
            treemapSlice(sumValue, row.children, x0, y0, value ? (x0 += (width * sumValue) / value) : x0, y1);
        }
        value -= sumValue;
        i = j;
        parent.rows.push(row);
    }
}

function treemapDice(parentValue: number, children: SquarifyNode[], x0: number, y0: number, x1: number, y1: number): void {
    const k = parentValue ? (x1 - x0) / parentValue : 0;

    if (x1 - x0 <= 0 || y1 - y0 <= 0) {
        for (const element of children) {
            element.x0 = x0;
            element.x1 = x0;
            element.y0 = y0;
            element.y1 = y0;
        }
        return;
    }

    for (const element of children) {
        element.y0 = y0;
        element.y1 = y1;
        element.x0 = x0;
        element.x1 = x0 += element.value * k;
    }
}

function treemapSlice(parentValue: number, children: SquarifyNode[], x0: number, y0: number, x1: number, y1: number): void {
    const k = parentValue ? (y1 - y0) / parentValue : 0;

    if (x1 - x0 <= 0 || y1 - y0 <= 0) {
        for (const element of children) {
            element.x0 = x0;
            element.x1 = x0;
            element.y0 = y0;
            element.y1 = y0;
        }
        return;
    }

    for (const element of children) {
        element.x0 = x0;
        element.x1 = x1;
        element.y0 = y0;
        element.y1 = y0 += element.value * k;
    }
}
