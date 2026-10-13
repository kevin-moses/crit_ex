import { gsap } from 'gsap';
import nlp from 'compromise';

// --- tuning ------------------------------------------------------------------

// Which words get an effect, in compromise match syntax
// (https://observablehq.com/@spencermountain/compromise-match-syntax).
// e.g. '(#Noun|#Verb|#Adjective) && !#Pronoun' to leave "you", "I" etc. alone.
const WORD_MATCH = '(#Noun|#Verb|#Adjective)';

const REDACT = {
    color: '#000000',      // bar color
    duration: 0.6,         // fade time of each bar (s)
    stagger: 0.015,        // delay between one bar and the next (s)
    order: 'start',        // which bar goes first: 'start' | 'end' | 'center' | 'edges' | 'random'
    ease: 'power2.out',    // any GSAP ease: https://gsap.com/docs/v3/Eases
    context: 4             // redacted words revealed on each side of a guessed word
};

export const CIPHER = {
    glyphs: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&$@',
    color: '#000000',
    // Monospace keeps every glyph the same width as the slot it sits in;
    // a proportional font lets a "W" spill over an "i" next to it.
    font: '"Courier Prime", "Courier New", monospace',
    size: '1em',           // same face as the body, so no size adjustment
    interval: 0.8,         // base time between changes of one character (s)
    jitter: 0.5,           // random +/- fraction of `interval` per change; 0 = metronomic
    offset: 0.05,          // phase delay per character along the text (s); makes a wave
    offsetRandom: 0.3,     // extra random phase per character (s); breaks the wave up
    flash: 0.25,           // fade-in time of a new glyph (s); 0 = instant swap
    flashFrom: 0.2,        // opacity a new glyph fades in from
    hoverRadius: 1         // headings: characters unmasked each side of the hovered one
};

// --- word wrapping -----------------------------------------------------------

// Wraps every WORD_MATCH word inside `el` in a <span class="className">,
// leaving links and other inline markup intact. Tagging runs on the whole
// element's text so words keep their sentence context. Returns the spans in
// reading order.
function wrapWords(el, className) {
    const nodes = [];
    let text = '';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        nodes.push({ node: walker.currentNode, start: text.length });
        text += walker.currentNode.nodeValue;
    }

    const terms = nlp(text)
        .match(WORD_MATCH)
        .json({ offset: true })
        .flatMap((match) => match.terms.map((term) => term.offset));

    const spans = [];
    // Right to left: wrapping splits a text node, and only the part before the
    // split stays in `owner.node`, so offsets of earlier terms remain valid.
    for (const { start, length } of terms.reverse()) {
        const owner = nodes.findLast((n) => n.start <= start);
        const local = start - owner.start;
        if (local + length > owner.node.nodeValue.length) {
            continue; // word straddles a tag boundary; leave it plain
        }

        const range = document.createRange();
        range.setStart(owner.node, local);
        range.setEnd(owner.node, local + length);
        const span = document.createElement('span');
        span.className = className;
        range.surroundContents(span);
        spans.push(span);
    }
    return spans.reverse();
}

function wrapSection(section, className) {
    return [...section.querySelectorAll('p, li')].flatMap((el) => wrapWords(el, className));
}

// --- redaction ---------------------------------------------------------------

function setupRedact(section) {
    const words = wrapSection(section, 'redact');
    section.style.setProperty('--redact-color', REDACT.color);

    // Controls live in the sidebar, linked to this section by its id.
    const controls = document.querySelector(`[data-controls="${section.id}"]`);
    const button = controls.querySelector('.redact-toggle');
    let revealed = false;

    button.addEventListener('click', () => {
        revealed = !revealed;
        button.textContent = revealed ? 'Redact all' : 'Reveal all';
        button.setAttribute('aria-pressed', revealed);

        gsap.to(words, {
            '--bar-opacity': revealed ? 0 : 1,
            duration: REDACT.duration,
            ease: REDACT.ease,
            stagger: { each: REDACT.stagger, from: REDACT.order },
            overwrite: true // clicking mid-fade reverses from wherever it is
        });
    });

    // Typing a redacted word reveals every occurrence plus its neighbours.
    // Case-folds and reduces to a root ("Scams" -> "scam", "attacked" -> "attack")
    // so singular/plural and verb forms of a word count as the same guess.
    const normalize = (text) => {
        const doc = nlp(text).compute('root');
        const term = doc.json()[0]?.terms[0];
        const key = term?.root ?? term?.normal ?? text;
        return key.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    };
    const keys = words.map((w) => normalize(w.textContent));
    const guess = controls.querySelector('.redact-guess');

    guess.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') {
            return;
        }
        const key = normalize(guess.value);
        guess.value = ''; // Enter always empties the box, hit or miss
        if (!key) {
            return;
        }

        const hits = new Set();
        keys.forEach((k, i) => {
            if (k !== key) {
                return;
            }
            for (let j = i - REDACT.context; j <= i + REDACT.context; j++) {
                if (words[j]) {
                    hits.add(words[j]);
                }
            }
        });
        if (hits.size === 0) {
            return;
        }

        gsap.to([...hits], {
            '--bar-opacity': 0,
            duration: REDACT.duration,
            ease: REDACT.ease,
            stagger: { each: REDACT.stagger, from: 'start' },
            overwrite: 'auto'
        });
    });
}

// --- cipher ------------------------------------------------------------------

export function randomGlyph() {
    return CIPHER.glyphs[Math.floor(Math.random() * CIPHER.glyphs.length)];
}

// Splits `word`'s text into one .cipher-char span per character and returns them.
function splitIntoChars(word) {
    const chars = [];
    const text = word.textContent;
    word.textContent = '';
    for (const c of text) {
        const span = document.createElement('span');
        span.className = 'cipher-char';
        span.textContent = c;
        span.dataset.glyph = randomGlyph();
        word.append(span);
        chars.push(span);
    }
    return chars;
}

// Keeps the glyph of every char in `chars` changing, each on its own schedule.
function animateCipher(chars) {
    // Modulo keeps a long passage from waiting ages before its tail starts
    // moving: every character makes its first change within one interval.
    const now = gsap.ticker.time;
    const schedule = chars.map((el, i) => ({
        el,
        next: now + ((i * CIPHER.offset) % CIPHER.interval) + Math.random() * CIPHER.offsetRandom
    }));

    gsap.ticker.add((time) => {
        for (const item of schedule) {
            if (time < item.next) {
                continue;
            }
            item.el.dataset.glyph = randomGlyph();
            item.next = time + CIPHER.interval * (1 + (Math.random() * 2 - 1) * CIPHER.jitter);

            if (CIPHER.flash > 0) {
                gsap.fromTo(item.el,
                    { '--glyph-opacity': CIPHER.flashFrom },
                    { '--glyph-opacity': 1, duration: CIPHER.flash, overwrite: true });
            }
        }
    });
}

function setCipherVars(el) {
    el.style.setProperty('--cipher-color', CIPHER.color);
    el.style.setProperty('--cipher-font', CIPHER.font);
    el.style.setProperty('--cipher-size', CIPHER.size);
}

function setupCipher(section) {
    setCipherVars(section);

    // Each character keeps its original letter as transparent text, so layout,
    // copy/paste and screen readers all see the real word. The cipher glyph is
    // drawn over it from `data-glyph` (see style.css), so swapping glyphs of a
    // different width never reflows the paragraph.
    const chars = wrapSection(section, 'cipher').flatMap(splitIntoChars);
    animateCipher(chars);
}

// Headings cipher every character (not just nouns/verbs); hovering a character
// unmasks it and its neighbours (see style.css). Spaces stay plain text so lines still wrap.
function setupHeadings() {
    const chars = [];
    for (const heading of document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
        const own = [];
        heading.classList.add('cipher-heading');
        setCipherVars(heading);

        const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }
        for (const node of textNodes) {
            const frag = document.createDocumentFragment();
            for (const part of node.nodeValue.split(/(\s+)/)) {
                if (part === '' || /^\s+$/.test(part)) {
                    frag.append(part);
                    continue;
                }
                const word = document.createElement('span');
                word.textContent = part;
                own.push(...splitIntoChars(word));
                frag.append(word);
            }
            node.replaceWith(frag);
        }
        chars.push(...own);

        const unmask = (center) => {
            own.forEach((c, i) => {
                c.classList.toggle('unmasked', Math.abs(i - center) <= CIPHER.hoverRadius);
            });
        };
        heading.addEventListener('mouseover', (event) => {
            const i = own.indexOf(event.target);
            if (i !== -1) {
                unmask(i);
            }
        });
        heading.addEventListener('mouseleave', () => unmask(Infinity));
    }
    animateCipher(chars);
}

// --- init --------------------------------------------------------------------

const effects = { redact: setupRedact, cipher: setupCipher };

for (const section of document.querySelectorAll('[data-effect]')) {
    effects[section.dataset.effect](section);
}

setupHeadings();
