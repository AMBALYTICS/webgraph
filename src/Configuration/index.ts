import { AppMode } from './appmode';
import { NodeType } from './nodetype';
import { WebGLSettings } from 'sigma/types/renderers/webgl/settings';
import { LabelSelector } from './labelselector';
import Graph from 'graphology';

/**
 * Interface for the graphs configurations.
 *
 * {@label IGraphConfiguration}
 */
export interface IGraphConfiguration {
  sigmaSettings: Partial<WebGLSettings>;
  appMode: AppMode;
  suppressContextMenu: boolean;
  disableHover: boolean;
  highlightSubGraphOnHover: boolean;
  subGraphHighlightColor: string;
  includeImportantNeighbors: boolean;
  importantNeighborsBidirectional: boolean;
  importantNeighborsColor?: string;
  defaultNodeType: NodeType;
  enableHistory: boolean;
  labelSelector: LabelSelector;
}

/**
 * Representing the default value for the {@link IGraphConfiguration}.
 *
 * {@label defaultGraphConfiguration}
 */
export const DEFAULT_GRAPH_CONFIGURATION: IGraphConfiguration = {
  sigmaSettings: {},
  appMode: AppMode.STATIC,
  suppressContextMenu: true,
  disableHover: false,
  highlightSubGraphOnHover: true,
  subGraphHighlightColor: '#fc9044',
  includeImportantNeighbors: false,
  importantNeighborsBidirectional: false,
  defaultNodeType: NodeType.RING,
  enableHistory: false,
  labelSelector: LabelSelector.LEVELS,
};

export type LayoutMapping = { [key: string]: { x: number; y: number } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LayoutOptions = any; // ? Is there a more specific type??

export type Layout = (
  graph: Graph,
  options?: LayoutOptions
) => void | LayoutMapping;

export * from './appmode';
export * from './nodetype';
export * from './labelselector';
