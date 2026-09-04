/**
 * Minimal stubs for CodeCharta model types needed by the algorithm
 */

export interface CodeMapNode {
  name: string;
  value?: number;
  attributes?: Record<string, number>;
  children?: CodeMapNode[];
}

export interface CcState {
  dynamicSettings: {
    margin: number;
    areaMetric: string;
  };
  appSettings: {
    enableFloorLabels: boolean;
    amountOfTopLabels: number;
  };
}
