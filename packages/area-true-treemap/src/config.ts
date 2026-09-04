import {
    SortingOption,
    LabelPosition,
    DEFAULT_ASPECT_RATIO,
    DEFAULT_FLOOR_LABEL_CONFIG,
    FloorLabelConfig,
    LabelSizeResolver,
} from "./squarify";

/** Label configuration: which hierarchy levels get labels, how tall they are, and where they sit. */
export interface LabelConfig {
    /** Number of top hierarchy levels that reserve space for a folder label. */
    topLevels: number;
    /** Label height as a fraction (0..1) of the shorter canvas side (fixed mode). */
    sizeRatio: number;
    /** Where the label is placed relative to its node. */
    position: LabelPosition;
    /**
     * When set, labels use CodeCharta-style variable per-folder sizing instead of
     * the fixed `sizeRatio` (see {@link getFloorLabelPadding}). `undefined` = fixed mode.
     */
    floor?: FloorLabelConfig;
    /**
     * Custom label-size function, evaluated per node during layout (like
     * CodeCharta's `paddingRight(node => …)`). Takes precedence over `sizeRatio`
     * and `floor`. The function receives the folder node with its laid-out
     * `x0/x1/y0/y1`, `depth` and `name` and returns the strip thickness.
     */
    resolver?: LabelSizeResolver;
}

/** Fully resolved, immutable layout configuration. */
export interface TreemapConfig {
    /** Name of the attribute used for node area (default `"size"`). */
    areaMetric: string;
    /** Relative outer gap (0..1) between a node and its children, as a fraction of the canvas. */
    margin: number;
    /** When enabled, also inset every node by `margin/2` so siblings are separated by `margin`. */
    applySiblingMargin: boolean;
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
    applySiblingMargin: true,
    collapseFolders: true,
    sorting: SortingOption.DESCENDING,
    labels: { topLevels: 3, sizeRatio: 0.05, position: LabelPosition.TOP },
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
     * Set the relative outer gap between a node and its children as a fraction
     * (0..1) of the canvas. For example `0.02` ≈ 2% relative distance.
     */
    margin(fraction: number): this {
        assertRange(fraction, 0, 1, "margin");
        this.config.margin = fraction;
        return this;
    }

    /**
     * Enable or disable the gap between sibling nodes. When enabled, every node
     * is additionally inset by `margin/2` on each side (after the layout pass),
     * so two adjacent siblings end up separated by a full `margin`. The value is
     * reused from `margin` — there is no separate distance.
     */
    applySiblingMargin(value: boolean): this {
        this.config.applySiblingMargin = value;
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
        // Setting a fixed sizeRatio switches back to fixed (non-variable) labels.
        this.config.labels = { ...this.config.labels, topLevels, sizeRatio, floor: undefined, resolver: undefined };
        return this;
    }

    /**
     * Use CodeCharta-style variable (per-folder) floor-label sizing instead of a
     * single fixed label height. Each folder's label strip is proportional to the
     * folder's own width and clamped to a minimum/maximum (see
     * {@link getFloorLabelPadding}). Any parameter can be overridden; the defaults
     * match CodeCharta (root 3.5% / sub 2.8%, min 120/95, max 15% of the folder).
     */
    floorLabels(overrides: Partial<FloorLabelConfig> = {}): this {
        const floor = { ...DEFAULT_FLOOR_LABEL_CONFIG, ...overrides };
        assertNonNegative(floor.rootScaling, "rootScaling");
        assertNonNegative(floor.subScaling, "subScaling");
        assertNonNegative(floor.rootMin, "rootMin");
        assertNonNegative(floor.subMin, "subMin");
        assertNonNegative(floor.maxFraction, "maxFraction");
        this.config.labels = { ...this.config.labels, floor, resolver: undefined };
        return this;
    }

    /**
     * Pass a custom label-size function, evaluated per folder during layout.
     * This mirrors how CodeCharta configures its floor labels —
     * `treemap().paddingRight(node => getFloorLabelPadding(node.x1 - node.x0, node.depth))`
     * — and takes precedence over both `labels(sizeRatio)` and `floorLabels()`.
     */
    labelSize(resolver: LabelSizeResolver): this {
        if (typeof resolver !== "function") {
            throw new Error(`labelSize(): expected a function, got ${typeof resolver}`);
        }
        this.config.labels = { ...this.config.labels, resolver, floor: undefined };
        return this;
    }

    /** Set where folder labels are placed (top, bottom, left, or right). */
    labelPosition(position: LabelPosition): this {
        this.config.labels.position = position;
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
            labels: {
                ...this.config.labels,
                floor: this.config.labels.floor ? { ...this.config.labels.floor } : undefined,
            },
        };
    }
}

function assertRange(value: number, min: number, max: number, name: string): void {
    if (typeof value !== "number" || Number.isNaN(value) || value < min || value > max) {
        throw new Error(`${name}(): value must be between ${min} and ${max}, got ${value}`);
    }
}

function assertNonNegative(value: number, name: string): void {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new Error(`floorLabels(): ${name} must be a non-negative finite number, got ${value}`);
    }
}
