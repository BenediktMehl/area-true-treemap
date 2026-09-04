export { TreemapLayout } from "./layout";
export { TreemapConfigBuilder, DEFAULT_CONFIG } from "./config";
export type { TreemapConfig, LabelConfig } from "./config";
export { SortingOption, LabelPosition, DEFAULT_ASPECT_RATIO } from "./squarify";
export type { TreeNode, TreemapRect, LayoutOptions } from "./types";

// d3-hierarchy-compatible API (drop-in for consumers like CodeCharta)
export { hierarchy } from "./hierarchy";
export type { HierarchyNode, HierarchyLink, HierarchyChildrenAccessor } from "./hierarchy";
export { treemap } from "./treemap";
export type { Treemap, AreaValue } from "./treemap";
