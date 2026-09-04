import { writable, derived } from 'svelte/store';
import { TreemapSettings, MarginPreset, LabelPreset } from '$lib/types';

// Margin preset store
export const marginPreset = writable<MarginPreset>('1%');

// Label presets (N = top N, L = size %)
export const labelPreset = writable<LabelPreset>({ topN: 3, sizePercent: 5 });

// Toggle: collapse single-child folder chains
export const collapseFolders = writable<boolean>(true);

// Toggle: apply sibling margins (gaps between nodes)
export const applySiblingMargin = writable<boolean>(false);

// Min size in pixels for rendering (filtering)
export const minSize = writable<number>(20);

// Area metric name (default: "size" for CodeCharta)
export const areaMetric = writable<string>('size');

// Combined settings store
export const settings = derived(
  [marginPreset, labelPreset, collapseFolders, applySiblingMargin, minSize, areaMetric],
  ([$marginPreset, $labelPreset, $collapseFolders, $applySiblingMargin, $minSize, $areaMetric]) => ({
    margin: $marginPreset,
    labelPreset: $labelPreset,
    collapseFolders: $collapseFolders,
    applySiblingMargin: $applySiblingMargin,
    minSize: $minSize,
    areaMetric: $areaMetric,
  } as TreemapSettings)
);
