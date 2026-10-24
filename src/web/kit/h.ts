/**
 * A tiny, dependency-free view layer (MM-46). Components return plain VNode
 * trees; `render` turns them into DOM in the browser, and tests inspect the
 * trees directly in Node.
 *
 * Props:
 *  - `class`, any attribute (strings, numbers; `true` for a bare attribute,
 *    `false`/`undefined` to omit);
 *  - `style`: an object of properties, custom properties included;
 *  - `onClick`, `onChange`, …: event listeners;
 *  - `checked`, `value`, `disabled`, `selected`, `hidden`: set as properties;
 *  - `draw`: for `<canvas>`, called with the element after it is created.
 */
export type Handler = (ev: Event) => void;
export type Props = Record<string, unknown>;

export interface VNode {
  tag: string;
  props: Props;
  children: VNode[];
  /** For text nodes (tag '#text'). */
  text?: string;
}

export type Child = VNode | string | number | false | null | undefined | Child[];

function flatten(children: Child[], out: VNode[] = []): VNode[] {
  for (const c of children) {
    if (c === false || c === null || c === undefined) continue;
    if (Array.isArray(c)) flatten(c, out);
    else if (typeof c === 'string' || typeof c === 'number') out.push({ tag: '#text', props: {}, children: [], text: String(c) });
    else out.push(c);
  }
  return out;
}

export function h(tag: string, props: Props | null = null, ...children: Child[]): VNode {
  return { tag, props: props ?? {}, children: flatten(children) };
}

/** Several siblings with no wrapper element, for containers that lay out their direct children. */
export function fragment(...children: Child[]): VNode {
  return h('#fragment', null, ...children);
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'path', 'circle', 'g', 'line', 'polyline', 'polygon', 'rect', 'ellipse', 'title']);
const PROPERTIES = new Set(['checked', 'value', 'disabled', 'selected', 'hidden']);

/** The subset of Document that `render` needs, so it can be tested without a browser. */
export interface DocLike {
  createElement(tag: string): Element;
  createElementNS(ns: string, tag: string): Element;
  createTextNode(text: string): Node;
}

export function render(node: VNode, doc: DocLike = document, inSvg = false): Node {
  if (node.tag === '#text') return doc.createTextNode(node.text ?? '');
  if (node.tag === '#fragment') throw new Error('render a fragment with mount(), which expands it');
  const svg = inSvg || node.tag === 'svg' || (SVG_TAGS.has(node.tag) && inSvg);
  const el = svg ? doc.createElementNS(SVG_NS, node.tag) : doc.createElement(node.tag);
  let draw: ((el: Element) => void) | undefined;
  for (const [key, value] of Object.entries(node.props)) {
    if (value === undefined || value === false || value === null) continue;
    if (key === 'draw' && typeof value === 'function') draw = value as (el: Element) => void;
    else if (key === 'style' && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, string>)) (el as HTMLElement).style.setProperty(k, v);
    } else if (/^on[A-Z]/.test(key) && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as Handler);
    } else if (PROPERTIES.has(key)) {
      (el as unknown as Record<string, unknown>)[key] = value;
      if (key === 'hidden' || key === 'disabled') el.setAttribute(key, '');
    } else if (key === 'class') {
      el.setAttribute('class', String(value));
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  for (const child of node.children) {
    if (child.tag === '#fragment') for (const c of child.children) el.appendChild(render(c, doc, svg));
    else el.appendChild(render(child, doc, svg));
  }
  draw?.(el);
  return el;
}

/** Replace everything inside `target` with the rendered node(s). */
export function mount(target: Element, ...nodes: VNode[]): void {
  const expanded = nodes.flatMap((n) => (n.tag === '#fragment' ? n.children : [n]));
  const doc: DocLike = target.ownerDocument ?? document;
  target.replaceChildren(...expanded.map((n) => render(n, doc)));
}

/* ---------- inspection helpers (used by tests and the style guide) ---------- */

export function walk(node: VNode, visit: (n: VNode, parents: readonly VNode[]) => void, parents: VNode[] = []): void {
  visit(node, parents);
  for (const c of node.children) walk(c, visit, [...parents, node]);
}

export function findAll(node: VNode, pred: (n: VNode) => boolean): VNode[] {
  const out: VNode[] = [];
  walk(node, (n) => {
    if (pred(n)) out.push(n);
  });
  return out;
}

export function textOf(node: VNode): string {
  if (node.tag === '#text') return node.text ?? '';
  return node.children.map(textOf).join('');
}

export function hasClass(node: VNode, cls: string): boolean {
  return String(node.props['class'] ?? '').split(/\s+/).includes(cls);
}

const INTERACTIVE = new Set(['button', 'select', 'textarea', 'a']);

/** Every element a keyboard or screen-reader user can operate. */
export function interactive(root: VNode): VNode[] {
  return findAll(root, (n) => INTERACTIVE.has(n.tag) || (n.tag === 'input' && n.props['type'] !== 'hidden') || n.props['role'] === 'radiogroup' || n.props['role'] === 'meter');
}

/** The accessible name, following the parts of the ARIA rules the kit uses. */
export function accessibleName(node: VNode, root: VNode): string {
  const label = node.props['aria-label'];
  if (typeof label === 'string' && label.trim()) return label.trim();
  const by = node.props['aria-labelledby'];
  if (typeof by === 'string') {
    const target = findAll(root, (n) => n.props['id'] === by)[0];
    if (target) return textOf(target).trim();
  }
  const id = node.props['id'];
  if (typeof id === 'string') {
    const forLabel = findAll(root, (n) => n.tag === 'label' && n.props['for'] === id)[0];
    if (forLabel) return textOf(forLabel).trim();
  }
  if (node.tag === 'button' || node.tag === 'a') return textOf(node).trim();
  return '';
}
