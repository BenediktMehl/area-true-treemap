/**
 * A generic, `d3-hierarchy`-compatible tree wrapper.
 *
 * `hierarchy()` takes any plain object with a `children` array and wraps it in
 * a node object that exposes the traversal helpers (`each`, `eachAfter`,
 * `descendants`, …) and value/coordinate fields that a treemap layout needs.
 *
 * This is the piece that makes `area-true-treemap` a near drop-in replacement
 * for `d3-hierarchy` in consumers such as CodeCharta: the consumer passes its
 * own node type unchanged (e.g. `CodeMapNode`), sets an area accessor via
 * `.sum()`, runs the layout, and reads `x0/x1/y0/y1` off the very same tree it
 * passed in — the original data stays untouched on `.data`.
 */

/** A link between a child node and its parent. */
export interface HierarchyLink<T> {
    source: HierarchyNode<T>;
    target: HierarchyNode<T>;
}

/** Returns the children of a data node, or `undefined` for a leaf. */
export type HierarchyChildrenAccessor<T> = (node: T) => T[] | undefined;

/** A single node of the wrapped hierarchy. */
export interface HierarchyNode<T> {
    /** The original, untouched data object this node wraps. */
    data: T;
    /** Distance from the root (the root has depth 0). */
    depth: number;
    /** Distance to the deepest descendant (a leaf has height 0). */
    height: number;
    /** The parent node, or `null` for the root. */
    parent: HierarchyNode<T> | null;
    /** Child nodes; `undefined` for leaves. */
    children?: HierarchyNode<T>[];
    /** The aggregated value (set by `sum()` or `count()`). */
    value?: number;
    /** Layout coordinates, assigned by the treemap layout. */
    x0?: number;
    y0?: number;
    x1?: number;
    y1?: number;

    /** Visit every node in pre-order (depth-first). */
    each(callback: (node: HierarchyNode<T>) => void): this;
    /** Visit every node in post-order (children before their parent). */
    eachAfter(callback: (node: HierarchyNode<T>) => void): this;
    /** Visit every node in pre-order (depth-first). */
    eachBefore(callback: (node: HierarchyNode<T>) => void): this;
    /**
     * Set each node's `value` to `accessor(node.data)` plus the sum of its
     * children's values (post-order). This mirrors `d3-hierarchy`'s `sum()`.
     */
    sum(accessor: (data: T) => number): this;
    /** Set each node's `value` to the number of its descendants plus one. */
    count(): this;
    /** Sort siblings in place using `compare`. */
    sort(compare: (a: HierarchyNode<T>, b: HierarchyNode<T>) => number): this;
    /** The nodes on the path from this node down to (and including) `target`. */
    path(target: HierarchyNode<T>): HierarchyNode<T>[];
    /** The ancestors of this node, from the parent up to the root. */
    ancestors(): HierarchyNode<T>[];
    /** This node and all of its descendants, in pre-order. */
    descendants(): HierarchyNode<T>[];
    /** All leaf nodes below this node, in pre-order. */
    leaves(): HierarchyNode<T>[];
    /** Every parent→child link in the subtree. */
    links(): HierarchyLink<T>[];
    /** The first node (in pre-order) for which `filter` returns true. */
    find(filter: (node: HierarchyNode<T>) => boolean): HierarchyNode<T> | undefined;

    [Symbol.iterator](): Iterator<HierarchyNode<T>>;
}

class HierarchyNodeImpl<T> implements HierarchyNode<T> {
    data: T;
    depth: number;
    height: number;
    parent: HierarchyNode<T> | null;
    children?: HierarchyNode<T>[];
    value?: number;
    x0?: number;
    y0?: number;
    x1?: number;
    y1?: number;

    constructor(data: T, parent: HierarchyNode<T> | null, depth: number, height: number) {
        this.data = data;
        this.parent = parent;
        this.depth = depth;
        this.height = height;
    }

    each(callback: (node: HierarchyNode<T>) => void): this {
        for (const node of this) {
            callback(node);
        }
        return this;
    }

    eachBefore(callback: (node: HierarchyNode<T>) => void): this {
        let node: HierarchyNode<T> | undefined = this;
        const stack: HierarchyNode<T>[] = [node];
        while ((node = stack.pop())) {
            callback(node);
            if (node.children) {
                for (let i = node.children.length - 1; i >= 0; --i) {
                    stack.push(node.children[i]);
                }
            }
        }
        return this;
    }

    eachAfter(callback: (node: HierarchyNode<T>) => void): this {
        let node: HierarchyNode<T> | undefined = this;
        const nodes: HierarchyNode<T>[] = [node];
        const next: HierarchyNode<T>[] = [];
        while ((node = nodes.pop())) {
            next.push(node);
            if (node.children) {
                for (const child of node.children) {
                    nodes.push(child);
                }
            }
        }
        while ((node = next.pop())) {
            callback(node);
        }
        return this;
    }

    sum(accessor: (data: T) => number): this {
        return this.eachAfter((node) => {
            let sum = Number(accessor(node.data)) || 0;
            const children = node.children;
            if (children) {
                for (const child of children) {
                    sum += child.value ?? 0;
                }
            }
            node.value = sum;
        });
    }

    count(): this {
        return this.eachAfter((node) => {
            const children = node.children;
            node.value = children ? children.reduce((sum, child) => sum + (child.value ?? 0), 0) + 1 : 1;
        });
    }

    sort(compare: (a: HierarchyNode<T>, b: HierarchyNode<T>) => number): this {
        return this.eachBefore((node) => {
            if (node.children) {
                node.children.sort(compare);
            }
        });
    }

    path(target: HierarchyNode<T>): HierarchyNode<T>[] {
        const path: HierarchyNode<T>[] = [];
        let node: HierarchyNode<T> | null = target;
        while (node && node !== this) {
            path.push(node);
            node = node.parent;
        }
        if (node !== this) {
            throw new Error("target is not a descendant of this node");
        }
        return path.reverse();
    }

    ancestors(): HierarchyNode<T>[] {
        const ancestors: HierarchyNode<T>[] = [];
        let node = this.parent;
        while (node) {
            ancestors.push(node);
            node = node.parent;
        }
        return ancestors;
    }

    descendants(): HierarchyNode<T>[] {
        return Array.from(this);
    }

    leaves(): HierarchyNode<T>[] {
        const leaves: HierarchyNode<T>[] = [];
        this.eachBefore((node) => {
            if (!node.children) {
                leaves.push(node);
            }
        });
        return leaves;
    }

    links(): HierarchyLink<T>[] {
        const links: HierarchyLink<T>[] = [];
        const root = this;
        this.each((node) => {
            if (node !== root && node.parent) {
                links.push({ source: node.parent, target: node });
            }
        });
        return links;
    }

    find(filter: (node: HierarchyNode<T>) => boolean): HierarchyNode<T> | undefined {
        let found: HierarchyNode<T> | undefined;
        this.each((node) => {
            if (!found && filter(node)) {
                found = node;
            }
        });
        return found;
    }

    *[Symbol.iterator](): Iterator<HierarchyNode<T>> {
        const stack: HierarchyNode<T>[] = [this];
        let node: HierarchyNode<T> | undefined;
        while ((node = stack.pop())) {
            yield node;
            if (node.children) {
                for (let i = node.children.length - 1; i >= 0; --i) {
                    stack.push(node.children[i]);
                }
            }
        }
    }
}

const defaultChildrenAccessor = <T>(node: T): T[] | undefined => (node as { children?: T[] }).children;

/**
 * Wrap `data` (and its `children` tree) in a {@link HierarchyNode}.
 *
 * The `children` accessor defaults to reading a `children` property off each
 * node, so plain `{ children: [...] }` trees — including CodeCharta's
 * `CodeMapNode` — work without any adaptation.
 */
export function hierarchy<T>(data: T, children: HierarchyChildrenAccessor<T> = defaultChildrenAccessor): HierarchyNode<T> {
    return buildHierarchy(data, null, 0, children);
}

function buildHierarchy<T>(
    data: T,
    parent: HierarchyNode<T> | null,
    depth: number,
    childrenAccessor: HierarchyChildrenAccessor<T>,
): HierarchyNode<T> {
    const node = new HierarchyNodeImpl<T>(data, parent, depth, 0);
    const children = childrenAccessor(data);

    if (children && children.length > 0) {
        const childNodes = children.map((child) => buildHierarchy(child, node, depth + 1, childrenAccessor));
        node.children = childNodes;
        node.height = 1 + Math.max(...childNodes.map((child) => child.height));
    }

    return node;
}
