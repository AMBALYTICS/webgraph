/**
 * Callback that is called when a node info box needs to be displayed.
 *
 * @param {number} category - The category of the target node.
 * @param {string} key - The key of the target node.
 * @param {{ x: number; y: number }} offsets - The offsets of the node info box based on the node position.
 * @param {number | undefined} score - The score of the target node.
 * @param {(hook: () => void) => void} onClose - Function to register the hook that should be called for closing the node info box.
 *
 * @public
 */ 
export type NodeInfoBoxGenerator = (
  category: number,
  key: string,
  offsets: { x: number; y: number },
  score: number | undefined,
  onClose: (hook: () => void) => void
) => void;
