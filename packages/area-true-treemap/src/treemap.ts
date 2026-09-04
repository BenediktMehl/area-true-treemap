import { HierarchyNode } from "./hierarchy";
import { squarify, SquarifyNode, SortingOption, LabelPosition, DEFAULT_ASPECT_RATIO } from "./squarify";

/**
 * A fluent, `d3-hierarchy`-compatible treemap layout.
 *
 * This is the drop-in entry point for consumers that already integrate a
 * treemap via `d3-hierarchy` (e.g. CodeCharta). It mirrors that integration
 * shape:
 *
 * ```ts
 * const layout = treemap<CodeMapNode>()
 *     .size([width, height])
 *     .value(node => calculateAreaValue(node)); // area accessor, like d3's .sum()
 *
 * const root = layout(hierarchy(map)); // returns the SAME tree, with x0/x1/y0/y1
 * for (const node of root.descendants()) { /* node.x0, node.x1, node.y0, node.y1, node.data *\/ }
 * ```
 *
 * The layout mutates the passed hierarchy in place (exactly like `d3-treemap`)
 * and returns the root. Every node — leaf and folder — receives `x0`, `x1`,
 * `y0` and `y1`; the original data stays available on `node.data`.
 */

/** Area accessor: maps a data node to its numeric area value. */
export type AreaValue<T> = (node: T) => number;

/** A callable treemap layout with chainable configuration methods. */
export interface Treemap<T> {
    (root: HierarchyNode<T>): HierarchyNode<T>;

    /** Set the layout size (in layout units). Defaults to 1000×1000. */
    size(width: number, height: number): this;
    size(size: [number, number]): this;

    /**
     * Set the area accessor. Equivalent to calling `.sum(accessor)` on the
     * hierarchy, but kept on the layout so the whole configuration lives in one
     * place. If omitted, the layout reads the `value` already set by
     * `hierarchy(data).sum(accessor)`.
     */
    value(accessor: AreaValue<T>): this;

    /** Relative gap (0..1) between sibling nodes, as a fraction of the canvas. */
    margin(fraction: number): this;

    /** Reserve space for folder labels on the top `topLevels` levels. */
    labels(topLevels: number, sizeRatio?: number): this;

    /** Where folder labels are placed. */
    labelPosition(position: LabelPosition): this;

    /** Merge single-child folder chains. Defaults to `false` (hierarchy-preserving). */
    collapseFolders(value: boolean): this;

    /** Order in which siblings are placed. */
    sorting(option: SortingOption): this;

    /** Target aspect ratio for the squarify heuristic. */
    aspectRatio(ratio: number): this;

    /** Round coordinates to integers after layout. */
    round(value: boolean): this;
}

/** Internal configuration state for a {@link Treemap} layout. */
interface TreemapState<T> {
    width: number;
    height: number;
    valueAccessor?: AreaValue<T>;
    marginFraction: number;
    labelTopLevels: number;
    labelSizeRatio: number;
    labelPosition: LabelPosition;
    collapseFolders: boolean;
    sortingOption: SortingOption;
    aspectRatio: number;
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
        marginFraction: 0.015,
        labelTopLevels: 3,
        labelSizeRatio: 0.05,
        labelPosition: LabelPosition.TOP,
        collapseFolders: false,
        sortingOption: SortingOption.DESCENDING,
        aspectRatio: DEFAULT_ASPECT_RATIO,
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

        sq.x0 = 0;
        sq.y0 = 0;
        sq.x1 = state.width;
        sq.y1 = state.height;

        const shortSide = Math.min(state.width, state.height);
        const margin = state.marginFraction * shortSide;
        const labelsEnabled = state.labelTopLevels > 0;
        const labelLength = state.labelSizeRatio * shortSide;

        squarify(sq, margin, state.sortingOption, labelsEnabled, labelLength, state.labelPosition, state.aspectRatio);

        writeBack(sq, state.round);
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

    layout.margin = (fraction: number) => {
        assertRange(fraction, 0, 1, "margin");
        state.marginFraction = fraction;
        return layout;
    };

    layout.labels = (topLevels: number, sizeRatio?: number) => {
        if (!Number.isInteger(topLevels) || topLevels < 0) {
            throw new Error(`labels(): topLevels must be a non-negative integer, got ${topLevels}`);
        }
        if (sizeRatio !== undefined) {
            assertRange(sizeRatio, 0, 1, "labels sizeRatio");
            state.labelSizeRatio = sizeRatio;
        }
        state.labelTopLevels = topLevels;
        return layout;
    };

    layout.labelPosition = (position: LabelPosition) => {
        state.labelPosition = position;
        return layout;
    };

    layout.collapseFolders = (value: boolean) => {
        state.collapseFolders = value;
        return layout;
    };

    layout.sorting = (option: SortingOption) => {
        state.sortingOption = option;
        return layout;
    };

    layout.aspectRatio = (ratio: number) => {
        if (!(ratio > 0) || !Number.isFinite(ratio)) {
            throw new Error(`aspectRatio(): value must be a positive finite number, got ${ratio}`);
        }
        state.aspectRatio = ratio;
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

    const sq: SquarifyNode = {
        name: "",
        value,
        originalValue: value,
        depth,
        children: children.map((built) => built.sq),
        rows: [],
        hasLabel: !isLeaf && depth > 0 && depth <= state.labelTopLevels,
        x0: 0,
        y0: 0,
        x1: 0,
        y1: 0,
        data: targets,
    };

    return { sq, targets };
}

/** Copy layout coordinates from the squarify tree back onto the hierarchy nodes. */
function writeBack<T>(sq: SquarifyNode, round: boolean): void {
    if (round) {
        sq.x0 = Math.round(sq.x0);
        sq.y0 = Math.round(sq.y0);
        sq.x1 = Math.round(sq.x1);
        sq.y1 = Math.round(sq.y1);
    }

    const targets = sq.data as HierarchyNode<T>[];
    for (const target of targets) {
        target.x0 = sq.x0;
        target.y0 = sq.y0;
        target.x1 = sq.x1;
        target.y1 = sq.y1;
    }

    for (const child of sq.children) {
        writeBack(child, round);
    }
}

function assertRange(value: number, min: number, max: number, name: string): void {
    if (typeof value !== "number" || Number.isNaN(value) || value < min || value > max) {
        throw new Error(`${name}(): value must be between ${min} and ${max}, got ${value}`);
    }
}
