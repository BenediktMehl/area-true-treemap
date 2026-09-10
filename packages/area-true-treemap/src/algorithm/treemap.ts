/**
 * A fluent, d3-hierarchy-compatible treemap layout implementing the area-true
 * squarify algorithm.
 *
 * This is the drop-in entry point for consumers that already integrate a
 * treemap via `d3-hierarchy`. It mirrors that integration shape:
 *
 * ```ts
 * const layout = treemap<MyMapNode>()
 *     .size([width, height])
 *     .margin(0.02)                  // gap as a fraction of the map size
 *     .numberOfPasses(2)             // area-true two-pass layout
 *     .value((node) => area(node));  // optional: area accessor, like d3 .sum()
 *
 * const root = layout(hierarchy(map).sum((node) => area(node)));
 * // layout() returns the SAME tree; every node now carries x0/x1/y0/y1
 * ```
 *
 * The layout mutates the passed hierarchy in place (exactly like `d3-treemap`)
 * and returns the root. Every node - leaf and folder - receives `x0`, `x1`,
 * `y0` and `y1` in the units of the configured `size()`; the original data
 * stays available on `node.data`.
 */

import type { HierarchyNode } from "../hierarchy";
import {
    SortingOption,
    OrderOption,
    type SquarifyNode,
    type LabelLength,
    type LabelSizeResolver,
} from "./squarify";
import { runLayout } from "./engine";

/** Area accessor: maps a data node to its numeric area value. */
export type AreaValue<T> = (node: T) => number;

/** A callable treemap layout with chainable configuration methods. */
export interface Treemap<T> {
    (root: HierarchyNode<T>): HierarchyNode<T>;

    /** Set the output size (in layout units). Defaults to 1000x1000. */
    size(width: number, height: number): this;
    size(size: [number, number]): this;

    /**
     * Set the area accessor. Equivalent to calling `.sum(accessor)` on the
     * hierarchy, but kept on the layout so the whole configuration lives in one
     * place. If omitted, the layout reads the `value` already set by
     * `hierarchy(data).sum(accessor)`.
     */
    value(accessor: AreaValue<T>): this;

    /**
     * Number of layout passes. 1 = single squarify pass (baseline), 2+ = the
     * area-true multi-pass layout in which margins and floor labels take
     * effect. Defaults to 2.
     */
    numberOfPasses(passes: number): this;

    /**
     * Target gap between sibling nodes as a fraction (0..1) of the map size.
     * Defaults to 0.02 (~2% of the map).
     */
    margin(fraction: number): this;

    /** Enable or disable the gap between sibling nodes (default true). */
    applySiblingMargin(value: boolean): this;

    /**
     * When sibling margins are on, shrink only leaf nodes, so gaps appear only
     * between leaves and not between folders (default false).
     */
    siblingMarginLeavesOnly(value: boolean): this;

    /**
     * Reserve floor-label space on the top `topLevels` folder levels
     * (including the root). `0` disables labels. Defaults to 2.
     */
    floorLabels(topLevels: number): this;

    /**
     * Floor-label strip size. A number is interpreted as a fraction (0..1) of
     * the map size. A function is evaluated per folder during layout and
     * returns the strip size in the units of `size()` (see
     * `getFloorLabelPadding` for the per-folder formula).
     */
    labelLength(value: number | LabelSizeResolver): this;

    /**
     * Scaling onto the parent area: in the final pass the children are scaled
     * onto the actually available parent area. Keeps layouts valid (default
     * true); turning it off lets children overflow their parent, which is what
     * the invalid-layout comparison in the thesis shows.
     */
    scale(value: boolean): this;

    /** Use the simpler absolute size adjustment between the passes (default false). */
    simpleIncreaseValues(value: boolean): this;

    /** Increase the margin gradually across passes (>2 passes, default false). */
    incrementMargin(value: boolean): this;

    /** Order in which siblings are placed (default descending). */
    sorting(option: SortingOption): this;

    /** How the row order is handled across passes (default new order). */
    order(option: OrderOption): this;

    /** Merge single-child folder chains (default false). */
    collapseFolders(value: boolean): this;

    /** Round coordinates to integers after layout (default false). */
    round(value: boolean): this;
}

/** Internal configuration state for a {@link Treemap} layout. */
interface TreemapState<T> {
    width: number;
    height: number;
    valueAccessor?: AreaValue<T>;
    numberOfPasses: number;
    scale: boolean;
    simpleIncreaseValues: boolean;
    incrementMargin: boolean;
    marginFraction: number;
    applySiblingMargin: boolean;
    siblingMarginLeavesOnly: boolean;
    topLabelLevels: number;
    labelLengthValue: number;
    labelResolver?: LabelSizeResolver;
    sortingOption: SortingOption;
    orderOption: OrderOption;
    collapseFolders: boolean;
    round: boolean;
}

/** A squarify node paired with the hierarchy nodes it was built from. */
interface BuiltNode<T> {
    sq: SquarifyNode;
    targets: HierarchyNode<T>[];
}

/**
 * Create a new, reusable treemap layout. Call it with a {@link HierarchyNode}
 * root to lay the tree out in place and get that root back.
 */
export function treemap<T>(): Treemap<T> {
    const state: TreemapState<T> = {
        width: 1000,
        height: 1000,
        numberOfPasses: 2,
        scale: true,
        simpleIncreaseValues: false,
        incrementMargin: false,
        marginFraction: 0.02,
        applySiblingMargin: true,
        siblingMarginLeavesOnly: false,
        topLabelLevels: 2,
        labelLengthValue: 0.03,
        sortingOption: SortingOption.DESCENDING,
        orderOption: OrderOption.NEW_ORDER,
        collapseFolders: false,
        round: false,
    };

    function layout(root: HierarchyNode<T>): HierarchyNode<T> {
        if (state.valueAccessor) {
            root.sum(state.valueAccessor);
        }

        const { sq } = build(root, 0, state);
        if (sq.value <= 0) {
            return root;
        }

        // Work in a pixel-like domain: scale the values so that the layout
        // square (sqrt of the total value) matches the configured width. Every
        // margin/label size below is then expressed directly in size() units.
        const total = sq.value;
        const k = (state.width * state.width) / total;
        scaleValues(sq, k);

        const labelsEnabled = state.topLabelLevels > 0;
        const margin = state.marginFraction * state.width;
        const labelLength: LabelLength = state.labelResolver ?? state.labelLengthValue * state.width;

        runLayout(sq, {
            margin,
            numberOfPasses: state.numberOfPasses,
            scale: state.scale,
            simpleIncreaseValues: state.simpleIncreaseValues,
            sortingOption: state.sortingOption,
            orderOption: state.orderOption,
            incrementMargin: state.incrementMargin,
            applySiblingMargin: state.applySiblingMargin,
            siblingMarginLeavesOnly: state.siblingMarginLeavesOnly,
            labelsEnabled,
            labelLength,
        });

        // Map the resulting root box onto the exact requested size.
        const rootX = sq.x0;
        const rootY = sq.y0;
        const factorX = state.width / (sq.x1 - sq.x0);
        const factorY = state.height / (sq.y1 - sq.y0);
        writeBack(sq, rootX, rootY, factorX, factorY, state.round);
        return root;
    }

    layout.size = ((w: number | [number, number], h?: number) => {
        if (Array.isArray(w)) {
            state.width = w[0];
            state.height = w[1];
        } else {
            state.width = w;
            state.height = h ?? w;
        }
        return layout;
    }) as Treemap<T>["size"];

    layout.value = (accessor: AreaValue<T>) => {
        state.valueAccessor = accessor;
        return layout;
    };

    layout.numberOfPasses = (passes: number) => {
        if (!Number.isInteger(passes) || passes < 1) {
            throw new Error("numberOfPasses(): must be a positive integer, got " + passes);
        }
        state.numberOfPasses = passes;
        return layout;
    };

    layout.margin = (fraction: number) => {
        assertRange(fraction, 0, 1, "margin");
        state.marginFraction = fraction;
        return layout;
    };

    layout.applySiblingMargin = (value: boolean) => {
        state.applySiblingMargin = value;
        return layout;
    };

    layout.siblingMarginLeavesOnly = (value: boolean) => {
        state.siblingMarginLeavesOnly = value;
        return layout;
    };

    layout.floorLabels = (topLevels: number) => {
        if (!Number.isInteger(topLevels) || topLevels < 0) {
            throw new Error("floorLabels(): topLevels must be a non-negative integer, got " + topLevels);
        }
        state.topLabelLevels = topLevels;
        return layout;
    };

    layout.labelLength = (value: number | LabelSizeResolver) => {
        if (typeof value === "number") {
            assertRange(value, 0, 1, "labelLength");
            state.labelLengthValue = value;
            state.labelResolver = undefined;
        } else if (typeof value === "function") {
            state.labelResolver = value;
        } else {
            throw new Error("labelLength(): expected a number or function, got " + typeof value);
        }
        return layout;
    };

    layout.scale = (value: boolean) => {
        state.scale = value;
        return layout;
    };

    layout.simpleIncreaseValues = (value: boolean) => {
        state.simpleIncreaseValues = value;
        return layout;
    };

    layout.incrementMargin = (value: boolean) => {
        state.incrementMargin = value;
        return layout;
    };

    layout.sorting = (option: SortingOption) => {
        state.sortingOption = option;
        return layout;
    };

    layout.order = (option: OrderOption) => {
        state.orderOption = option;
        return layout;
    };

    layout.collapseFolders = (value: boolean) => {
        state.collapseFolders = value;
        return layout;
    };

    layout.round = (value: boolean) => {
        state.round = value;
        return layout;
    };

    return layout;
}

/**
 * Build the internal squarify tree from the wrapped hierarchy.
 *
 * When `collapseFolders` is enabled, single-child folder chains are folded into
 * their deepest node; every folded ancestor shares the resulting rectangle, so
 * no information is lost and the hierarchy contract is preserved.
 */
function build<T>(node: HierarchyNode<T>, depth: number, state: TreemapState<T>): BuiltNode<T> {
    const targets: HierarchyNode<T>[] = [node];
    let current = node;

    if (state.collapseFolders) {
        while (current.children && current.children.length === 1) {
            const child = current.children[0];
            if (!child.children || child.children.length === 0) {
                break;
            }
            targets.push(child);
            current = child;
        }
    }

    const children = (current.children ?? [])
        .map((child) => build(child, depth + 1, state))
        .filter((built) => built.sq.value > 0);

    const isLeaf = children.length === 0;
    const value = isLeaf ? current.value ?? 0 : children.reduce((sum, built) => sum + built.sq.value, 0);
    const labelsEnabled = state.topLabelLevels > 0;

    const sq: SquarifyNode = {
        name: (current.data as { name?: string }).name ?? "",
        value,
        originalValue: value,
        depth,
        children: children.map((built) => built.sq),
        rows: [],
        hasLabel: !isLeaf && labelsEnabled && depth < state.topLabelLevels,
        x0: 0,
        y0: 0,
        x1: 0,
        y1: 0,
        data: targets,
    };

    return { sq, targets };
}

/** Scale every value so that sqrt(total) matches the configured width. */
function scaleValues(node: SquarifyNode, k: number): void {
    node.value *= k;
    node.originalValue *= k;
    for (const child of node.children) {
        scaleValues(child, k);
    }
}

/**
 * Copy the layout coordinates from the squarify tree back onto the hierarchy
 * nodes, mapping the root box onto the requested size.
 */
function writeBack<T>(
    sq: SquarifyNode,
    rootX: number,
    rootY: number,
    factorX: number,
    factorY: number,
    round: boolean,
): void {
    let x0 = (sq.x0 - rootX) * factorX;
    let y0 = (sq.y0 - rootY) * factorY;
    let x1 = (sq.x1 - rootX) * factorX;
    let y1 = (sq.y1 - rootY) * factorY;
    if (round) {
        x0 = Math.round(x0);
        y0 = Math.round(y0);
        x1 = Math.round(x1);
        y1 = Math.round(y1);
    }
    const targets = sq.data as HierarchyNode<T>[] | undefined;
    if (targets) {
        for (const target of targets) {
            target.x0 = x0;
            target.y0 = y0;
            target.x1 = x1;
            target.y1 = y1;
        }
    }
    for (const child of sq.children) {
        writeBack(child, rootX, rootY, factorX, factorY, round);
    }
}

function assertRange(value: number, min: number, max: number, name: string): void {
    if (typeof value !== "number" || Number.isNaN(value) || value < min || value > max) {
        throw new Error(name + "(): value must be between " + min + " and " + max + ", got " + value);
    }
}
