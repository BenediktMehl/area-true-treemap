import { SortingOption, OrderOption, type LabelLength } from "../algorithm/squarify";

/**
 * Fully resolved configuration for the CodeCharta improved squarify algorithm.
 * All fields mirror the settings of the CodeCharta `Improved Squarifying`
 * layout.
 */
export interface AreaTrueTreemapConfig {
    /** Name of the attribute used for node area. */
    areaMetric: string;
    /** Raw margin value (the algorithm applies CodeCharta's internal scaling). */
    margin: number;
    /** Number of layout passes (1 = single pass, 2 = two-pass area-true, …). */
    numberOfPasses: number;
    /** Scale node values in the final pass. */
    scale: boolean;
    /** Use the simpler increase-values variant. */
    simpleIncreaseValues: boolean;
    /** Order in which siblings are placed. */
    sortingOption: SortingOption;
    /** How the row order is handled across passes. */
    orderOption: OrderOption;
    /** Increment the margin between passes instead of keeping it constant. */
    incrementMargin: boolean;
    /** Separate sibling nodes by a margin. */
    applySiblingMargin: boolean;
    /**
     * When {@link applySiblingMargin} is enabled, shrink only leaf nodes
     * instead of all nodes, so sibling gaps appear only between leaves and
     * not between folders (additive extension, not part of CodeCharta).
     */
    siblingMarginLeavesOnly?: boolean;
    /** Merge single-child folder chains. */
    collapseFolders: boolean;
    /** Reserve floor-label space. */
    enableFloorLabels: boolean;
    /** Number of top levels (including the root) that get a floor label. */
    amountOfTopLabels: number;
    /** Floor-label strip size: a fixed value or a per-node function. */
    labelLength: LabelLength;
}

export const DEFAULT_AREA_TRUE_CONFIG: AreaTrueTreemapConfig = {
    areaMetric: "size",
    margin: 10,
    numberOfPasses: 1,
    scale: false,
    simpleIncreaseValues: false,
    sortingOption: SortingOption.NONE,
    orderOption: OrderOption.NEW_ORDER,
    incrementMargin: false,
    applySiblingMargin: true,
    siblingMarginLeavesOnly: false,
    collapseFolders: false,
    enableFloorLabels: true,
    amountOfTopLabels: 2,
    labelLength: 1,
};

