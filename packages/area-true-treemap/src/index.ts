// CodeCharta improved squarify layout (1:1 port)
export { AreaTrueTreemapLayout } from "./algorithm/layout";
export { DEFAULT_AREA_TRUE_CONFIG } from "./config/area-true-config";
export type { AreaTrueTreemapConfig } from "./config/area-true-config";
export { AreaTrueTreemapConfigBuilder } from "./config/area-true-config-builder";
export { generateAreaTrueSquarifyLayoutNodes, MARGIN_DIVISOR } from "./algorithm/startAlgo";
export { OrderOption, SortingOption as AreaTrueSortingOption } from "./algorithm/squarify";
export type { LabelLength as AreaTrueLabelLength, LabelSizeResolver as AreaTrueLabelSizeResolver } from "./algorithm/squarify";

// CodeCharta floor-label sizing (for AreaTrueTreemapConfigBuilder.labelLength)
export { DEFAULT_FLOOR_LABEL_CONFIG, getFloorLabelPadding } from "./config/floor-label";
export type { FloorLabelConfig } from "./config/floor-label";

// Shared input/output types
export type { TreeNode, TreemapRect } from "./types";
