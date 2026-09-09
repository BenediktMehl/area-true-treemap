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
export { AreaTrueTreemapLayout } from "./area-true-treemap/layout";
export { AreaTrueTreemapConfigBuilder, DEFAULT_AREA_TRUE_CONFIG } from "./area-true-treemap/config";
export type { AreaTrueTreemapConfig } from "./area-true-treemap/config";
export { generateAreaTrueSquarifyLayoutNodes, MARGIN_DIVISOR } from "./area-true-treemap/startAlgo";
export { OrderOption, SortingOption as AreaTrueSortingOption } from "./area-true-treemap/squarify";
export type { LabelLength as AreaTrueLabelLength, LabelSizeResolver as AreaTrueLabelSizeResolver } from "./area-true-treemap/squarify";
