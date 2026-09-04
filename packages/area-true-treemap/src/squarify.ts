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
    /** Back-reference to the source node(s) this layout node was built from. */
    data?: unknown;
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
 * @param margin        Absolute outer gap (in layout units) between a node and its children.
 * @param innerHalf     Half of the sibling gap (0 when sibling margins are off).
 * @param sortingOption Order in which siblings are placed.
 * @param labelsEnabled Whether folder labels reserve space.
 * @param labelLength   Absolute height (in layout units) reserved per label.
 * @param labelPosition Where labels are placed.
 * @param aspectRatio   Target aspect ratio for the squarify heuristic.
 */
export function squarify(
    parent: SquarifyNode,
    margin: number,
    innerHalf: number,
    sortingOption: SortingOption,
    labelsEnabled: boolean,
    labelLength: number,
    labelPosition: LabelPosition,
    aspectRatio: number,
): void {
    squarifyNode(parent, margin, innerHalf, sortingOption, labelsEnabled, labelLength, labelPosition, aspectRatio);
    for (const child of parent.children) {
        if (child.children.length > 0) {
            squarify(child, margin, innerHalf, sortingOption, labelsEnabled, labelLength, labelPosition, aspectRatio);
        }
    }
}

function squarifyNode(
    parent: SquarifyNode,
    margin: number,
    innerHalf: number,
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

    // The sibling gap is realized by insetting every node by `innerHalf`
    // (done in `shrink`). For non-root nodes that inset is already accounted
    // for by their parent's layout, so the children area keeps the full
    // `margin`. Only the root (depth 0) has no parent inset, so its children
    // area is reduced by the extra `innerHalf` to keep the canvas edge at
    // exactly `margin` instead of `margin + innerHalf`.
    const rootAdj = parent.depth === 0 ? innerHalf : 0;
    const outer = margin - rootAdj;

    let x0 = parent.x0 + outer;
    let y0 = parent.y0 + outer;
    let x1 = parent.x1 - outer;
    let y1 = parent.y1 - outer;

    // On the side that carries the label, the label strip replaces the outer
    // margin (like d3's treemap, where paddingTop/... overrides paddingOuter),
    // so the free area there is the label length only — not margin + label.
    if (needsLabel) {
        if (labelPosition === LabelPosition.BOTTOM) {
            y1 = parent.y1 - labelLength;
        } else if (labelPosition === LabelPosition.LEFT) {
            x0 = parent.x0 + labelLength;
        } else if (labelPosition === LabelPosition.RIGHT) {
            x1 = parent.x1 - labelLength;
        } else {
            y0 = parent.y0 + labelLength;
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

/**
 * Inset every node (including the root) by `margin/2` on each side, after the
 * squarify pass has finished. Because a node and its siblings are all shrunk
 * uniformly, two adjacent siblings end up separated by a full `margin`, while
 * the outer gap between a node and its children stays `margin` as well. This
 * mirrors the `applySiblingMargin` step of the CodeCharta improved algorithm.
 */
export function shrink(node: SquarifyNode, margin: number): void {
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

    for (const child of node.children) {
        shrink(child, margin);
    }
}
