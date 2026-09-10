// .tmp-head/packages/area-true-treemap/src/algorithm/squarify.ts
var aimedRatio = 1.618;
function resolveLabelLength(labelLength, node) {
  return typeof labelLength === "function" ? labelLength(node) : labelLength;
}
function squarify(parent, margin, scale, sortingOption, orderOption, labelsEnabled, labelLength, depth = 0) {
  if (orderOption === "keepPlace" /* KEEP_PLACE */) {
    layoutNodeWithRows(parent, margin, scale, labelsEnabled, labelLength);
  } else if (orderOption === "newOrder" /* NEW_ORDER */) {
    squarifyNode(parent, margin, scale, sortingOption, labelsEnabled, labelLength, false);
  } else if (orderOption === "keepOrder" /* KEEP_ORDER */) {
    squarifyNode(parent, margin, scale, sortingOption, labelsEnabled, labelLength, true);
  }
  for (const child of parent.children) {
    if (child.children.length > 0) {
      squarify(child, margin, scale, sortingOption, orderOption, labelsEnabled, labelLength, depth + 1);
    }
  }
}
function layoutNodeWithRows(parent, margin, scale, labelsEnabled, labelLength) {
  const nodes = parent.children;
  if (!nodes || nodes.length === 0 || !parent.rows || parent.rows.length === 0) {
    return;
  }
  const isLeaf = parent.children.length === 0;
  const needsLabel = labelsEnabled && parent.hasLabel && !isLeaf;
  const labelSize = needsLabel ? resolveLabelLength(labelLength, parent) : 0;
  const parentWidth = parent.x1 - parent.x0 - margin * 2;
  const topInset = needsLabel ? labelSize : margin;
  const parentLength = parent.y1 - parent.y0 - topInset - margin;
  const totalArea = parentWidth * parentLength;
  if (scale) {
    const totalChildrenValue = nodes.reduce((sum, child) => sum + child.value, 0);
    if (totalChildrenValue === 0) {
      return;
    }
    const scaleValue = totalArea / totalChildrenValue;
    for (const child of nodes) {
      child.value *= scaleValue;
    }
  }
  let x0 = parent.x0 + margin;
  let y0 = parent.y0 + topInset;
  const x1 = parent.x1 - margin;
  const y1 = parent.y1 - margin;
  let remainingArea = totalArea;
  for (const row of parent.rows) {
    const width = x1 - x0;
    const length = y1 - y0;
    const rowValue = row.children.reduce((sum, child) => sum + child.value, 0);
    if (rowValue === 0) {
      continue;
    }
    if (row.dice) {
      const rowHeight = rowValue / width;
      treemapDice(rowValue, row.children, x0, y0, x1, y0 + rowHeight);
      y0 += rowHeight;
    } else {
      const rowWidth = rowValue / length;
      treemapSlice(rowValue, row.children, x0, y0, x0 + rowWidth, y1);
      x0 += rowWidth;
    }
    remainingArea -= rowValue;
  }
}
function squarifyNode(parent, margin, scale, sortingOption = "none" /* NONE */, labelsEnabled, labelLength, orderByOriginalValue) {
  const nodes = parent.children;
  const isLeaf = parent.children.length === 0;
  const needsLabel = labelsEnabled && parent.hasLabel && !isLeaf;
  const labelSize = needsLabel ? resolveLabelLength(labelLength, parent) : 0;
  if (sortingOption !== "none" /* NONE */ && nodes && nodes.length > 0) {
    nodes.sort((a, b) => {
      if (sortingOption === "ascending" /* ASCENDING */) {
        if (orderByOriginalValue) {
          return a.originalValue - b.originalValue;
        }
        return a.value - b.value;
      }
      if (orderByOriginalValue) {
        return b.originalValue - a.originalValue;
      }
      return b.value - a.value;
    });
  }
  let x0 = parent.x0 + margin;
  let y0 = parent.y0 + (needsLabel ? labelSize : margin);
  const x1 = parent.x1 - margin;
  const y1 = parent.y1 - margin;
  const numberOfChildren = nodes.length;
  let i = 0;
  let j = 0;
  let width;
  let length;
  let value = (x1 - x0) * (y1 - y0);
  let sumValue;
  let minValue;
  let maxValue;
  let newRatio;
  let minRatio;
  let alpha;
  let beta;
  if (scale) {
    if (nodes && nodes.length > 0) {
      let childrenValues = 0;
      for (const child of nodes) {
        if (child.value !== void 0 && !Number.isNaN(child.value)) {
          childrenValues += child.value;
        }
      }
      if (childrenValues === 0) {
        return;
      }
      const scaleValue = value / childrenValues;
      for (const child of nodes) {
        child.value *= scaleValue;
      }
    }
  }
  while (i < numberOfChildren) {
    width = x1 - x0;
    length = y1 - y0;
    do {
      sumValue = nodes[j++].value;
    } while (!sumValue && j < numberOfChildren);
    minValue = maxValue = sumValue;
    alpha = Math.max(length / width, width / length) / (value * aimedRatio);
    beta = sumValue * sumValue * alpha;
    minRatio = Math.max(maxValue / beta, beta / minValue);
    for (; j < numberOfChildren; ++j) {
      const nodeValue = nodes[j].value;
      sumValue += nodeValue;
      if (nodeValue < minValue) {
        minValue = nodeValue;
      }
      if (nodeValue > maxValue) {
        maxValue = nodeValue;
      }
      beta = sumValue * sumValue * alpha;
      newRatio = Math.max(maxValue / beta, beta / minValue);
      if (newRatio > minRatio) {
        sumValue -= nodeValue;
        break;
      }
      minRatio = newRatio;
    }
    const row = { name: parent.name, dice: width < length, children: nodes.slice(i, j) };
    if (row.dice) {
      treemapDice(sumValue, row.children, x0, y0, x1, value ? y0 += length * sumValue / value : y0);
    } else {
      treemapSlice(sumValue, row.children, x0, y0, value ? x0 += width * sumValue / value : x0, y1);
    }
    value -= sumValue;
    i = j;
    parent.rows.push(row);
  }
}
function treemapDice(parentValue, children, x0, y0, x1, y1) {
  const k = parentValue ? (x1 - x0) / parentValue : 0;
  if (x1 - x0 <= 0 || y1 - y0 <= 0) {
    for (const element of children) {
      element.x0 = x0;
      element.x1 = x0;
      element.y0 = y0;
      element.y1 = y0;
    }
  }
  for (const element of children) {
    element.y0 = y0;
    element.y1 = y1;
    element.x0 = x0;
    element.x1 = x0 += element.value * k;
  }
}
function treemapSlice(parentValue, children, x0, y0, x1, y1) {
  const k = parentValue ? (y1 - y0) / parentValue : 0;
  if (x1 - x0 <= 0 || y1 - y0 <= 0) {
    for (const element of children) {
      element.x0 = x0;
      element.x1 = x0;
      element.y0 = y0;
      element.y1 = y0;
    }
  }
  for (const element of children) {
    element.x0 = x0;
    element.x1 = x1;
    element.y0 = y0;
    element.y1 = y0 += element.value * k;
  }
}

// .tmp-head/packages/area-true-treemap/src/config/area-true-config.ts
var DEFAULT_AREA_TRUE_CONFIG = {
  areaMetric: "size",
  margin: 10,
  numberOfPasses: 1,
  scale: false,
  simpleIncreaseValues: false,
  sortingOption: "none" /* NONE */,
  orderOption: "newOrder" /* NEW_ORDER */,
  incrementMargin: false,
  applySiblingMargin: true,
  siblingMarginLeavesOnly: false,
  collapseFolders: false,
  enableFloorLabels: true,
  amountOfTopLabels: 2,
  labelLength: 1
};

// .tmp-head/packages/area-true-treemap/src/config/area-true-config-builder.ts
var AreaTrueTreemapConfigBuilder = class {
  config;
  constructor() {
    this.config = { ...DEFAULT_AREA_TRUE_CONFIG };
  }
  areaMetric(value) {
    this.config.areaMetric = value;
    return this;
  }
  margin(value) {
    assertNonNegative(value, "margin");
    this.config.margin = value;
    return this;
  }
  numberOfPasses(value) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`numberOfPasses(): must be a positive integer, got ${value}`);
    }
    this.config.numberOfPasses = value;
    return this;
  }
  scale(value) {
    this.config.scale = value;
    return this;
  }
  simpleIncreaseValues(value) {
    this.config.simpleIncreaseValues = value;
    return this;
  }
  sorting(option) {
    this.config.sortingOption = option;
    return this;
  }
  order(option) {
    this.config.orderOption = option;
    return this;
  }
  incrementMargin(value) {
    this.config.incrementMargin = value;
    return this;
  }
  applySiblingMargin(value) {
    this.config.applySiblingMargin = value;
    return this;
  }
  /** When sibling margins are on, shrink only leaf nodes (gaps between leaves, not folders). */
  siblingMarginLeavesOnly(value) {
    this.config.siblingMarginLeavesOnly = value;
    return this;
  }
  collapseFolders(value) {
    this.config.collapseFolders = value;
    return this;
  }
  floorLabels(enabled) {
    this.config.enableFloorLabels = enabled;
    return this;
  }
  amountOfTopLabels(value) {
    if (!Number.isInteger(value)) {
      throw new Error(`amountOfTopLabels(): must be an integer, got ${value}`);
    }
    this.config.amountOfTopLabels = value;
    return this;
  }
  labelLength(value) {
    if (typeof value === "number") {
      assertNonNegative(value, "labelLength");
    } else if (typeof value !== "function") {
      throw new Error(`labelLength(): expected a number or function, got ${typeof value}`);
    }
    this.config.labelLength = value;
    return this;
  }
  build() {
    return { ...this.config };
  }
};
function assertNonNegative(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${name}(): must be a non-negative finite number, got ${value}`);
  }
}

// .tmp-head/packages/area-true-treemap/src/algorithm/startAlgo.ts
var MARGIN_DIVISOR = 4.331109347824219 * 3.9340057382606775;
function resolveLabelLength2(labelLength, node) {
  return typeof labelLength === "function" ? labelLength(node) : labelLength;
}
function convertToSquarifyNode(node, areaMetric, collapseFolders, depth, labelsEnabled, amountOfTopLabels) {
  if (collapseFolders && node.children && node.children.length === 1) {
    const child = node.children[0];
    if (child.children && child.children.length > 0) {
      const childCopy = { ...child, name: `${node.name}/${child.name}` };
      return convertToSquarifyNode(childCopy, areaMetric, collapseFolders, depth, labelsEnabled, amountOfTopLabels);
    }
  }
  const isLeaf = !node.children || node.children.length === 0;
  const ownValue = node.attributes?.[areaMetric];
  const children = (node.children ?? []).map(
    (child) => convertToSquarifyNode(child, areaMetric, collapseFolders, depth + 1, labelsEnabled, amountOfTopLabels)
  );
  let value;
  if (isLeaf) {
    value = ownValue ?? 0;
  } else {
    const childrenValues = children.reduce((sum, child) => sum + child.value, 0);
    value = ownValue ?? childrenValues;
  }
  return {
    name: node.name,
    value,
    originalValue: value,
    children,
    rows: [],
    attributes: node.attributes,
    hasLabel: !isLeaf && depth < amountOfTopLabels && labelsEnabled,
    depth,
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0
  };
}
function convertToLayoutNode(node, depth, parentX, parentY) {
  const isLeaf = node.children.length === 0;
  let layoutNode;
  if (node.value <= 0) {
    layoutNode = {
      name: node.name,
      width: 0,
      length: 0,
      depth,
      isLeaf,
      attributes: node.attributes,
      hasLabel: false,
      relativeX: 0,
      relativeY: 0,
      updatedValue: 0
    };
  } else {
    const width = node.x1 - node.x0;
    const length = node.y1 - node.y0;
    layoutNode = {
      name: node.name,
      width,
      length,
      depth,
      isLeaf,
      attributes: node.attributes,
      hasLabel: node.hasLabel,
      relativeX: node.x0 - parentX,
      relativeY: node.y0 - parentY,
      updatedValue: node.value
    };
  }
  if (!isLeaf) {
    layoutNode.children = node.children.map((child) => convertToLayoutNode(child, depth + 1, node.x0, node.y0));
  }
  return layoutNode;
}
function updateValues(node, margin, oldMargin, applySiblingMargin, depth, labelsEnabled, labelLength) {
  const isLeaf = node.children.length === 0;
  if (node.originalValue <= 0) {
    return 0;
  }
  let childrenValueIncrease = 0;
  if (node.children.length > 0) {
    for (const child of node.children) {
      childrenValueIncrease += updateValues(child, margin, oldMargin, true, depth + 1, labelsEnabled, labelLength);
    }
  } else if (isLeaf && !applySiblingMargin) {
    return 0;
  }
  const ratioOriginalValue = Math.sqrt((node.originalValue + childrenValueIncrease) / node.value);
  let width = (node.x1 - node.x0 - oldMargin * 2) * ratioOriginalValue;
  let length = (node.y1 - node.y0 - oldMargin * 2) * ratioOriginalValue;
  if (width <= 0 && length <= 0) {
    width = 1;
    length = 1;
  }
  if (width <= 0) {
    width = length / 2;
    length = length / 2;
  }
  if (length <= 0) {
    length = width / 2;
    width = width / 2;
  }
  const valueBefore = node.value;
  node.value = width * length;
  return node.value - valueBefore;
}
function increaseValuesSimple(node, margin, applySiblingMargin, depth, labelsEnabled, labelLength) {
  if (node.value <= 0) {
    return 0;
  }
  const isLeaf = node.children.length === 0;
  const needsLabel = labelsEnabled && node.hasLabel && !isLeaf;
  let childrenValueIncrease = 0;
  if (!isLeaf) {
    for (const child of node.children) {
      childrenValueIncrease += increaseValuesSimple(child, margin, applySiblingMargin, depth + 1, labelsEnabled, labelLength);
    }
  } else if (!applySiblingMargin && isLeaf) {
    return 0;
  }
  const width = node.x1 - node.x0;
  const length = node.y1 - node.y0;
  let valueIncrease = width * margin + length * margin + margin * margin * 2 + childrenValueIncrease;
  if (needsLabel) {
    valueIncrease += width * resolveLabelLength2(labelLength, node);
  }
  node.value += valueIncrease;
  return valueIncrease;
}
function increaseValues(node, margin, applySiblingMargin, depth, labelsEnabled, labelLength) {
  const isLeaf = node.children.length === 0;
  const needsLabel = labelsEnabled && node.hasLabel && !isLeaf;
  if (!applySiblingMargin && isLeaf) {
    return 0;
  }
  if (node.value <= 0) {
    return 0;
  }
  const width = node.x1 - node.x0;
  const length = node.y1 - node.y0;
  if (isLeaf) {
    const valueIncrease2 = width * margin + length * margin + margin * margin;
    node.value += valueIncrease2;
    return valueIncrease2;
  }
  let childrenValueIncrease = 0;
  for (const child of node.children) {
    childrenValueIncrease += increaseValues(child, margin, applySiblingMargin, depth + 1, labelsEnabled, labelLength);
  }
  const ratioChildrenValueIncrease = (node.value + childrenValueIncrease) / node.value;
  let valueIncrease = Math.sqrt(ratioChildrenValueIncrease) * width * margin + Math.sqrt(ratioChildrenValueIncrease) * length * margin + margin * margin + childrenValueIncrease;
  if (needsLabel) {
    valueIncrease += width * resolveLabelLength2(labelLength, node);
  }
  node.value += valueIncrease;
  return valueIncrease;
}
function shrinkRect(node, margin) {
  node.x0 += margin / 2;
  node.y0 += margin / 2;
  node.x1 -= margin / 2;
  node.y1 -= margin / 2;
  if (node.x1 - node.x0 <= 0 || node.y1 - node.y0 <= 0) {
    node.x0 = 0;
    node.y0 = 0;
    node.x1 = 0;
    node.y1 = 0;
  }
}
function shrink(node, margin) {
  shrinkRect(node, margin);
  for (const child of node.children) {
    shrink(child, margin);
  }
}
function shrinkLeavesOnly(node, margin) {
  if (node.children.length === 0) {
    shrinkRect(node, margin);
    return;
  }
  for (const child of node.children) {
    shrinkLeavesOnly(child, margin);
  }
}
function flattenLayoutNode(node, areaMetric, xOffset, yOffset, rects) {
  const x = xOffset + node.relativeX;
  const y = yOffset + node.relativeY;
  rects.push({
    x,
    y,
    width: node.width,
    height: node.length,
    name: node.name,
    depth: node.depth,
    isLeaf: node.isLeaf,
    hasLabel: node.hasLabel,
    value: node.attributes?.[areaMetric] ?? 0,
    attributes: node.attributes
  });
  if (node.children) {
    for (const child of node.children) {
      flattenLayoutNode(child, areaMetric, x, y, rects);
    }
  }
}
function generateAreaTrueSquarifyLayoutNodes(tree, config) {
  const margin = config.margin / MARGIN_DIVISOR;
  const labelsEnabled = config.enableFloorLabels;
  const squarifyNode2 = convertToSquarifyNode(
    tree,
    config.areaMetric,
    config.collapseFolders,
    0,
    labelsEnabled,
    config.amountOfTopLabels
  );
  const width = Math.sqrt(squarifyNode2.value);
  squarifyNode2.x0 = 0;
  squarifyNode2.y0 = 0;
  squarifyNode2.x1 = width;
  squarifyNode2.y1 = width;
  squarify(squarifyNode2, 0, false, config.sortingOption, "newOrder" /* NEW_ORDER */, false, 0);
  if (config.numberOfPasses >= 2) {
    const marginIncrement = margin / (config.numberOfPasses - 1);
    let currentMargin = config.incrementMargin ? marginIncrement : margin;
    let oldMargin = currentMargin;
    if (config.simpleIncreaseValues) {
      increaseValuesSimple(squarifyNode2, currentMargin, config.applySiblingMargin, 0, labelsEnabled, config.labelLength);
    } else {
      increaseValues(squarifyNode2, currentMargin, config.applySiblingMargin, 0, labelsEnabled, config.labelLength);
    }
    squarifyNode2.x1 = Math.sqrt(squarifyNode2.value);
    squarifyNode2.y1 = Math.sqrt(squarifyNode2.value);
    const scaleNow = config.scale && config.numberOfPasses === 2;
    squarify(squarifyNode2, currentMargin, scaleNow, config.sortingOption, config.orderOption, labelsEnabled, config.labelLength);
    if (config.numberOfPasses > 2) {
      oldMargin = currentMargin;
      currentMargin = config.incrementMargin ? currentMargin + marginIncrement : currentMargin;
      updateValues(squarifyNode2, currentMargin, oldMargin, config.applySiblingMargin, 0, labelsEnabled, config.labelLength);
      for (let i = 0; i < config.numberOfPasses - 3; i++) {
        squarify(squarifyNode2, currentMargin, false, config.sortingOption, config.orderOption, labelsEnabled, config.labelLength);
        oldMargin = currentMargin;
        currentMargin = config.incrementMargin ? currentMargin + marginIncrement : currentMargin;
        updateValues(squarifyNode2, currentMargin, oldMargin, config.applySiblingMargin, 0, labelsEnabled, config.labelLength);
      }
      squarify(squarifyNode2, currentMargin, config.scale, config.sortingOption, config.orderOption, labelsEnabled, config.labelLength);
    }
    if (config.applySiblingMargin) {
      if (config.siblingMarginLeavesOnly === true) {
        shrinkLeavesOnly(squarifyNode2, currentMargin);
      } else {
        shrink(squarifyNode2, currentMargin);
      }
    }
  }
  const layoutNode = convertToLayoutNode(squarifyNode2, 0, 0, 0);
  const rects = [];
  flattenLayoutNode(layoutNode, config.areaMetric, 0, 0, rects);
  return rects;
}

// .tmp-head/packages/area-true-treemap/src/algorithm/layout.ts
var AreaTrueTreemapLayout = class {
  config;
  constructor(config) {
    this.config = config;
  }
  /** Convenience shortcut for `new AreaTrueTreemapConfigBuilder()`. */
  static builder() {
    return new AreaTrueTreemapConfigBuilder();
  }
  /**
   * Lay out `tree` and return the flattened list of rectangles. Coordinates
   * are in the algorithm's own unit (the layout square is `sqrt(totalValue)`
   * × `sqrt(totalValue)`); scale them to your canvas as needed. All nodes —
   * including the root — are included.
   */
  compute(tree) {
    return generateAreaTrueSquarifyLayoutNodes(tree, this.config);
  }
};

// .tmp-head-zero-test.ts
function run(label, tree, metric = "size") {
  const cfg = AreaTrueTreemapLayout.builder().areaMetric(metric).numberOfPasses(2).margin(1).floorLabels(true).amountOfTopLabels(3).labelLength(3).sorting("descending" /* DESCENDING */).build();
  const rects = new AreaTrueTreemapLayout(cfg).compute(tree);
  let nan = 0, zero = 0;
  for (const r of rects) {
    if (!Number.isFinite(r.x) || !Number.isFinite(r.y) || !Number.isFinite(r.width) || !Number.isFinite(r.height)) nan++;
    else if (r.width <= 0 || r.height <= 0) zero++;
  }
  console.log(label.padEnd(34), "| rects", rects.length, "| NaN", nan, "| nullflaeche", zero);
}
var withZero = { name: "root", children: [
  { name: "a", children: [{ name: "a1", attributes: { size: 10 } }, { name: "a2", attributes: { size: 0 } }] },
  { name: "b", children: [{ name: "b1", attributes: { size: 5 } }, { name: "b2" }] }
] };
run("HEAD: synthetisch mit Nullwerten", withZero);
var allPositive = { name: "root", children: [
  { name: "a", children: [{ name: "a1", attributes: { size: 10 } }, { name: "a2", attributes: { size: 1 } }] },
  { name: "b", children: [{ name: "b1", attributes: { size: 5 } }, { name: "b2", attributes: { size: 1 } }] }
] };
run("HEAD: synthetisch ohne Nullwerte", allPositive);
