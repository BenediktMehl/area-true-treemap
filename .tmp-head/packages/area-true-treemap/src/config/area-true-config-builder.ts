import { DEFAULT_AREA_TRUE_CONFIG, type AreaTrueTreemapConfig } from "./area-true-config";
import type { LabelLength, LabelSizeResolver, OrderOption, SortingOption } from "../algorithm/squarify";

/** Fluent builder for {@link AreaTrueTreemapConfig}. */
export class AreaTrueTreemapConfigBuilder {
    private readonly config: AreaTrueTreemapConfig;

    constructor() {
        this.config = { ...DEFAULT_AREA_TRUE_CONFIG };
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

    build(): AreaTrueTreemapConfig {
        return { ...this.config };
    }
}

function assertNonNegative(value: number, name: string): void {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new Error(`${name}(): must be a non-negative finite number, got ${value}`);
    }
}
