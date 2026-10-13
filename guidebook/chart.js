// Threat-actor flow chart: data sources -> aggregation -> attacks, drawn with d3.
// Edit NODES / LINKS below to change the diagram; layout is computed from them.
import { gsap } from 'gsap';
import { CIPHER, randomGlyph } from './app.js';

const d3 = window.d3;

const WIDTH = 900;
const HEIGHT = 620;

// x is the node's center, y its vertical center, w its width. Height follows
// from the number of text lines.
const NODES = [
    // data: third-party sources, then public sources, left-to-right in time
    { id: 'breaching', tier: 'data', x: 330, y: 30, w: 110, lines: ['data breaching', '(illegal)'] },
    { id: 'osint', tier: 'data', x: 460, y: 30, w: 110, lines: ['open-source', 'intelligence'] },
    { id: 'brokers', tier: 'data', x: 590, y: 30, w: 110, lines: ['data brokers', '(legal)'] },
    { id: 'tts', tier: 'data', x: 730, y: 30, w: 100, lines: ['TTS models', '(open/closed)'] },
    { id: 'stt', tier: 'data', x: 840, y: 30, w: 100, lines: ['STT models', '(open/closed)'] },
    { id: 'google', tier: 'data', x: 150, y: 140, w: 100, lines: ['google'] },
    { id: 'voicemail', tier: 'data', x: 290, y: 140, w: 100, lines: ['voicemail'] },
    { id: 'youtube', tier: 'data', x: 430, y: 140, w: 100, lines: ['youtube/', 'videos'] },
    { id: 'linkedin', tier: 'data', x: 570, y: 140, w: 100, lines: ['linkedin'] },

    // aggregation
    { id: 'context', tier: 'aggregation', x: 160, y: 340, w: 110, lines: ['context', 'gathering'] },
    { id: 'textcomp', tier: 'aggregation', x: 290, y: 340, w: 110, lines: ['data', 'compilation', '(text)'] },
    { id: 'mediacomp', tier: 'aggregation', x: 420, y: 340, w: 110, lines: ['data', 'compilation', '(multimedia)'] },
    { id: 'pretext', tier: 'aggregation', x: 550, y: 340, w: 110, lines: ['pretext', 'calling', '(audio', 'saving)'] },
    { id: 'malware', tier: 'aggregation', x: 680, y: 340, w: 110, lines: ['malware,', 'account', 'access'] },
    { id: 'voices', tier: 'aggregation', x: 810, y: 340, w: 110, lines: ['generate', 'realistic', 'voices'] },

    // attacks
    { id: 'financial', tier: 'attack', x: 180, y: 540, w: 150, lines: ['financial', 'scams'] },
    { id: 'phishing', tier: 'attack', x: 365, y: 540, w: 150, lines: ['hyper-', 'personalized', 'phishing'] },
    { id: 'agents', tier: 'attack', x: 560, y: 540, w: 150, lines: ['autonomous', 'agent scams'] },
    { id: 'deepfakes', tier: 'attack', x: 770, y: 540, w: 150, lines: ['impersonation', '+ deepfakes'] }
];

const LINKS = [
    ['google', 'context'], ['google', 'textcomp'],
    ['voicemail', 'mediacomp'], ['voicemail', 'pretext'],
    ['youtube', 'mediacomp'],
    ['linkedin', 'context'], ['linkedin', 'textcomp'],
    ['breaching', 'context'], ['breaching', 'malware'],
    ['osint', 'context'], ['osint', 'textcomp'],
    ['brokers', 'context'], ['brokers', 'textcomp'], ['brokers', 'mediacomp'],
    ['tts', 'voices'], ['stt', 'voices'],

    ['context', 'financial'], ['context', 'phishing'], ['context', 'deepfakes'],
    ['textcomp', 'financial'], ['textcomp', 'phishing'], ['textcomp', 'agents'],
    ['mediacomp', 'agents'], ['mediacomp', 'deepfakes'],
    ['pretext', 'agents'], ['pretext', 'deepfakes'],
    ['malware', 'financial'], ['malware', 'agents'], ['malware', 'deepfakes'],
    ['voices', 'deepfakes']
];

const TIERS = [
    { label: 'data', y: 85 },
    { label: 'aggregation', y: 340 },
    { label: 'attack', y: 540 }
];
const TIER_RULES = [270, 450];
const AXIS_Y = 215;

const FONT = { node: 11, attack: 13, line: 14.5 };

function layout() {
    const byId = new Map(NODES.map((n) => [n.id, n]));
    for (const n of NODES) {
        const size = n.tier === 'attack' ? FONT.attack : FONT.node;
        n.size = size;
        n.lineHeight = size * 1.3;
        n.h = n.lines.length * n.lineHeight + 18;
        n.top = n.y - n.h / 2;
        n.bottom = n.y + n.h / 2;
        n.in = [];
        n.out = [];
    }

    const links = LINKS.map(([s, t]) => ({ source: byId.get(s), target: byId.get(t) }));
    for (const l of links) {
        l.source.out.push(l);
        l.target.in.push(l);
    }

    // Spread the ends of edges along a node's edge instead of stacking them at
    // the center, ordered left-to-right so edges cross as little as possible.
    const spread = (node, list, other, key) => {
        list.sort((a, b) => a[other].x - b[other].x);
        const pad = 14;
        const span = node.w - 2 * pad;
        list.forEach((l, i) => {
            l[key] = list.length === 1
                ? node.x
                : node.x - node.w / 2 + pad + (span * i) / (list.length - 1);
        });
    };
    for (const n of NODES) {
        spread(n, n.out, 'target', 'sx');
        spread(n, n.in, 'source', 'tx');
    }
    return { byId, links };
}

// Courier Prime's advance width, as a fraction of the font size. Every
// character is its own <text>, placed on this grid, so a swapping glyph never
// shifts its neighbours.
const CHAR_WIDTH = 0.6;

const cipherChars = [];

// Draws `lines` as ciphered text into `parent` and returns an object whose
// `reveal(true|false)` swaps the real letters in and out. `anchor` is
// 'middle' | 'start' | 'end' relative to x; y is the first baseline.
function cipherText(parent, lines, { x, y, size, lineHeight = size * 1.3, anchor = 'middle', className = '' }) {
    const group = parent.append('g').attr('aria-hidden', 'true');
    const chars = [];
    lines.forEach((line, row) => {
        const width = line.length * CHAR_WIDTH * size;
        const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
        [...line].forEach((ch, i) => {
            if (ch === ' ') {
                return;
            }
            const el = group.append('text')
                .attr('class', className)
                .attr('x', left + (i + 0.5) * CHAR_WIDTH * size)
                .attr('y', y + row * lineHeight)
                .attr('text-anchor', 'middle')
                .attr('font-size', size)
                .text(randomGlyph());
            const record = { el, ch, revealed: false, next: 0 };
            chars.push(record);
            cipherChars.push(record);
        });
    });
    return {
        reveal(on) {
            for (const c of chars) {
                c.revealed = on;
                c.el.text(on ? c.ch : randomGlyph()).attr('opacity', 1);
            }
        }
    };
}

// Same rhythm as the page's cipher (see CIPHER in app.js).
function startCipher() {
    const now = gsap.ticker.time;
    cipherChars.forEach((c, i) => {
        c.next = now + ((i * CIPHER.offset) % CIPHER.interval) + Math.random() * CIPHER.offsetRandom;
    });
    gsap.ticker.add((time) => {
        for (const c of cipherChars) {
            if (c.revealed || time < c.next) {
                continue;
            }
            c.el.text(randomGlyph());
            c.next = time + CIPHER.interval * (1 + (Math.random() * 2 - 1) * CIPHER.jitter);
            if (CIPHER.flash > 0) {
                gsap.fromTo(c.el.node(),
                    { opacity: CIPHER.flashFrom },
                    { opacity: 1, duration: CIPHER.flash, overwrite: true });
            }
        }
    });
}

function draw(container) {
    const { links } = layout();

    const svg = d3.select(container).append('svg')
        .attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`)
        .attr('role', 'img')
        .attr('aria-label', 'Flow chart from data sources, through aggregation, to AI-enabled attacks.');

    svg.append('defs').append('marker')
        .attr('id', 'threat-arrow')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 9).attr('refY', 5)
        .attr('markerWidth', 7).attr('markerHeight', 7)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M0,1 L9,5 L0,9 Z').attr('fill', 'currentColor');

    // tier rules and labels
    svg.append('g').selectAll('line').data(TIER_RULES).join('line')
        .attr('class', 'tm-rule')
        .attr('x1', 0).attr('x2', WIDTH).attr('y1', (y) => y).attr('y2', (y) => y);
    for (const tier of TIERS) {
        const label = cipherText(svg, [tier.label.toUpperCase()], {
            x: 0, y: tier.y, size: 11, anchor: 'start', className: 'tm-tier'
        });
        // a transparent hit area, since the glyphs themselves are tiny
        svg.append('rect').attr('class', 'tm-hit')
            .attr('x', 0).attr('y', tier.y - 14)
            .attr('width', tier.label.length * 11 * CHAR_WIDTH).attr('height', 20)
            .on('mouseenter', () => label.reveal(true))
            .on('mouseleave', () => label.reveal(false));
    }

    // time axis
    svg.append('line').attr('class', 'tm-axis')
        .attr('x1', 100).attr('x2', WIDTH - 20).attr('y1', AXIS_Y).attr('y2', AXIS_Y)
        .attr('marker-end', 'url(#threat-arrow)');
    const timeLabel = cipherText(svg, ['time'], {
        x: WIDTH, y: AXIS_Y + 22, size: 12, anchor: 'end', className: 'tm-axis-label'
    });
    svg.append('rect').attr('class', 'tm-hit')
        .attr('x', WIDTH - 4 * 12 * CHAR_WIDTH).attr('y', AXIS_Y + 8)
        .attr('width', 4 * 12 * CHAR_WIDTH).attr('height', 20)
        .on('mouseenter', () => timeLabel.reveal(true))
        .on('mouseleave', () => timeLabel.reveal(false));

    const link = d3.linkVertical();
    const edges = svg.append('g').selectAll('path').data(links).join('path')
        .attr('class', 'tm-edge')
        .attr('marker-end', 'url(#threat-arrow)')
        .attr('d', (l) => link({
            source: [l.sx, l.source.bottom],
            target: [l.tx, l.target.top - 2]
        }));

    const nodes = svg.append('g').selectAll('g').data(NODES).join('g')
        .attr('class', (n) => `tm-node tm-${n.tier}`)
        .attr('tabindex', 0)
        .attr('transform', (n) => `translate(${n.x - n.w / 2},${n.top})`);

    nodes.append('rect').attr('width', (n) => n.w).attr('height', (n) => n.h).attr('rx', 3);
    nodes.append('title').text((n) => n.lines.join(' '));
    nodes.each(function (n) {
        n.text = cipherText(d3.select(this), n.lines, {
            x: n.w / 2,
            y: 9 + n.size - 2,
            size: n.size,
            lineHeight: n.lineHeight
        });
    });

    // Hover / focus: light up everything the node feeds or is fed by.
    const related = (start) => {
        const seen = new Set([start]);
        const walk = (n, dir) => {
            for (const l of n[dir]) {
                const next = dir === 'out' ? l.target : l.source;
                if (!seen.has(next)) {
                    seen.add(next);
                    walk(next, dir);
                }
            }
        };
        walk(start, 'out');
        walk(start, 'in');
        return seen;
    };
    const focus = (n) => {
        n.text.reveal(true);
        const set = related(n);
        nodes.classed('tm-dim', (d) => !set.has(d));
        edges.classed('tm-dim', (l) => !(set.has(l.source) && set.has(l.target)))
            .classed('tm-lit', (l) => set.has(l.source) && set.has(l.target));
    };
    const clear = (event, n) => {
        n.text.reveal(false);
        nodes.classed('tm-dim', false);
        edges.classed('tm-dim', false).classed('tm-lit', false);
    };
    nodes.on('mouseenter focus', (event, n) => focus(n))
        .on('mouseleave blur', clear);

    startCipher();
}

for (const el of document.querySelectorAll('.threat-map')) {
    draw(el);
}
