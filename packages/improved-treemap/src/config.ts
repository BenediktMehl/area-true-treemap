import { SortingOption, DEFAULT_ASPECT_RATIO } from "./squarify";

/** Label configuration: which hierarchy levels get labels and how tall they are. */
export interface LabelConfig {
    /** Number of top hierarchy levels that reserve space for a folder label. */
    topLevels: number;
    /** Label height as a fraction (0..1) of the shorter canvas side. */
    sizeRatio: number;
}

/** Fully resolved, immutable layout configuration. */
export interface TreemapConfig {
    /** Name of the attribute used for node area (default `"size"`). */
    areaMetric: string;
    /** Relative gap (0..1) between sibling nodes, as a fraction of the canvas. */
    margin: number;
    /** Merge single-child folder chains into a combined name. */
    collapseFolders: boolean;
    /** Order in which siblings are placed. */
    sorting: SortingOption;
    /** Folder label settings. */
    labels: LabelConfig;
    /** Target aspect ratio for the squarify heuristic. */
    aspectRatio: number;
}

export const DEFAULT_CONFIG: TreemapConfig = {
    areaMetric: "size",
    margin: 0.015,
    collapseFolders: true,
    sorting: SortingOption.DESCENDING,
    labels: { topLevels: 3, sizeRatio: 0.05 },
    aspectRatio: DEFAULT_ASPECT_RATIO,
};

/**
 * Fluent builder for {@link TreemapConfig}.
 *
 * ```ts
 * const config = new TreemapConfigBuilder()
 *     .areaMetric("size")
 *     .margin(0.02)
 *     .sorting(SortingOption.DESCENDING)
 *     .labels(3, 0.05)
 *     .collapseFolders(true)
 *     .build();
 * ```
 */
export class TreemapConfigBuilder {
    private readonly config: TreemapConfig;

    constructor() {
        this.config = {
            ...DEFAULT_CONFIG,
            labels: { ...DEFAULT_CONFIG.labels },
        };
    }

    /** Set the attribute name used for the area of each node. */
    areaMetric(value: string): this {
        this.config.areaMetric = value;
        return this;
    }

    /**
     * Set the relative gap between nodes as a fraction (0..1) of the canvas.
     * For example `0.02` ≈ 2% relative distance.
     */
    margin(fraction: number): this {
        assertRange(fraction, 0, 1, "margin");
        this.config.margin = fraction;
        return this;
    }

    /** Enable or disable merging of single-child folder chains. */
    collapseFolders(value: boolean): this {
        this.config.collapseFolders = value;
        return this;
    }

    /** Set the order in which siblings are placed. */
    sorting(value: SortingOption): this {
        this.config.sorting = value;
        return this;
    }

    /**
     * Configure folder labels.
     *
     * @param topLevels Number of top hierarchy levels that get a label.
     * @param sizeRatio Label height as a fraction (0..1) of the canvas.
     */
    labels(topLevels: number, sizeRatio: number): this {
        if (!Number.isInteger(topLevels) || topLevels < 0) {
            throw new Error(`labels(): topLevels must be a non-negative integer, got ${topLevels}`);
        }
        assertRange(sizeRatio, 0, 1, "labels sizeRatio");
        this.config.labels = { topLevels, sizeRatio };
        return this;
    }

    /** Set the target aspect ratio used by the squarify heuristic (default 1.618). */
    aspectRatio(value: number): this {
        if (!(value > 0) || !Number.isFinite(value)) {
            throw new Error(`aspectRatio(): value must be a positive finite number, got ${value}`);
        }
        this.config.aspectRatio = value;
        return this;
    }

    /** Return a fully resolved, immutable copy of the configuration. */
    build(): TreemapConfig {
        return {
            ...this.config,
            labels: { ...this.config.labels },
        };
    }
}

function assertRange(value: number, min: number, max: number, name: string): void {
    if (typeof value !== "number" || Number.isNaN(value) || value < min || value > max) {
        throw new Error(`${name}(): value must be between ${min} and ${max}, got ${value}`);
    }
}
