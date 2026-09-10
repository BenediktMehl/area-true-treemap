// d3-hierarchy-compatible API over the CodeCharta improved squarify algorithm
export { hierarchy } from "./hierarchy";
export type { HierarchyNode, HierarchyLink, HierarchyChildrenAccessor } from "./hierarchy";
export { treemap } from "./algorithm/treemap";
export type { Treemap, AreaValue } from "./algorithm/treemap";

// Algorithm options
export { SortingOption, OrderOption } from "./algorithm/squarify";
export type { LabelLength, LabelSizeResolver, SquarifyNode } from "./algorithm/squarify";

// CodeCharta floor-label sizing (for treemap().labelLength(...))
export { DEFAULT_FLOOR_LABEL_CONFIG, getFloorLabelPadding } from "./config/floor-label";
export type { FloorLabelConfig } from "./config/floor-label";
