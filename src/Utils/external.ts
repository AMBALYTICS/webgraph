/**
 * This function returns the size of a node for a given value.
 *
 * @param {number} value - The value of the node as a number
 * @param {number} minValue - The minimum value of any node in the node-set this function is applied to
 * @param {number} maxValue - The maximum value of any node in the node-set this function is applied to
 * @param {number} [steps=3] - The amount of different steps of node sizes, must be positive
 * @param {number} [minNodeSize=6] - The minimum node size in Pixel
 * @param {number} [maxNodeSize=12] - The maximum node size in Pixel
 * @returns {number}
 */
export const getNodeSizeForValue = (
  value: number,
  minValue: number,
  maxValue: number,
  steps = 3,
  minNodeSize = 6,
  maxNodeSize = 12
): number => {
  if (steps <= 0 || minNodeSize <= 0 || maxNodeSize <= 0) {
    throw new Error(
      'steps, minNodeSize and maxNodeSize must all be positive numbers and greater 0'
    );
  }

  if (minNodeSize > maxNodeSize) {
    throw new Error("minNodeSize can't be larger than maxNodeSize");
  }

  let divider = steps;
  if (divider != 1) {
    divider -= 1;
  }

  const sizeOffset = (maxNodeSize - minNodeSize) / divider;

  const interval = Math.abs(maxValue - minValue) / steps;

  let section = Math.floor((value - minValue) / interval);
  section = section === steps ? section - 1 : section;

  return minNodeSize + section * sizeOffset;
};

/**
 * Returns the color for a node for a given value, based on the min and max value of the nodes set.
 *
 * @param {number} value - The value of the node as a number
 * @param {number} minValue - The minimum value of any node in the node-set this function is applied to
 * @param {number} maxValue - The maximum value of any node in the node-set this function is applied to
 * @param {Array<string>} colors - An array of colors as hex strings
 *
 * @throws Error - if min value is larger than max value
 * @throws Error - if value is smaller or equal to 0
 *
 * @returns {string} - A color value as hex string out of the colors input
 *
 * @example
 * An example usage:
 * ```
 * const COLOR_PALETTE = [
 *  "#EDAE49",
 *  "#D1495B",
 *  "#00798C",
 *  "#30638E",
 *  "#003D5B",
 *  "#BBBDF6",
 * ];
 *
 * const color = Utils.getNodeColorForValue(2010, 1999, 2021, COLOR_PALETTE);
 * ```
 */
export const getNodeColorForValue = (
  value: number,
  minValue: number,
  maxValue: number,
  colors: Array<string>
): string => {
  if (value < 0) throw new Error('Value must be greater or equal to 0');
  if (minValue > maxValue)
    throw new Error("Min value can't be larger than max value");

  let intervalSize = (maxValue - minValue) / colors.length;

  if (intervalSize === 0) intervalSize = 1;

  let index = Math.floor((value - minValue) / intervalSize);
  index = index >= colors.length ? colors.length - 1 : index;

  return colors[index];
};

/**
 * Normalizes a value within it's min and max bounds from 0.0 to 1.0.
 *
 * @param {number} value - The value of the node as a number
 * @param {number} minValue - The minimum value of any node in the node-set this function is applied to
 * @param {number} maxValue - The maximum value of any node in the node-set this function is applied to
 * @returns {number} - The normalized value from 0.0 to 1.0
 */
export const getNormalizedValue = (
  value: number,
  minValue: number,
  maxValue: number
): number => {
  return (value - minValue) / (maxValue - minValue);
};
