import { describe, expect, it, vi } from 'vitest';
import { createGame, runNight } from '../src/sim/loop.ts';
import { DEFAULT_PLAN, planForNight } from '../src/sim/plan.ts';
import { PLAYABLE } from '../src/sim/monsters.ts';
import type { Archetype } from '../src/sim/types.ts';
import { accessibleName, findAll, fragment, h, hasClass, interactive, mount, render, textOf, type DocLike, type VNode } from '../src/web/kit/h.ts';
import { ICONS, icon, type IconName } from '../src/web/kit/icons.ts';
import { ACTION_KINDS, NEED_KEYS } from '../src/sim/types.ts';
import { bestiaryView, diaryView, headerView, hudView, planView, type Draft, type Settings } from '../src/web/views.ts';

function game() {
  const g = createGame({ seed: 42 });
  runNight(g, planForNight(DEFAULT_PLAN, 1));
  return g;
}

const settings: Settings = { scale: 1, keys: { run: 'r', skip: ' ', focusPlan: 'p' }, grain: true, motion: true, theme: 'night' };

function draftFor(g: ReturnType<typeof game>): Draft {
  const d: Draft = { night: {}, day: {}, build: [], choices: {} };
  for (const m of g.monsters) d.night[m.id] = 'lieLow';
  d.night['count'] = 'feed';
  return d;
}

const noop = () => {};

interface Fake {
  tag: string;
  ns?: string;
  attrs: Record<string, string>;
  props: Record<string, unknown>;
  styles: Record<string, string>;
  listeners: Record<string, unknown>;
  children: Fake[];
  text?: string;
}

const make = (tag: string, ns?: string): Fake => ({ tag, ...(ns ? { ns } : {}), attrs: {}, props: {}, styles: {}, listeners: {}, children: [] });

describe('Feature: Component kit', () => {
  it('Scenario: Views build plain trees', () => {
    const v = h('p', null, 'a', false, null, undefined, 3, ['b', ['c']]);
    expect(v.children.map((c) => c.text)).toEqual(['a', '3', 'b', 'c']);
    expect(textOf(fragment(h('i', null, 'x'), 'y'))).toBe('xy');
  });

  it('Scenario: Every control has an accessible name', () => {
    const g = game();
    const views: Array<[string, VNode]> = [
      ['header', headerView('meta', settings, { onChange: noop, onRemap: noop })],
      ['hud', hudView(g)],
      ['plan', planView(g, draftFor(g), { onChange: noop, onRun: noop, onNewRun: noop })],
      ['bestiary', bestiaryView(new Set<Archetype>(['count']))],
    ];
    const unnamed: string[] = [];
    for (const [name, root] of views) {
      for (const n of interactive(root)) {
        if (n.tag === 'input' && n.props['type'] === 'radio') {
          // radios are named by their label; the group by aria-label
          if (!accessibleName(n, root)) unnamed.push(`${name}: radio ${String(n.props['id'])}`);
          continue;
        }
        if (!accessibleName(n, root)) unnamed.push(`${name}: <${n.tag}> ${JSON.stringify(n.props['id'] ?? n.props['class'] ?? '')}`);
      }
    }
    expect(unnamed).toEqual([]);
    expect(interactive(views[2]![1]).length).toBeGreaterThan(30);
  });

  it('Scenario: Meters report their values', () => {
    const g = game();
    const root = hudView(g);
    const meters = findAll(root, (n) => n.props['role'] === 'meter');
    const suspicion = meters.find((m) => String(m.props['aria-label']).startsWith('Suspicion'));
    expect(suspicion?.props['aria-valuenow']).toBe(g.village.suspicion);
    for (const m of g.monsters) {
      const card = findAll(root, (n) => n.props['data-resident'] === m.id)[0]!;
      const bars = findAll(card, (n) => n.props['role'] === 'meter');
      expect(bars.map((b) => b.props['aria-valuenow'])).toEqual(Object.values(m.needs));
      const critical = findAll(card, (n) => hasClass(n, 'critical')).map((n) => textOf(n.children[0]!));
      const expected = Object.entries(m.needs).filter(([k, v]) => (k === 'anger' ? v >= 60 : v < 20)).map(([k]) => k);
      expect(critical.toSorted()).toEqual(expected.toSorted());
    }
  });

  it('Scenario: The plan reflects and edits the draft', () => {
    const g = game();
    const draft = draftFor(g);
    const onChange = vi.fn();
    const root = planView(g, draft, { onChange, onRun: noop, onNewRun: noop });
    for (const m of g.monsters) {
      const checked = findAll(root, (n) => n.tag === 'input' && n.props['name'] === `act-${m.id}` && n.props['checked'] === true);
      expect(checked, m.id).toHaveLength(1);
      expect(checked[0]!.props['value']).toBe(draft.night[m.id] ?? '');
    }
    const repair = findAll(root, (n) => n.props['id'] === 'act-golem-repair')[0]!;
    (repair.props['onChange'] as () => void)();
    expect(draft.night['golem']).toBe('repair');
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('Scenario: The bestiary shows what has been met', () => {
    const root = bestiaryView(new Set<Archetype>(['count', 'mummy']));
    expect(findAll(root, (n) => n.tag === 'article' && hasClass(n, 'plate') && !hasClass(n, 'locked'))).toHaveLength(2);
    expect(findAll(root, (n) => hasClass(n, 'locked'))).toHaveLength(PLAYABLE.length - 2);
    expect(textOf(root)).toContain('Sanguisuga nobilis');
  });

  it('Scenario: The diary keys entries to residents', () => {
    const g = game();
    const accents = new Map(g.monsters.map((m) => [m.id, `#${m.id.length}00000`]));
    const root = diaryView(g.log, g.log.length, accents);
    const entries = findAll(root, (n) => hasClass(n, 'entry'));
    expect(entries).toHaveLength(g.log.length);
    const phases = findAll(root, (n) => hasClass(n, 'phase')).map(textOf);
    expect(phases).toEqual(['dusk · night 1', 'night · night 1', 'dawn · night 1', 'day · night 1']);
    const withResident = g.log.filter((e) => e.monsterId).length;
    expect(entries.filter((e) => (e.props['style'] as Record<string, string> | undefined)?.['--accent'])).toHaveLength(withResident);
  });

  it('Scenario: Rendering maps trees to the DOM faithfully', () => {
    const wrap = (f: Fake) =>
      new Proxy(f, {
        get(t, k: string) {
          if (k === 'setAttribute') return (a: string, v: string) => (t.attrs[a] = v);
          if (k === 'addEventListener') return (e: string, fn: unknown) => (t.listeners[e] = fn);
          if (k === 'appendChild') return (c: Fake) => t.children.push(c);
          if (k === 'replaceChildren') return (...c: Fake[]) => (t.children = c);
          if (k === 'style') return { setProperty: (n: string, v: string) => (t.styles[n] = v) };
          if (k === 'ownerDocument') return doc;
          return (t as unknown as Record<string, unknown>)[k];
        },
        set(t, k: string, v) {
          t.props[k] = v;
          return true;
        },
      });
    const doc = {
      createElement: (tag: string) => wrap(make(tag)),
      createElementNS: (ns: string, tag: string) => wrap(make(tag, ns)),
      createTextNode: (text: string) => ({ tag: '#text', text }),
    } as unknown as DocLike;
    const drawn = vi.fn();
    const click = vi.fn();
    const tree = h(
      'div',
      { class: 'x', id: 'root', hidden: true, 'aria-label': 'Box', style: { '--accent': '#123456' } },
      h('input', { type: 'checkbox', checked: true, onChange: click }),
      h('canvas', { draw: drawn }),
      h('svg', { viewBox: '0 0 2 2' }, h('path', { d: 'M0 0' })),
      'text',
    );
    const el = render(tree, doc) as unknown as Fake;
    expect(el.attrs).toMatchObject({ class: 'x', id: 'root', 'aria-label': 'Box', hidden: '' });
    expect(el.props['hidden']).toBe(true);
    expect(el.styles['--accent']).toBe('#123456');
    const [input, canvas, svgEl, text] = el.children as [Fake, Fake, Fake, Fake];
    expect(input.props['checked']).toBe(true);
    expect(input.listeners['change']).toBe(click);
    expect(drawn).toHaveBeenCalledWith(canvas);
    expect(svgEl.ns).toBe('http://www.w3.org/2000/svg');
    expect(svgEl.children[0]!.ns).toBe('http://www.w3.org/2000/svg');
    expect(text.text).toBe('text');
    const target = doc.createElement('section') as unknown as Element;
    mount(target, fragment(h('b'), h('i')));
    expect((target as unknown as Fake).children.map((c) => c.tag)).toEqual(['b', 'i']);
  });

  it('Scenario: Every need, action and chip has an icon', () => {
    const required: IconName[] = [...NEED_KEYS, ...ACTION_KINDS, 'idle', 'coin', 'rod', 'rodDown', 'hunter', 'allies'];
    for (const name of required) expect(ICONS[name], name).toBeDefined();
    for (const [name, paths] of Object.entries(ICONS)) {
      for (const d of paths) {
        expect(d, name).toMatch(/^M[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/);
        const nums = [...d.matchAll(/-?\d*\.?\d+/g)].map((m) => Number(m[0]));
        for (const n of nums) expect(Math.abs(n), `${name}: ${d}`).toBeLessThanOrEqual(24);
      }
    }
    const svg = icon('feed');
    expect(svg.props['aria-hidden']).toBe('true');
    const g = game();
    for (const view of [hudView(g), planView(g, draftFor(g), { onChange: noop, onRun: noop, onNewRun: noop })]) {
      for (const holder of findAll(view, (n) => n.children.some((c) => c.tag === 'svg' && String(c.props['class']).startsWith('icon-line')))) {
        expect(textOf(holder).trim().length, 'icon without a label').toBeGreaterThan(0);
      }
    }
  });
});
