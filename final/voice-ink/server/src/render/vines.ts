import { PANEL } from '../domain.ts';

export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
type Glyph = 'bud' | 'heart' | 'diamond' | 'oval' | 'blossom';
type Width = 1 | 2 | 3;
type Piece = {
  readonly parent: number; // A preceding segment, or -1 at the root.
  readonly born: number;   // Fraction of full growth when this piece appears.
  readonly over: boolean;  // Foreground pieces cover the note.
};
export type Segment = Piece & (
  | { readonly kind: 'stem'; readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number; readonly maxWidth: Width }
  | { readonly kind: 'leaf'; readonly x: number; readonly y: number; readonly glyph: Glyph }
);

const PAD = 6;
const GAP = 3;
const AROUND = 0.4;
const STRIDE = Math.ceil(PANEL.width / 8);
type Point = [x: number, y: number];

function inBox(x: number, y: number): boolean {
  return x >= PAD && x < PANEL.width - PAD && y >= PAD && y < PANEL.height - PAD;
}

function blocked(x: number, y: number, keepOut: readonly Rect[]): boolean {
  return !inBox(x, y) || keepOut.some(r =>
    x >= r.x - GAP && x < r.x + r.w + GAP && y >= r.y - GAP && y < r.y + r.h + GAP);
}

// Each row gives its y offset and inclusive range of x offsets.
function rows(ranges: [number, number, number][]): Point[] {
  return ranges.flatMap(([y, left, right]) =>
    Array.from({ length: right - left + 1 }, (_, i): Point => [left + i, y]));
}

const GLYPHS: Record<Glyph, Point[]> = {
  bud: [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]],
  heart: rows([[-2, -2, -1], [-2, 1, 2], [-1, -2, 2], [0, -2, 2], [1, -1, 1], [2, 0, 0]]),
  diamond: rows([[-2, 0, 0], [-1, -1, 1], [0, -2, 2], [1, -1, 1], [2, 0, 0]]),
  oval: rows([[-1, -1, 1], [0, -2, 2], [1, -1, 1]]),
  blossom: [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2]],
};
const IVY: readonly Glyph[] = ['heart', 'diamond', 'oval'];
const STAMP: Record<Width, Point[]> = {
  1: [[0, 0]],
  2: [[0, 0], [1, 0], [0, 1], [1, 1]],
  3: rows([[-1, -1, 1], [0, -1, 1], [1, -1, 1]]),
};

function footprint(piece: Segment, width: Width): Point[] {
  if (piece.kind === 'leaf') {
    return GLYPHS[piece.glyph].map(([dx, dy]) => [Math.round(piece.x) + dx, Math.round(piece.y) + dy]);
  }
  const dx = piece.x1 - piece.x0, dy = piece.y1 - piece.y0;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  const pixels: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(piece.x0 + dx * i / steps), y = Math.round(piece.y0 + dy * i / steps);
    for (const [ox, oy] of STAMP[width]) pixels.push([x + ox, y + oy]);
  }
  return pixels;
}

function clearHalo(bits: Uint8Array, x: number, y: number): void {
  for (let py = y - 1; py <= y + 1; py++) {
    for (let px = x - 1; px <= x + 1; px++) {
      if (inBox(px, py)) bits[py * STRIDE + (px >> 3)] &= ~(0x80 >> (px & 7));
    }
  }
}

export function drawVines(bits: Uint8Array, vines: readonly Segment[], progress: number, keepOut: readonly Rect[]): void {
  const grown = new Uint8Array(vines.length);
  for (const [i, piece] of vines.entries()) {
    if (piece.born <= progress && (piece.parent < 0 || grown[piece.parent])) grown[i] = 1;
  }

  // A stem thickens with the number of growing tips it supports.
  const tips = new Uint32Array(vines.length);
  for (let i = vines.length - 1; i >= 0; i--) {
    const piece = vines[i];
    if (!grown[i] || piece.kind !== 'stem') continue;
    tips[i] ||= 1;
    if (piece.parent >= 0) tips[piece.parent] += tips[i];
  }

  // Hold the vine ink separately until every foreground halo has cleared the note.
  const ink = new Uint8Array(bits.length);
  for (const [i, piece] of vines.entries()) {
    if (!grown[i] || (piece.parent >= 0 && !grown[piece.parent])) {
      grown[i] = 0;
      continue;
    }
    let width: Width = 1;
    if (piece.kind === 'stem' && tips[i] >= 30 && piece.maxWidth >= 2) {
      width = tips[i] >= 90 ? piece.maxWidth : 2;
    }
    if (!piece.over && footprint(piece, 1).some(([x, y]) => blocked(x, y, keepOut))) {
      // A stem can continue behind a line of text. A leaf stops at it.
      if (piece.kind === 'leaf') grown[i] = 0;
      continue;
    }
    for (const [x, y] of footprint(piece, width)) {
      if (piece.over) clearHalo(bits, x, y);
      if (piece.over ? inBox(x, y) : !blocked(x, y, keepOut)) {
        ink[y * STRIDE + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  for (let i = 0; i < bits.length; i++) bits[i] |= ink[i];
}

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One sample per pixel along the rounded frame, starting at the bottom right.
function framePath(inset: number, radius: number): Point[] {
  const left = PAD + inset, right = PANEL.width - 1 - left;
  const top = PAD + inset, bottom = PANEL.height - 1 - top;
  const points: Point[] = [];
  function line(ax: number, ay: number, bx: number, by: number) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay));
    for (let i = 0; i < n; i++) points.push([ax + (bx - ax) * i / n, ay + (by - ay) * i / n]);
  }
  function arc(cx: number, cy: number, start: number, end: number) {
    const n = Math.ceil(Math.abs(end - start) * radius);
    for (let i = 0; i < n; i++) {
      const angle = start + (end - start) * i / n;
      points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
    }
  }
  line(right, bottom - radius, right, top + radius);
  arc(right - radius, top + radius, 0, -Math.PI / 2);
  line(right - radius, top, left + radius, top);
  arc(left + radius, top + radius, -Math.PI / 2, -Math.PI);
  line(left, top + radius, left, bottom - radius);
  arc(left + radius, bottom - radius, Math.PI, Math.PI / 2);
  line(left + radius, bottom, right - radius, bottom);
  arc(right - radius, bottom - radius, Math.PI / 2, 0);
  return points;
}

type Tendril = {
  x: number; y: number; heading: number; pull: number; parent: number;
  start: number; length: number; order: number;
};

function tendril(random: () => number, vines: Segment[], { x, y, heading, pull, parent, start, length, order }: Tendril): void {
  const stepTime = 0.0075;
  let side = random() < 0.5 ? 1 : -1;
  let nextLeaf = 2, nextFork = 4 + random() * 4;
  const phase = random() * 6.28, wobble = 0.18 + random() * 0.2;
  for (let step = 0; step * 3 < length; step++) {
    heading += wobble * Math.sin(step / 3.2 + phase) * 0.5 + (random() - 0.5) * 0.25;
    heading += Math.atan2(Math.sin(pull - heading), Math.cos(pull - heading)) * 0.035;
    const nx = x + Math.cos(heading) * 3, ny = y + Math.sin(heading) * 3;
    if (!inBox(Math.round(nx), Math.round(ny))) return;
    const born = Math.min(1, start + step * stepTime);
    vines.push({ kind: 'stem', x0: x, y0: y, x1: nx, y1: ny, parent, born, maxWidth: order ? 1 : 2, over: true });
    parent = vines.length - 1;
    x = nx;
    y = ny;

    if (step >= nextLeaf) {
      nextLeaf = step + 2 + Math.floor(random() * 2);
      side = -side;
      const angle = heading + side * 1.2;
      vines.push({
        kind: 'leaf', x: x + Math.cos(angle) * 3, y: y + Math.sin(angle) * 3,
        glyph: IVY[Math.floor(random() * IVY.length)], parent, born: Math.min(1, born + stepTime * 0.6), over: true,
      });
    }
    if (step >= nextFork && order < 2) {
      nextFork = step + 5 + random() * 6;
      if (random() < 0.45) {
        const turn = (random() < 0.5 ? 1 : -1) * (0.7 + random() * 0.5);
        tendril(random, vines, {
          x, y, heading: heading + turn, pull, parent, start: born + stepTime * 2,
          length: (length - step * 3) * 0.55, order: order + 1,
        });
      }
    }
  }
}

export function growVines(seed: number): readonly Segment[] {
  const random = rng(seed);
  const path = framePath(4, 9);
  const half = Math.floor(path.length / 2);
  const phase1 = random() * 6.28, phase2 = random() * 6.28;
  const cx = PANEL.width / 2, cy = PANEL.height / 2;
  const vines: Segment[] = [];
  const anchors: { x: number; y: number; nx: number; ny: number; parent: number }[] = [];

  function position(distance: number, direction: 1 | -1) {
    const index = (s: number) => (s * direction + path.length) % path.length;
    const [x, y] = path[index(distance)];
    const [nextX, nextY] = path[index(distance + 1)];
    const dx = nextX - x, dy = nextY - y;
    const length = Math.hypot(dx, dy) || 1;
    const tx = dx / length, ty = dy / length;
    let nx = -ty, ny = tx;
    if ((cx - x) * nx + (cy - y) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    const wave = 1.6 * Math.sin(distance / 6.5 + phase1) + 0.6 * Math.sin(distance / 15 + phase2);
    return { x: x + nx * wave, y: y + ny * wave, nx, ny, tx, ty };
  }

  // Two shoots follow opposite halves of the frame, with buds and short spurs.
  for (const direction of [1, -1] as const) {
    let parent = -1, nextLeaf = 6, nextSpur = 12 + random() * 10, side = 1;
    let previous = position(0, direction);
    for (let s = 3; s <= half; s += 3) {
      const p = position(s, direction);
      const born = (s / half) * AROUND;
      vines.push({
        kind: 'stem', x0: previous.x, y0: previous.y, x1: p.x, y1: p.y,
        parent, born, maxWidth: 3, over: false,
      });
      parent = vines.length - 1;
      previous = p;
      anchors.push({ x: p.x, y: p.y, nx: p.nx, ny: p.ny, parent });

      if (s >= nextLeaf) {
        nextLeaf = s + 5 + random() * 5;
        side = -side;
        const reach = side > 0 ? 3 : 2;
        vines.push({
          kind: 'leaf', x: p.x + p.nx * side * reach + p.tx, y: p.y + p.ny * side * reach + p.ty,
          parent, born: born + 0.006, glyph: 'bud', over: false,
        });
      }
      if (s < nextSpur) continue;
      nextSpur = s + 14 + random() * 12;
      const lean = (random() < 0.5 ? 1 : -1) * (0.5 + random() * 0.35);
      const steps = 2 + Math.floor(random() * 3);
      let x = p.x, y = p.y, angle = Math.atan2(p.ny, p.nx) + lean, spurParent = parent;
      for (let k = 0; k < steps; k++) {
        const nx = x + Math.cos(angle) * 2.6, ny = y + Math.sin(angle) * 2.6;
        vines.push({
          kind: 'stem', x0: x, y0: y, x1: nx, y1: ny, parent: spurParent,
          born: born + 0.008 + k * 0.004, maxWidth: 1, over: false,
        });
        spurParent = vines.length - 1;
        x = nx;
        y = ny;
        angle -= lean * 0.35;
      }
      vines.push({ kind: 'leaf', x, y, parent: spurParent, born: born + 0.008 + steps * 0.004, glyph: 'bud', over: false });
      if (random() < 0.45) {
        vines.push({
          kind: 'leaf', x: x + Math.cos(angle) * 3, y: y + Math.sin(angle) * 3,
          parent: spurParent, born: born + 0.14, glyph: 'blossom', over: false,
        });
      }
    }
  }

  // Leaves fill the outer edge. Tendrils grow inward from points along the frame.
  for (const a of anchors) {
    if (random() < 0.5) continue;
    const born = AROUND + (1 - AROUND) * (0.25 + 0.7 * random());
    vines.push({
      kind: 'leaf', x: a.x - a.nx * 3, y: a.y - a.ny * 3, parent: a.parent,
      born, glyph: IVY[Math.floor(random() * IVY.length)], over: true,
    });
  }
  for (let i = Math.floor(random() * 3); i < anchors.length; i += 3 + Math.floor(random() * 4)) {
    const a = anchors[i];
    const start = AROUND + (1 - AROUND) * (0.02 + 0.6 * random());
    tendril(random, vines, {
      x: a.x, y: a.y, heading: Math.atan2(a.ny, a.nx) + (random() - 0.5) * 0.9,
      parent: a.parent, start, length: 70 + random() * 90, pull: Math.atan2(cy - a.y, cx - a.x), order: 0,
    });
  }
  return vines;
}
