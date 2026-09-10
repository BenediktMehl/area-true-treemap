// .tmp-layout-test.ts
var import_fs = require("fs");

// packages/area-true-treemap/dist/index.js
var HierarchyNodeImpl = class {
  constructor(data, parent, depth, height) {
    this.data = data;
    this.parent = parent;
    this.depth = depth;
    this.height = height;
  }
  each(callback) {
    for (const node of this) {
      callback(node);
    }
    return this;
  }
  eachBefore(callback) {
    let node = this;
    const stack = [node];
    while (node = stack.pop()) {
      callback(node);
      if (node.children) {
        for (let i = node.children.length - 1; i >= 0; --i) {
          stack.push(node.children[i]);
        }
      }
    }
    return this;
  }
  eachAfter(callback) {
    let node = this;
    const nodes = [node];
    const next = [];
    while (node = nodes.pop()) {
      next.push(node);
      if (node.children) {
        for (const child of node.children) {
          nodes.push(child);
        }
      }
    }
    while (node = next.pop()) {
      callback(node);
    }
    return this;
  }
  sum(accessor) {
    return this.eachAfter((node) => {
      let sum = Number(accessor(node.data)) || 0;
      const children = node.children;
      if (children) {
        for (const child of children) {
          sum += child.value ?? 0;
        }
      }
      node.value = sum;
    });
  }
  count() {
    return this.eachAfter((node) => {
      const children = node.children;
      node.value = children ? children.reduce((sum, child) => sum + (child.value ?? 0), 0) + 1 : 1;
    });
  }
  sort(compare) {
    return this.eachBefore((node) => {
      if (node.children) {
        node.children.sort(compare);
      }
    });
  }
  path(target) {
    const path = [];
    let node = target;
    while (node && node !== this) {
      path.push(node);
      node = node.parent;
    }
    if (node !== this) {
      throw new Error("target is not a descendant of this node");
    }
    return path.reverse();
  }
  ancestors() {
    const ancestors = [];
    let node = this.parent;
    while (node) {
      ancestors.push(node);
      node = node.parent;
    }
    return ancestors;
  }
  descendants() {
    return Array.from(this);
  }
  leaves() {
    const leaves = [];
    this.eachBefore((node) => {
      if (!node.children) {
        leaves.push(node);
      }
    });
    return leaves;
  }
  links() {
    const links = [];
    const root = this;
    this.each((node) => {
      if (node !== root && node.parent) {
        links.push({ source: node.parent, target: node });
      }
    });
    return links;
  }
  find(filter) {
    let found;
    this.each((node) => {
      if (!found && filter(node)) {
        found = node;
      }
    });
    return found;
  }
  *[Symbol.iterator]() {
    const stack = [this];
    let node;
    while (node = stack.pop()) {
      yield node;
      if (node.children) {
        for (let i = node.children.length - 1; i >= 0; --i) {
          stack.push(node.children[i]);
        }
      }
    }
  }
};
var defaultChildrenAccessor = (node) => node.children;
function hierarchy(data, children = defaultChildrenAccessor) {
  return buildHierarchy(data, null, 0, children);
}
function buildHierarchy(data, parent, depth, childrenAccessor) {
  const node = new HierarchyNodeImpl(data, parent, depth, 0);
  const children = childrenAccessor(data);
  if (children && children.length > 0) {
    const childNodes = children.map((child) => buildHierarchy(child, node, depth + 1, childrenAccessor));
    node.children = childNodes;
    node.height = 1 + Math.max(...childNodes.map((child) => child.height));
  }
  return node;
}
var aimedRatio = 1.618;
function resolveLabelLength(labelLength, node) {
  return typeof labelLength === "function" ? labelLength(node) : labelLength;
}
function squarify(parent, margin, scale, sortingOption, orderOption, labelsEnabled, labelLength, depth = 0) {
  if (orderOption === "keepPlace") {
    layoutNodeWithRows(parent, margin, scale, labelsEnabled, labelLength);
  } else if (orderOption === "newOrder") {
    squarifyNode(parent, margin, scale, sortingOption, labelsEnabled, labelLength, false);
  } else if (orderOption === "keepOrder") {
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
  }
}
function squarifyNode(parent, margin, scale, sortingOption = "none", labelsEnabled, labelLength, orderByOriginalValue) {
  const nodes = parent.children;
  const isLeaf = parent.children.length === 0;
  const needsLabel = labelsEnabled && parent.hasLabel && !isLeaf;
  const labelSize = needsLabel ? resolveLabelLength(labelLength, parent) : 0;
  if (sortingOption !== "none" && nodes && nodes.length > 0) {
    nodes.sort((a, b) => {
      if (sortingOption === "ascending") {
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
function resolveLabelLength2(labelLength, node) {
  return typeof labelLength === "function" ? labelLength(node) : labelLength;
}
function runLayout(root, options) {
  const width = Math.sqrt(root.value);
  root.x0 = 0;
  root.y0 = 0;
  root.x1 = width;
  root.y1 = width;
  squarify(root, 0, false, options.sortingOption, "newOrder", false, 0);
  if (options.numberOfPasses < 2) {
    return;
  }
  const margin = options.margin;
  const marginIncrement = margin / (options.numberOfPasses - 1);
  let currentMargin = options.incrementMargin ? marginIncrement : margin;
  let oldMargin = currentMargin;
  if (options.simpleIncreaseValues) {
    increaseValuesSimple(root, currentMargin, options.applySiblingMargin, 0, options.labelsEnabled, options.labelLength);
  } else {
    increaseValues(root, currentMargin, options.applySiblingMargin, 0, options.labelsEnabled, options.labelLength);
  }
  root.x1 = Math.sqrt(root.value);
  root.y1 = Math.sqrt(root.value);
  const scaleNow = options.scale && options.numberOfPasses === 2;
  squarify(root, currentMargin, scaleNow, options.sortingOption, options.orderOption, options.labelsEnabled, options.labelLength);
  if (options.numberOfPasses > 2) {
    oldMargin = currentMargin;
    currentMargin = options.incrementMargin ? currentMargin + marginIncrement : currentMargin;
    updateValues(root, currentMargin, oldMargin, options.applySiblingMargin, 0, options.labelsEnabled, options.labelLength);
    for (let i = 0; i < options.numberOfPasses - 3; i++) {
      squarify(root, currentMargin, false, options.sortingOption, options.orderOption, options.labelsEnabled, options.labelLength);
      oldMargin = currentMargin;
      currentMargin = options.incrementMargin ? currentMargin + marginIncrement : currentMargin;
      updateValues(root, currentMargin, oldMargin, options.applySiblingMargin, 0, options.labelsEnabled, options.labelLength);
    }
    squarify(root, currentMargin, options.scale, options.sortingOption, options.orderOption, options.labelsEnabled, options.labelLength);
  }
  if (options.applySiblingMargin) {
    if (options.siblingMarginLeavesOnly) {
      shrinkLeavesOnly(root, currentMargin);
    } else {
      shrink(root, currentMargin);
    }
  }
}
function updateValues(node, margin, oldMargin, applySiblingMargin, depth, labelsEnabled, labelLength) {
  const isLeaf = node.children.length === 0;
  if (node.originalValue <= 0) {
    return 0;
  }
  let childrenValueIncrease = 0;
  if (node.children.length > 0) {
    for (const child of node.children) {
      childrenValueIncrease += updateValues(child, margin, oldMargin, true);
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
function treemap() {
  const state = {
    width: 1e3,
    height: 1e3,
    numberOfPasses: 2,
    scale: true,
    simpleIncreaseValues: false,
    incrementMargin: false,
    marginFraction: 0.02,
    applySiblingMargin: true,
    siblingMarginLeavesOnly: false,
    topLabelLevels: 2,
    labelLengthValue: 0.03,
    sortingOption: "descending",
    orderOption: "newOrder",
    collapseFolders: false,
    round: false
  };
  function layout(root) {
    if (state.valueAccessor) {
      root.sum(state.valueAccessor);
    }
    const { sq } = build(root, 0, state);
    if (sq.value <= 0) {
      return root;
    }
    const total = sq.value;
    const k = state.width * state.width / total;
    scaleValues(sq, k);
    const labelsEnabled = state.topLabelLevels > 0;
    const margin = state.marginFraction * state.width;
    const labelLength = state.labelResolver ?? state.labelLengthValue * state.width;
    runLayout(sq, {
      margin,
      numberOfPasses: state.numberOfPasses,
      scale: state.scale,
      simpleIncreaseValues: state.simpleIncreaseValues,
      sortingOption: state.sortingOption,
      orderOption: state.orderOption,
      incrementMargin: state.incrementMargin,
      applySiblingMargin: state.applySiblingMargin,
      siblingMarginLeavesOnly: state.siblingMarginLeavesOnly,
      labelsEnabled,
      labelLength
    });
    const rootX = sq.x0;
    const rootY = sq.y0;
    const factorX = state.width / (sq.x1 - sq.x0);
    const factorY = state.height / (sq.y1 - sq.y0);
    writeBack(sq, rootX, rootY, factorX, factorY, state.round);
    return root;
  }
  layout.size = ((w, h) => {
    if (Array.isArray(w)) {
      state.width = w[0];
      state.height = w[1];
    } else {
      state.width = w;
      state.height = h ?? w;
    }
    return layout;
  });
  layout.value = (accessor) => {
    state.valueAccessor = accessor;
    return layout;
  };
  layout.numberOfPasses = (passes) => {
    if (!Number.isInteger(passes) || passes < 1) {
      throw new Error("numberOfPasses(): must be a positive integer, got " + passes);
    }
    state.numberOfPasses = passes;
    return layout;
  };
  layout.margin = (fraction) => {
    assertRange(fraction, 0, 1, "margin");
    state.marginFraction = fraction;
    return layout;
  };
  layout.applySiblingMargin = (value) => {
    state.applySiblingMargin = value;
    return layout;
  };
  layout.siblingMarginLeavesOnly = (value) => {
    state.siblingMarginLeavesOnly = value;
    return layout;
  };
  layout.floorLabels = (topLevels) => {
    if (!Number.isInteger(topLevels) || topLevels < 0) {
      throw new Error("floorLabels(): topLevels must be a non-negative integer, got " + topLevels);
    }
    state.topLabelLevels = topLevels;
    return layout;
  };
  layout.labelLength = (value) => {
    if (typeof value === "number") {
      assertRange(value, 0, 1, "labelLength");
      state.labelLengthValue = value;
      state.labelResolver = void 0;
    } else if (typeof value === "function") {
      state.labelResolver = value;
    } else {
      throw new Error("labelLength(): expected a number or function, got " + typeof value);
    }
    return layout;
  };
  layout.scale = (value) => {
    state.scale = value;
    return layout;
  };
  layout.simpleIncreaseValues = (value) => {
    state.simpleIncreaseValues = value;
    return layout;
  };
  layout.incrementMargin = (value) => {
    state.incrementMargin = value;
    return layout;
  };
  layout.sorting = (option) => {
    state.sortingOption = option;
    return layout;
  };
  layout.order = (option) => {
    state.orderOption = option;
    return layout;
  };
  layout.collapseFolders = (value) => {
    state.collapseFolders = value;
    return layout;
  };
  layout.round = (value) => {
    state.round = value;
    return layout;
  };
  return layout;
}
function build(node, depth, state) {
  const targets = [node];
  let current = node;
  if (state.collapseFolders) {
    while (current.children && current.children.length === 1) {
      const child = current.children[0];
      if (!child.children || child.children.length === 0) {
        break;
      }
      targets.push(child);
      current = child;
    }
  }
  const children = (current.children ?? []).map((child) => build(child, depth + 1, state)).filter((built) => built.sq.value > 0);
  const isLeaf = children.length === 0;
  const value = isLeaf ? current.value ?? 0 : children.reduce((sum, built) => sum + built.sq.value, 0);
  const labelsEnabled = state.topLabelLevels > 0;
  const sq = {
    name: current.data.name ?? "",
    value,
    originalValue: value,
    depth,
    children: children.map((built) => built.sq),
    rows: [],
    hasLabel: !isLeaf && labelsEnabled && depth < state.topLabelLevels,
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
    data: targets
  };
  return { sq, targets };
}
function scaleValues(node, k) {
  node.value *= k;
  node.originalValue *= k;
  for (const child of node.children) {
    scaleValues(child, k);
  }
}
function writeBack(sq, rootX, rootY, factorX, factorY, round) {
  let x0 = (sq.x0 - rootX) * factorX;
  let y0 = (sq.y0 - rootY) * factorY;
  let x1 = (sq.x1 - rootX) * factorX;
  let y1 = (sq.y1 - rootY) * factorY;
  if (round) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
  }
  const targets = sq.data;
  if (targets) {
    for (const target of targets) {
      target.x0 = x0;
      target.y0 = y0;
      target.x1 = x1;
      target.y1 = y1;
    }
  }
  for (const child of sq.children) {
    writeBack(child, rootX, rootY, factorX, factorY, round);
  }
}
function assertRange(value, min, max, name) {
  if (typeof value !== "number" || Number.isNaN(value) || value < min || value > max) {
    throw new Error(name + "(): value must be between " + min + " and " + max + ", got " + value);
  }
}

// demo/src/lib/codecharta.ts
function isCodeChartaJson(value) {
  if (!value || typeof value !== "object") return false;
  const v = value;
  if (Array.isArray(v.nodes)) return true;
  if (v.meta !== void 0 && Array.isArray(v.files)) return true;
  return false;
}
function toNumericAttributes(attrs) {
  if (!attrs) return void 0;
  const numeric = {};
  for (const [key, val] of Object.entries(attrs)) {
    if (typeof val === "number" && Number.isFinite(val)) numeric[key] = val;
  }
  return Object.keys(numeric).length > 0 ? numeric : void 0;
}
function convertNode(node, attributesById) {
  const own = node.attributes !== void 0 ? toNumericAttributes(node.attributes) : void 0;
  const attributes = own ?? (node.id ? attributesById?.get(node.id) : void 0);
  const children = node.children && node.children.length > 0 ? node.children.map((c) => convertNode(c, attributesById)) : void 0;
  const out = { name: node.name ?? "" };
  if (attributes !== void 0) out.attributes = attributes;
  if (children && children.length > 0) out.children = children;
  return out;
}
function ccJsonToTree(json) {
  if (!isCodeChartaJson(json)) return json;
  const v = json;
  let roots = [];
  let attributesById = null;
  if (Array.isArray(v.nodes)) {
    roots = v.nodes;
  } else {
    const files2 = v.files ?? [];
    roots = files2;
    const metrics = v.lenses?.metrics;
    const lensAttrs = metrics?.attributes;
    if (lensAttrs) attributesById = new Map(Object.entries(lensAttrs));
  }
  if (roots.length === 0) return { name: v.projectName ?? "root" };
  const converted = roots.map((root) => convertNode(root, attributesById));
  if (converted.length === 1) return converted[0];
  return { name: v.projectName ?? "root", children: converted };
}

// .tmp-layout-test.ts
var dir = "demo/public/data/ccjson/";
var files = ["junit4_2019-10-26.cc.json", "httpd_2019-10-26.cc.json", "netbeans_2019-10-19.cc.json", "aoo_2019-08-02.cc.json"];
for (const f of files) {
  const tree = ccJsonToTree(JSON.parse((0, import_fs.readFileSync)(dir + f, "utf8")));
  const t0 = Date.now();
  const root = hierarchy(structuredClone(tree)).sum((d) => !d.children || d.children.length === 0 ? d.attributes?.rloc ?? 0 : 0);
  const layout = treemap().size([400, 400]).numberOfPasses(2).margin(0.01).floorLabels(3).labelLength(0.03);
  const t1 = Date.now();
  layout(root);
  const t2 = Date.now();
  let rects = 0, zeros = 0, nan = 0, leaves = 0, visibleLeaves = 0;
  root.each((n) => {
    rects++;
    const w = n.x1 - n.x0, h = n.y1 - n.y0;
    if (!Number.isFinite(w) || !Number.isFinite(h)) nan++;
    if (w <= 0 || h <= 0) zeros++;
    const isLeaf = !n.children || n.children.length === 0;
    if (isLeaf) {
      leaves++;
      if (w > 0 && h > 0) visibleLeaves++;
    }
  });
  console.log(f.padEnd(30), "| build", t1 - t0 + "ms", "| layout", t2 - t1 + "ms", "| rects", rects, "| bl\xE4tter", leaves, "| sichtbar", visibleLeaves, "| nullflaeche", zeros, "| NaN", nan);
}
