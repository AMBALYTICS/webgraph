import { Camera } from 'sigma';
import { NodeAttributes } from 'sigma/types/types';
import { NodeKey } from 'graphology-types';
import Graph from "graphology";
import { LayoutMapping } from "../Configuration";

/**
 * This is used to export the layout mapping from a graphology graph.
 *
 * @param {Graph} graph
 * @returns {LayoutMapping}
 */
 export const exportLayoutMapping = (graph: Graph): LayoutMapping => graph.nodes().reduce((prev, nodeKey) => {
  const { x, y } = graph.getNodeAttributes(nodeKey);
  return {
    ...prev,
    [nodeKey]: {
      x,
      y
    }
  }
}, {} as LayoutMapping);

/**
 * Selects all visible nodes to have a visible label.
 *
 * @param {{
 *   cache: { [key: string]: NodeAttributes };
 *   visibleNodes: NodeKey[];
 * }} params
 * @returns {NodeKey[]} - The selected labels.
 */
export const labelSelectorAll = (params: {
  cache: { [key: string]: NodeAttributes };
  visibleNodes: NodeKey[];
}): NodeKey[] => {
  const visibleNodes = Array<NodeKey>();

  for (let i = 0, l = params.visibleNodes.length; i < l; i++) {
    const node = params.visibleNodes[i],
      nodeData = params.cache[node];

    if (!nodeData.hidden) visibleNodes.push(node);
  }

  return visibleNodes;
};

/**
 * Selects all nodes with the attribute important set true.
 *
 * @param {{
 *   cache: { [key: string]: NodeAttributes };
 *   visibleNodes: NodeKey[];
 * }} params
 * @returns {NodeKey[]} selector important
 */
export const labelSelectorImportant = (params: {
  cache: { [key: string]: NodeAttributes };
  visibleNodes: NodeKey[];
}): NodeKey[] => {
  const importantNodes = Array<NodeKey>();

  for (let i = 0, l = params.visibleNodes.length; i < l; i++) {
    const node = params.visibleNodes[i],
      nodeData = params.cache[node];

    if (nodeData.important && !nodeData.hidden) importantNodes.push(node);
  }

  return importantNodes;
};

/**
 * Selects which labels to render based on the size of the node and the zoom
 * level of the camera. Labels are being rendered in four zoom levels.
 *
 * @param {{
 *   cache: { [key: string]: NodeAttributes };
 *   camera: Camera;
 *   displayedLabels: Set<NodeKey>;
 *   visibleNodes: NodeKey[];
 * }} params
 * @returns {NodeKey[]} - The selected labels.
 */
export const labelSelectorLevels = (params: {
  cache: { [key: string]: NodeAttributes };
  camera: Camera;
  displayedLabels: Set<NodeKey>;
  visibleNodes: NodeKey[];
}): NodeKey[] => {
  const cameraState = params.camera.getState(),
    previousCameraState = params.camera.getPreviousState();

  const previousCamera = new Camera();
  previousCamera.setState(previousCameraState);

  // Camera hasn't moved?
  const still =
    cameraState.x === previousCameraState.x &&
    cameraState.y === previousCameraState.y &&
    cameraState.ratio === previousCameraState.ratio;

  // State
  const zooming = cameraState.ratio < previousCameraState.ratio,
    panning =
      cameraState.x !== previousCameraState.x ||
      cameraState.y !== previousCameraState.y,
    unzooming = cameraState.ratio > previousCameraState.ratio,
    unzoomedPanning = !zooming && !unzooming && cameraState.ratio >= 1,
    zoomedPanning =
      panning && params.displayedLabels.size && !zooming && !unzooming;

  // if panning, return displayed labels
  if (panning || zoomedPanning) Array.from(params.displayedLabels);

  // Trick to discretize unzooming
  if (unzooming && Math.trunc(cameraState.ratio * 100) % 5 !== 0)
    return Array.from(params.displayedLabels);

  // If panning while unzoomed, we shouldn't change label selection
  if ((unzoomedPanning || still) && params.displayedLabels.size !== 0)
    return Array.from(params.displayedLabels);

  // When unzoomed & zooming
  if (zooming && cameraState.ratio >= 1)
    return Array.from(params.displayedLabels);

  // when zoomed out more than ratio 10, display no labels
  if (cameraState.ratio >= 15) return [];

  const worthyNodes: Array<NodeKey> = new Array<NodeKey>();
  const nodes: Record<number, Array<NodeKey>> = {};
  const nodeSizes: Array<number> = new Array<number>();

  // sort the nodes by their size
  params.visibleNodes.forEach((node) => {
    const nodeData = params.cache[node];

    if (nodeData.hidden) return;

    if (nodes[nodeData.size]) {
      nodes[nodeData.size].push(node);
    } else {
      nodes[nodeData.size] = [node];
    }
  });

  // retrieve all different sizes of nodes
  for (const nodeSize in nodes) {
    nodeSizes.push(Number.parseFloat(nodeSize));
  }

  // sort node sizes in descending order
  nodeSizes.sort((a, b) => b - a);

  // if zoomed out, just render the most important labels aka the labels of the largest nodes
  if (cameraState.ratio >= 1.0) {
    worthyNodes.push(...nodes[nodeSizes[0]]);
    return worthyNodes;
  }

  // sort all nodes by size into 4 levels
  const interval = nodeSizes.length / 4;
  let i = 0;

  // level 1
  if (cameraState.ratio < 1.0) {
    while (i < interval) {
      worthyNodes.push(...nodes[nodeSizes[i]]);
      i++;
    }
  }

  // level 2
  if (cameraState.ratio < 0.75) {
    while (i < interval * 2) {
      worthyNodes.push(...nodes[nodeSizes[i]]);
      i++;
    }
  }

  // level 3
  if (cameraState.ratio < 0.5) {
    while (i < interval * 3) {
      worthyNodes.push(...nodes[nodeSizes[i]]);
      i++;
    }
  }

  // level 4
  if (cameraState.ratio < 0.25) {
    while (i < interval * 4) {
      worthyNodes.push(...nodes[nodeSizes[i]]);
      i++;
    }
  }

  return worthyNodes;
};
