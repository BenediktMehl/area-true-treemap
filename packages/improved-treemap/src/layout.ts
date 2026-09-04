import { squarify, SquarifyNode } from "./squarify";
import { TreemapConfig, TreemapConfigBuilder } from "./config";
import { LayoutOptions, TreeNode, TreemapRect } from "./types";

/**
 * High-level entry point for the area-true treemap layout.
 *
 * ```ts
 * const layout = new TreemapLayout(TreemapConfigBuilder ...build());
 * const rects = layout.compute(tree, { width: 1000, height: 1000 });
 * ```
 */
export class TreemapLayout {
    private readonly config: TreemapConfig;

    constructor(config: TreemapConfig) {
        this.config = config;
    }

    /** Convenience shortcut for `new TreemapConfigBuilder()`. */
    static builder(): TreemapConfigBuilder {
        return new TreemapConfigBuilder();
    }

    /**
     * Lay out `tree` and return the flattened list of rectangles. The root
     * container itself is not included in the result.
     */
    compute(tree: TreeNode, options: LayoutOptions = {}): TreemapRect[] {
        const width = options.width ?? 1000;
        const height = options.height ?? width;
        const config = this.config;

        const root = this.toSquarifyNode(tree, 0);
        if (!root || root.value <= 0) {
            return [];
        }

        root.x0 = 0;
        root.y0 = 0;
        root.x1 = width;
        root.y1 = height;

        const shortSide = Math.min(width, height);
        const margin = config.margin * shortSide;
        const labelsEnabled = config.labels.topLevels > 0;
        const labelLength = config.labels.sizeRatio * shortSide;

        squarify(root, margin, config.sorting, labelsEnabled, labelLength, config.aspectRatio);

        return this.flatten(root);
    }

    private toSquarifyNode(node: TreeNode, depth: number): SquarifyNode | null {
        const config = this.config;

        // Merge single-child folder chains (collapseFolders).
        let current = node;
        if (config.collapseFolders && current.children && current.children.length === 1) {
            const child = current.children[0];
            if (child.children && child.children.length > 0) {
                const merged: TreeNode = { ...child, name: `${current.name}/${child.name}` };
                return this.toSquarifyNode(merged, depth);
            }
        }

        const children = (current.children ?? [])
            .map((child) => this.toSquarifyNode(child, depth + 1))
            .filter((child): child is SquarifyNode => child !== null && child.value > 0);

        const isLeaf = children.length === 0;
        const ownValue = current.attributes?.[config.areaMetric] ?? 0;
        const value = isLeaf ? ownValue : children.reduce((sum, child) => sum + child.value, 0);

        return {
            name: current.name,
            value,
            originalValue: value,
            depth,
            children,
            rows: [],
            hasLabel: !isLeaf && depth > 0 && depth <= config.labels.topLevels,
            x0: 0,
            y0: 0,
            x1: 0,
            y1: 0,
            attributes: current.attributes,
        };
    }

    private flatten(root: SquarifyNode): TreemapRect[] {
        const rects: TreemapRect[] = [];

        const walk = (node: SquarifyNode): void => {
            if (node.x1 > node.x0 && node.y1 > node.y0) {
                rects.push({
                    x: node.x0,
                    y: node.y0,
                    width: node.x1 - node.x0,
                    height: node.y1 - node.y0,
                    name: node.name,
                    depth: node.depth,
                    isLeaf: node.children.length === 0,
                    hasLabel: node.hasLabel,
                    value: node.originalValue,
                    attributes: node.attributes,
                });
            }
            for (const child of node.children) {
                walk(child);
            }
        };

        for (const child of root.children) {
            walk(child);
        }

        return rects;
    }
}
