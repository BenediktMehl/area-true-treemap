/**
 * Parameters for the variable (per-folder) floor-label sizing used by
 * `getFloorLabelPadding`.
 */
export interface FloorLabelConfig {
    /** Label strip scaling for the root folder (depth 0), as a fraction of its width. */
    rootScaling: number;
    /** Label strip scaling for sub-folders (depth > 0), as a fraction of their width. */
    subScaling: number;
    /** Minimum label strip thickness for the root folder (absolute layout units). */
    rootMin: number;
    /** Minimum label strip thickness for sub-folders (absolute layout units). */
    subMin: number;
    /** Maximum label strip thickness, as a fraction of the folder's width. */
    maxFraction: number;
}

/** Default floor-label sizing (root 3.5% / sub 2.8%, min 120/95, capped at 15%). */
export const DEFAULT_FLOOR_LABEL_CONFIG: FloorLabelConfig = {
    rootScaling: 0.035,
    subScaling: 0.028,
    rootMin: 120,
    subMin: 95,
    maxFraction: 0.15,
};

/**
 * Variable per-folder label size, `getFloorLabelPadding(folderWidth, depth)`:
 * proportional to the folder's own
 * width, clamped to a depth-dependent minimum, and never larger than a fixed
 * fraction of the folder. This is what lets differently sized folders reserve
 * differently sized label strips instead of one global label height.
 */
export function getFloorLabelPadding(
    folderWidth: number,
    depth: number,
    config: FloorLabelConfig = DEFAULT_FLOOR_LABEL_CONFIG,
): number {
    const labelScaling = depth === 0 ? config.rootScaling : config.subScaling;
    const minimumPadding = depth === 0 ? config.rootMin : config.subMin;
    return Math.min(Math.max(folderWidth * labelScaling, minimumPadding), folderWidth * config.maxFraction);
}
