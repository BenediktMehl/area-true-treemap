import { TreeNode, TreemapRect } from "../types";
import { ImprovedTreemapConfig, ImprovedTreemapConfigBuilder } from "./config";
import { generateImprovedSquarifyLayoutNodes } from "./startAlgo";

/**
 * Entry point for the CodeCharta improved squarify layout.
 *
 * ```ts
 * const config = ImprovedTreemapLayout.builder().margin(10).numberOfPasses(2).build();
 * const rects = new ImprovedTreemapLayout(config).compute(tree);
 * ```
 */
export class ImprovedTreemapLayout {
    private readonly config: ImprovedTreemapConfig;

    constructor(config: ImprovedTreemapConfig) {
        this.config = config;
    }

    /** Convenience shortcut for `new ImprovedTreemapConfigBuilder()`. */
    static builder(): ImprovedTreemapConfigBuilder {
        return new ImprovedTreemapConfigBuilder();
    }

    /**
     * Lay out `tree` and return the flattened list of rectangles. Coordinates
     * are in the algorithm's own unit (the layout square is `sqrt(totalValue)`
     * × `sqrt(totalValue)`); scale them to your canvas as needed. All nodes —
     * including the root — are included.
     */
    compute(tree: TreeNode): TreemapRect[] {
        return generateImprovedSquarifyLayoutNodes(tree, this.config);
    }
}
