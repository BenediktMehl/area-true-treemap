import type { TreeNode, TreemapRect } from "../types";
import type { AreaTrueTreemapConfig } from "../config/area-true-config";
import { AreaTrueTreemapConfigBuilder } from "../config/area-true-config-builder";
import { generateAreaTrueSquarifyLayoutNodes } from "./startAlgo";

/**
 * Entry point for the CodeCharta improved squarify layout.
 *
 * ```ts
 * const config = AreaTrueTreemapLayout.builder().margin(10).numberOfPasses(2).build();
 * const rects = new AreaTrueTreemapLayout(config).compute(tree);
 * ```
 */
export class AreaTrueTreemapLayout {
    private readonly config: AreaTrueTreemapConfig;

    constructor(config: AreaTrueTreemapConfig) {
        this.config = config;
    }

    /** Convenience shortcut for `new AreaTrueTreemapConfigBuilder()`. */
    static builder(): AreaTrueTreemapConfigBuilder {
        return new AreaTrueTreemapConfigBuilder();
    }

    /**
     * Lay out `tree` and return the flattened list of rectangles. Coordinates
     * are in the algorithm's own unit (the layout square is `sqrt(totalValue)`
     * × `sqrt(totalValue)`); scale them to your canvas as needed. All nodes —
     * including the root — are included.
     */
    compute(tree: TreeNode): TreemapRect[] {
        return generateAreaTrueSquarifyLayoutNodes(tree, this.config);
    }
}
