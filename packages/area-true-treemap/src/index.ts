export { TreemapLayout } from "./layout";
export { TreemapConfigBuilder, DEFAULT_CONFIG } from "./config";
export type { TreemapConfig, LabelConfig } from "./config";
export {
    SortingOption,
    LabelPosition,
    DEFAULT_ASPECT_RATIO,
    DEFAULT_FLOOR_LABEL_CONFIG,
    getFloorLabelPadding,
    floorLabelSizeResolver,
} from "./squarify";
export type { FloorLabelConfig, LabelSizeResolver, SquarifyNode, SquarifyRow } from "./squarify";
export type { TreeNode, TreemapRect, LayoutOptions } from "./types";

// d3-hierarchy-compatible API (drop-in for consumers like CodeCharta)
export { hierarchy } from "./hierarchy";
export type { HierarchyNode, HierarchyLink, HierarchyChildrenAccessor } from "./hierarchy";
export { treemap } from "./treemap";
export type { Treemap, AreaValue } from "./treemap";

// CodeCharta improved squarify layout (1:1 port, additive)
export { ImprovedTreemapLayout } from "./improved/layout";
export { ImprovedTreemapConfigBuilder, DEFAULT_IMPROVED_CONFIG } from "./improved/config";
export type { ImprovedTreemapConfig } from "./improved/config";
export { generateImprovedSquarifyLayoutNodes } from "./improved/startAlgo";
export { OrderOption, SortingOption as ImprovedSortingOption } from "./improved/squarify";
export type { LabelLength as ImprovedLabelLength, LabelSizeResolver as ImprovedLabelSizeResolver } from "./improved/squarify";
