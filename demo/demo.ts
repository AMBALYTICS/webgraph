/* eslint-disable  @typescript-eslint/no-explicit-any */

import {
  WebGraph,
  Utils,
  AppMode,
  NodeType,
  LabelSelector,
} from '../src/index';
import { SerializedEdge, SerializedNode } from 'graphology-types';
import Graph, { MultiGraph } from 'graphology';
import { circlepack, circular, random } from 'graphology-layout';
import forceAtlas2, {
  ForceAtlas2LayoutOptions,
} from 'graphology-layout-forceatlas2';
import FA2LayoutSupervisor from 'graphology-layout-forceatlas2/worker';

/**---------------------------------------------------------------------------
 * Graph drawing
 *--------------------------------------------------------------------------*/
let webGraph: WebGraph | undefined = undefined;
let graph: Graph | undefined = undefined;
const webGraphContainer = document.getElementById('webGraph');
const status = document.getElementById('status');

async function drawFullGraph(graphDataJSON: any[]) {
  if (!webGraphContainer) {
    throw new Error("No div container with the ID 'webGraph' has been found.");
  }

  graph = new MultiGraph();

  const COLOR_PALETTE = [
    '#EDAE49',
    '#D1495B',
    '#00798C',
    '#30638E',
    '#003D5B',
    '#BBBDF6',
  ];

  let minScore = Infinity;
  let maxScore = -Infinity;
  let minYear = Infinity;
  let maxYear = -Infinity;

  graphDataJSON.forEach((node) => {
    if (node.score < minScore) minScore = node.score;
    if (node.score > maxScore) maxScore = node.score;
    if (node.year < minYear) minYear = node.year;
    if (node.year > maxYear) maxYear = node.year;
  });

  // create nodes
  graphDataJSON.forEach((result) => {
    graph?.addNode(result.id, {
      label: result.author + ', ' + result.year,
      size: Utils.getNodeSizeForValue(result.score, minScore, maxScore, 4),
      category: result.category,
      color: Utils.getNodeColorForValue(
        result.year,
        minYear,
        maxYear,
        COLOR_PALETTE
      ),
      score: result.score,
      important: result.important,
      cluster: result.cluster,
    });
  });

  // add edges after all nodes have been added
  graphDataJSON.forEach((result) => {
    if (result.cluster !== undefined) {
      result.refs.forEach((ref: string) => {
        graph?.addEdge(result.id, ref, {
          weight: 1,
          color: '#ccc',
          important: Math.random() > 0.7,
        });
      });
    }
  });

  if (webGraph?.isRenderingActive) webGraph.destroy();

  random.assign(graph);

  // initialize and render graph
  webGraph = new WebGraph(webGraphContainer, graph, {
    appMode: AppMode.DYNAMIC,
    defaultNodeType: NodeType.CIRCLE,
    highlightSubGraphOnHover: true,
    includeImportantNeighbors: true,
    importantNeighborsBidirectional: true,
    importantNeighborsColor: '#fcabb2',
    enableHistory: true,
    labelSelector: LabelSelector.SIGMA,
    sigmaSettings: {
      renderLabels: true,
      labelFontColor: '#8e8e8e',
      renderNodeBackdrop: true,
      clusterColors: { 0: '#d1fce9', 1: '#d1dcfc', 2: '#fcd4cc', 3: '#fafcbd' },
    },
  });

  webGraph.on('rendered', () => console.log('graph rendered'));
  webGraph.on('syncLayoutCompleted', () => console.log('syncLayoutCompleted'));

  webGraph.on('click', (e) => console.log('click:', e));

  const contextMenus: Record<
    number,
    { label: string; callback: (key: string) => void }[]
  > = {
    0: [
      {
        label: 'drop node',
        callback: (key: string) => webGraph?.dropNodes([key]),
      },
      {
        label: 'type triangle',
        callback: (key: string) =>
          webGraph?.mergeNodes([
            { key: key, attributes: { type: NodeType.TRIANGLE } },
          ]),
      },
      {
        label: 'type rectangle',
        callback: (key: string) =>
          webGraph?.mergeNodes([
            { key: key, attributes: { type: NodeType.RECTANGLE } },
          ]),
      },
      {
        label: 'highlight node',
        callback: (key: string) => {
          webGraph?.highlightNode(key);

          setTimeout(() => webGraph?.unhighlightNode(key), 2000);
        },
      },
    ],
    1: [
      {
        label: 'drop node',
        callback: (key: string) => webGraph?.dropNodes([key]),
      },
      {
        label: 'hide node',
        callback: (key: string) =>
          webGraph?.mergeNodes([{ key: key, attributes: { hidden: true } }]),
      },
      {
        label: 'show node',
        callback: (key: string) =>
          webGraph?.mergeNodes([{ key: key, attributes: { hidden: false } }]),
      },
      {
        label: 'highlight node',
        callback: (key: string) => {
          webGraph?.highlightNode(key);

          setTimeout(() => webGraph?.unhighlightNode(key), 2000);
        },
      },
    ],
  };

  webGraph.on('click', async ({ node, event }) => {
    const xoffset = -75;
    const yoffset = 20;
    const category = graph?.getNodeAttribute(node, 'category');

    switch (event.original.button) {
      case 0: {
        const dataJson = await fetch('http://localhost:9002/node?q=' + node)
          .then((response) => response.json())
          .then((json) => json);

        if (!dataJson) throw new Error();

        const element = document.createElement('div');
        element.className = 'nodeInfoBox';
        element.style.top = event.y + yoffset + 'px';
        element.style.left = event.x + xoffset + 'px';

        const preHeader = document.createElement('span');
        preHeader.setAttribute('id', 'preheader');
        preHeader.innerHTML = dataJson.year;
        if (dataJson.year) element.append(preHeader);

        const header = document.createElement('span');
        header.setAttribute('id', 'header');
        header.innerHTML = dataJson.title;
        if (dataJson.title) element.append(header);

        const content = document.createElement('span');
        content.setAttribute('id', 'content');
        content.innerHTML = dataJson.abstract;
        if (dataJson.abstract) element.append(content);

        const footer = document.createElement('span');
        footer.setAttribute('id', 'footer');

        const score = graph?.getNodeAttribute(node, 'score');

        footer.innerHTML = 'Score: ' + score;
        if (score) element.append(footer);

        webGraphContainer.prepend(element);

        const removeListener = () => {
          element.remove();
          webGraph?.removeListener('mouseleave', removeListener);
        };

        webGraph?.addListener('mouseleave', removeListener);
        break;
      }
      case 2: {
        if (typeof category === 'undefined') return;

        const menu = contextMenus[category];

        // generate context menus content
        const element = document.createElement('div');
        element.className = 'webGraphCM';
        element.style.top = event.y + yoffset + 'px';
        element.style.left = event.x + xoffset + 'px';

        const contextMenuContent = document.createElement('ol');
        const childs = menu.map((ci) => {
          const item: HTMLElement = document.createElement('li');
          const label: HTMLElement = document.createElement('span');

          // set label
          label.innerHTML = ci.label;

          // set click listener
          item.addEventListener('click', () => {
            ci.callback(node.toString());

            // hide the context menu that's open
            element.remove();
          });

          item.appendChild(label);
          return item;
        });
        contextMenuContent.append(...childs);
        element.appendChild(contextMenuContent);

        webGraphContainer.prepend(element);

        const removeListener = () => {
          element.remove();
          webGraphContainer?.removeEventListener('click', removeListener);
        };

        webGraphContainer?.addEventListener('click', removeListener);
        break;
      }
    }
  });

  webGraph.on('mousedown', (e) => console.log('mousedown:', e));
  webGraph.on('mouseenter', (e) => console.log('mouseenter:', e));
  webGraph.on('mouseleave', (e) => console.log('mouseleave:', e));
  webGraph.on('mousemove', (e) => console.log('mousemove:', e));

  webGraph.render();

  if (status) {
    status.innerHTML = 'Idle';
  }
}

function drawGraph(json: any[], baseUrl: string): void {
  if (!webGraphContainer) {
    throw new Error("No div container with the ID 'webGraph' has been found.");
  }

  if (webGraph?.isRenderingActive) webGraph.destroy();

  graph = new MultiGraph();

  json.forEach((result) => {
    graph?.addNode(result.id, {
      label: result.author + ', ' + result.year,
      size: 10,
      category: 0,
      color: '#30638E',
      score: result.score,
      important: result.important,
    });
  });

  webGraph = new WebGraph(webGraphContainer, graph);

  webGraph.on('rendered', () => console.log('graph rendered'));
  webGraph.on('syncLayoutCompleted', () => console.log('syncLayoutCompleted'));

  webGraph.on('click', (e) => console.log('click:', e));

  const contextMenus: Record<
    number,
    { label: string; callback: (key: string) => void }[]
  > = {
    0: [
      {
        label: 'Load 1 Node',
        callback: (key: string) => loadNNodes(1, key, baseUrl),
      },
      {
        label: 'Load 5 Nodes',
        callback: (key: string) => loadNNodes(5, key, baseUrl),
      },
      {
        label: 'Load 10 Nodes',
        callback: (key: string) => loadNNodes(10, key, baseUrl),
      },
    ],
  };

  webGraph.on('click', async ({ node, event }) => {
    const xoffset = -75;
    const yoffset = 20;
    const category = graph?.getNodeAttribute(node, 'category');

    switch (event.original.button) {
      case 2: {
        if (typeof category === 'undefined') return;

        const menu = contextMenus[category];

        // generate context menus content
        const element = document.createElement('div');
        element.className = 'webGraphCM';
        element.style.top = event.y + yoffset + 'px';
        element.style.left = event.x + xoffset + 'px';

        const contextMenuContent = document.createElement('ol');
        const childs = menu.map((ci) => {
          const item: HTMLElement = document.createElement('li');
          const label: HTMLElement = document.createElement('span');

          // set label
          label.innerHTML = ci.label;

          // set click listener
          item.addEventListener('click', () => {
            ci.callback(node.toString());

            // hide the context menu that's open
            element.remove();
          });

          item.appendChild(label);
          return item;
        });
        contextMenuContent.append(...childs);
        element.appendChild(contextMenuContent);

        webGraphContainer.prepend(element);

        const removeListener = () => {
          element.remove();
          webGraphContainer?.removeEventListener('click', removeListener);
        };

        webGraphContainer?.addEventListener('click', removeListener);
        break;
      }
    }
  });

  webGraph.on('mousedown', (e) => console.log('mousedown:', e));
  webGraph.on('mouseenter', (e) => console.log('mouseenter:', e));
  webGraph.on('mouseleave', (e) => console.log('mouseleave:', e));
  webGraph.on('mousemove', (e) => console.log('mousemove:', e));

  webGraph.render();
}

function loadNNodes(n: number, key: string, url: string): void {
  fetchGraphData(url + n).then((json) => {
    const newNodes = Array<SerializedNode>();
    const newEdges = new Set<SerializedEdge>();

    const nodeData = graph?.getNodeAttributes(key);
    if (!nodeData) return;

    json.forEach((node) => {
      const newID = node.id + Math.random() * Math.random();

      const angle = Math.random() * Math.PI * 2;

      newNodes.push({
        key: newID,
        attributes: {
          label: node.author + ', ' + node.year,
          x: nodeData.x + Math.cos(angle) / 10,
          y: nodeData.y + Math.sin(angle) / 10,
          category: 0,
          color: '#30638E',
          size: 10,
        },
      });

      newEdges.add({
        source: key,
        target: newID,
        attributes: {
          color: '#e5e5e5',
          weight: 1.0,
        },
      });
    });

    webGraph?.mergeNodes(newNodes);
    webGraph?.mergeEdges(newEdges);

    webGraph?.setAndApplyLayout(circlepack);
  });
}

function drawExampleGraph() {
  if (!webGraphContainer) {
    throw new Error("No div container with the ID 'webGraph' has been found.");
  }

  graph = new Graph();

  graph.addNode('Node 1', {
    label: 'Hello',
    x: 1,
    y: 1,
    color: '#D1495B',
    size: 10,
    type: NodeType.RECTANGLE,
  });

  graph.addNode('Node 2', {
    label: 'Graph',
    x: 1,
    y: 0,
    color: '#EDAE49',
    size: 10,
    type: NodeType.TRIANGLE,
  });

  graph.addNode('Node 3', {
    label: 'and World!',
    x: 0,
    y: 0,
    color: '#30638E',
    size: 10,
  });

  graph.addEdge('Node 1', 'Node 2', {
    weight: 0.5,
    color: '#ccc',
    important: true,
  });
  graph.addEdge('Node 1', 'Node 3', { weight: 1.0, color: '#ccc' });

  if (webGraph?.isRenderingActive) webGraph.destroy();

  webGraph = new WebGraph(webGraphContainer, graph);

  webGraph.render();

  if (status) {
    status.innerHTML = 'Idle';
  }
}

window.onload = () => {
  if (webGraphContainer === null) return;

  if (status) {
    status.innerHTML = 'Working...';
  }
  // render default graph example
  drawExampleGraph();
};

function fetchGraphData(url: string): Promise<any[]> {
  // fetch json resource
  return fetch(url)
    .then((response) => response.json())
    .catch((e) => {
      console.error(e);
      drawExampleGraph();
      if (status) {
        status.innerHTML = 'Idle';
      }
    });
}

/**---------------------------------------------------------------------------
 * Settings Menu
 *--------------------------------------------------------------------------*/
/**---------------------------------
 * Settings Menu - API endpoint
 *--------------------------------*/
document.getElementById('graphButton')?.addEventListener('click', async (e) => {
  e.preventDefault();

  const searchEndpointElement = document.getElementById('searchEndpoint');
  const searchGraphRoute = document.getElementById('graphRoute');
  const searchGraphQuery = document.getElementById('graphQuery');

  if (!searchEndpointElement || !searchGraphRoute || !searchGraphQuery) return;

  // parse inputs to url
  const url =
    (<HTMLInputElement>searchEndpointElement).value +
    (<HTMLInputElement>searchGraphRoute).value +
    encodeURIComponent((<HTMLInputElement>searchGraphQuery).value);

  if (status) {
    status.innerHTML = 'Working...';
  }

  fetchGraphData(url).then((json) => drawFullGraph(json));
});

/**---------------------------------
 * Settings Menu - Start blank
 *--------------------------------*/

document.getElementById('blankButton')?.addEventListener('click', async (e) => {
  e.preventDefault();

  const searchEndpointElement = document.getElementById('searchEndpoint');
  const blankRoute = document.getElementById('blankRoute');
  const blankAmount = document.getElementById('blankAmount');

  if (!blankAmount || !blankRoute || !searchEndpointElement) return;

  // parse inputs to url
  const baseUrl =
    (<HTMLInputElement>searchEndpointElement).value +
    (<HTMLInputElement>blankRoute).value;
  const url =
    baseUrl + encodeURIComponent((<HTMLInputElement>blankAmount).value);

  fetchGraphData(url).then((json) => drawGraph(json, baseUrl));
});

/**---------------------------------
 * Settings Menu - App Mode
 *--------------------------------*/
document.getElementById('appModeDynamic')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.appMode = AppMode.DYNAMIC;
});

document.getElementById('appModeStatic')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.appMode = AppMode.STATIC;
});

/**---------------------------------
 * Settings Menu - Layout
 *--------------------------------*/
document.getElementById('layoutRandom')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyLayout(random);
});

document.getElementById('layoutCircular')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyLayout(circular);
});

document.getElementById('layoutCirclePack')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyLayout(circlepack);
});

document.getElementById('layoutForceAtlas2')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyLayout(forceAtlas2, {
    iterations: 25,
    settings: {
      edgeWeightInfluence: 2.0,
    },
  });
});

/**---------------------------------
 * Settings Menu - ForceAtlas2 Web Worker
 *--------------------------------*/
const fa2ww = (
  graph: Graph,
  options?: { interval: number; options: ForceAtlas2LayoutOptions }
) => {
  const layout = new FA2LayoutSupervisor(graph, options?.options);

  layout.start();

  setTimeout(() => layout.stop(), options?.interval);
};

fa2ww.assign = fa2ww;

document.getElementById('ww')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyLayout(fa2ww, { interval: 1000 });
});

/**---------------------------------
 * Settings Menu - Edges
 *--------------------------------*/
document.getElementById('edgeShow')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.toggleEdgeRendering(false);
});

document.getElementById('edgeHide')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.toggleEdgeRendering(true);
});

document.getElementById('toggleEdges')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.toggleEdgeRendering();
});

/**---------------------------------
 * Settings Menu - Important Edges
 *--------------------------------*/
document.getElementById('impEdgeShow')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.toggleJustImportantEdgeRendering(true);
});

document.getElementById('impEdgeHide')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.toggleJustImportantEdgeRendering(false);
});

document
  .getElementById('toggleImportantEdges')
  ?.addEventListener('click', (e) => {
    e.preventDefault();

    if (!webGraph || !webGraph.isRenderingActive) return;

    webGraph.toggleJustImportantEdgeRendering();
  });

/**---------------------------------
 * Settings Menu - Default Node Type
 *--------------------------------*/
document.getElementById('typeRing')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyDefaultNodeType(NodeType.RING);
});

document.getElementById('typeCircle')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyDefaultNodeType(NodeType.CIRCLE);
});

document.getElementById('typeRectangle')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyDefaultNodeType(NodeType.RECTANGLE);
});

document.getElementById('typeTriangle')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.setAndApplyDefaultNodeType(NodeType.TRIANGLE);
});

/**---------------------------------
 * Settings Menu - History
 *--------------------------------*/
document.getElementById('undo')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.undo();
});

document.getElementById('redo')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.redo();
});

document.getElementById('clearHistory')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.clearHistory();
});

/**---------------------------------
 * Settings Menu - Camera
 *--------------------------------*/
document.getElementById('zoomIn')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.camera.animatedUnzoom(0.75);
});

document.getElementById('zoomOut')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.camera.animatedZoom(0.75);
});

document.getElementById('zoomReset')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive) return;

  webGraph.camera.animatedReset({});
});

/**---------------------------------
 * Settings Menu - Highlight
 *--------------------------------*/
document.getElementById('highlightNode')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive || !graph) return;

  const key = graph?.nodes()[0];
  webGraph?.highlightNode(key);

  setTimeout(() => webGraph?.unhighlightNode(key), 3000);
});

/**---------------------------------
 * Settings Menu - Cluster
 *--------------------------------*/
document.getElementById('toggleCluster')?.addEventListener('click', (e) => {
  e.preventDefault();

  if (!webGraph || !webGraph.isRenderingActive || !graph) return;

  webGraph.toggleNodeBackdropRendering();
});
