/**
 * A recording stand-in for CanvasRenderingContext2D. Every method call and
 * property write is logged as a string, so art tests can check that drawing
 * happens, is deterministic, and never produces NaN coordinates, all without
 * a browser.
 */
export interface Recording {
  ctx: CanvasRenderingContext2D;
  calls: string[];
}

function fmt(v: unknown): string {
  if (typeof v === 'number') return Number.isNaN(v) ? 'NaN' : Number.isFinite(v) ? v.toFixed(2) : String(v);
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') return '{obj}';
  return String(v);
}

export function recorder(): Recording {
  const calls: string[] = [];
  const gradient = { addColorStop: (o: number, c: string) => calls.push(`stop(${fmt(o)},${c})`) };
  const state: Record<string, unknown> = {
    globalAlpha: 1,
    lineWidth: 1,
    font: '10px serif',
    fillStyle: '#000',
    strokeStyle: '#000',
    globalCompositeOperation: 'source-over',
  };
  const special: Record<string, (...a: unknown[]) => unknown> = {
    createLinearGradient: (...a) => {
      calls.push(`linear(${a.map(fmt).join(',')})`);
      return gradient;
    },
    createRadialGradient: (...a) => {
      calls.push(`radial(${a.map(fmt).join(',')})`);
      return gradient;
    },
    createPattern: () => ({}),
    measureText: (s) => ({ width: String(s).length * 6 }),
    getLineDash: () => [],
  };
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in special) return special[prop];
      if (prop in target) return target[prop];
      if (prop === 'canvas') return { width: 960, height: 540 };
      return (...args: unknown[]) => {
        calls.push(`${prop}(${args.map(fmt).join(',')})`);
      };
    },
    set(target, prop: string, value: unknown) {
      target[prop] = value;
      calls.push(`${prop}=${fmt(value)}`);
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

export function hasNaN(calls: readonly string[]): boolean {
  return calls.some((c) => c.includes('NaN') || c.includes('Infinity'));
}
