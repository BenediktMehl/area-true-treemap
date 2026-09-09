import { SortingOption, OrderOption, LabelLength, LabelSizeResolver } from "./squarify";

/**
 * Fully resolved configuration for the CodeCharta improved squarify algorithm.
 * All fields mirror the settings of the CodeCharta `Improved Squarifying`
 * layout.
 */
export interface ImprovedTreemapConfig {
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

export const DEFAULT_IMPROVED_CONFIG: ImprovedTreemapConfig = {
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

/** Fluent builder for {@link ImprovedTreemapConfig}. */
export class ImprovedTreemapConfigBuilder {
    private readonly config: ImprovedTreemapConfig;

    constructor() {
        this.config = { ...DEFAULT_IMPROVED_CONFIG };
    }

    areaMetric(value: string): this {
        this.config.areaMetric = value;
        return this;
    }

    margin(value: number): this {
        assertNonNegative(value, "margin");
        this.config.margin = value;
        return this;
    }

    numberOfPasses(value: number): this {
        if (!Number.isInteger(value) || value < 1) {
            throw new Error(`numberOfPasses(): must be a positive integer, got ${value}`);
        }
        this.config.numberOfPasses = value;
        return this;
    }

    scale(value: boolean): this {
        this.config.scale = value;
        return this;
    }

    simpleIncreaseValues(value: boolean): this {
        this.config.simpleIncreaseValues = value;
        return this;
    }

    sorting(option: SortingOption): this {
        this.config.sortingOption = option;
        return this;
    }

    order(option: OrderOption): this {
        this.config.orderOption = option;
        return this;
    }

    incrementMargin(value: boolean): this {
        this.config.incrementMargin = value;
        return this;
    }

    applySiblingMargin(value: boolean): this {
        this.config.applySiblingMargin = value;
        return this;
    }

    /** When sibling margins are on, shrink only leaf nodes (gaps between leaves, not folders). */
    siblingMarginLeavesOnly(value: boolean): this {
        this.config.siblingMarginLeavesOnly = value;
        return this;
    }

    collapseFolders(value: boolean): this {
        this.config.collapseFolders = value;
        return this;
    }

    floorLabels(enabled: boolean): this {
        this.config.enableFloorLabels = enabled;
        return this;
    }

    amountOfTopLabels(value: number): this {
        if (!Number.isInteger(value)) {
            throw new Error(`amountOfTopLabels(): must be an integer, got ${value}`);
        }
        this.config.amountOfTopLabels = value;
        return this;
    }

    /** Fixed floor-label strip size. */
    labelLength(value: number): this;
    /** Per-node floor-label strip size function. */
    labelLength(value: LabelSizeResolver): this;
    labelLength(value: LabelLength): this {
        if (typeof value === "number") {
            assertNonNegative(value, "labelLength");
        } else if (typeof value !== "function") {
            throw new Error(`labelLength(): expected a number or function, got ${typeof value}`);
        }
        this.config.labelLength = value;
        return this;
    }

    build(): ImprovedTreemapConfig {
        return { ...this.config };
    }
}

function assertNonNegative(value: number, name: string): void {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new Error(`${name}(): must be a non-negative finite number, got ${value}`);
    }
}
