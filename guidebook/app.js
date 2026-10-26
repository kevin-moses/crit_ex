import { gsap } from 'gsap';
import nlp from 'compromise';
import { setupChecklists, redaction, save } from './checklist.js';

// --- tuning ------------------------------------------------------------------

// Which words get an effect, in compromise match syntax
// (https://observablehq.com/@spencermountain/compromise-match-syntax).
// e.g. '(#Noun|#Verb|#Adjective) && !#Pronoun' to leave "you", "I" etc. alone.
const WORD_MATCH = '(#Noun|#Verb|#Adjective)';

export const REDACT = {
    color: '#000000',      // bar color
    duration: 0.6,         // fade time of each bar (s)
    stagger: 0.015,        // delay between one bar and the next (s)
    order: 'start',        // which bar goes first: 'start' | 'end' | 'center' | 'edges' | 'random'
    ease: 'power2.out',    // any GSAP ease: https://gsap.com/docs/v3/Eases
    context: 6,            // redacted words revealed on each side of a guessed word
    revealAfter: 10,       // guesses before the "Reveal all" button appears
    fieldStagger: 0.04,    // time between one character and the next when a form field is enciphered (s)
    unlockShare: 2 / 3     // share of a checkbox item's redacted text (by characters) to uncover before it can be checked
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
    hoverRadius: 1,        // headings: characters unmasked each side of the hovered one
    hoverLinger: 0.5       // time unmasked text stays readable after the pointer moves off it (s)
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

// The elements redaction works in: each is tagged on its own, and a word's saved
// key names the one it sits in.
const BLOCK = '.check-item, p, li';

// Wraps one redacted section and hands its words to `addWords`. Collapsed
// broker groups hold most of the page's text, so each is wrapped once the page
// is idle, or when first opened if that comes sooner; until then its contents
// stay hidden (see style.css).
function setupRedact(section, addWords) {
    section.style.setProperty('--redact-color', REDACT.color);
    const deferred = [...section.querySelectorAll('details.removal-group:not([open])')];

    // In reading order, so `addWords` gets one contiguous stretch of the page.
    const wrap = (root, skip = () => false) => addWords(
        [...root.querySelectorAll(BLOCK)]
            .filter((el) => !skip(el))
            .flatMap((el) => (el.matches('.check-item') ? setupCheckItem(el) : wrapWords(el, 'redact')))
    );
    wrap(section, (el) => deferred.some((group) => group.contains(el)));

    for (const group of deferred) {
        group.classList.add('redact-pending');
        pendingGroups++;
        let wrapped = false;
        const wrapGroup = () => {
            if (wrapped) {
                return;
            }
            wrapped = true;
            pendingGroups--;
            wrap(group);
            group.classList.remove('redact-pending');
            updateStats();
        };
        group.addEventListener('toggle', wrapGroup, { once: true });
        whenIdle(wrapGroup);
    }
}

const whenIdle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 50));

// Which words the reader has uncovered is saved (see checklist.js) and put back,
// without animation, on the next visit. A word is keyed by the block it sits in
// (a hash of its text, so editing one paragraph leaves the rest alone) and its
// position there.
const wordKeys = new WeakMap();
const uncovered = new Set(redaction.words);

function hashText(text) {
    let h = 5381;
    for (let i = 0; i < text.length; i++) {
        h = (Math.imul(h, 33) ^ text.charCodeAt(i)) >>> 0;
    }
    return h.toString(36);
}

function keyWords(words) {
    const blocks = new Set(words.map((word) => word.closest(BLOCK)));
    for (const block of blocks) {
        const hash = hashText(block.textContent);
        const blockWords = block.querySelectorAll('.redact');
        blockWords.forEach((word, i) => wordKeys.set(word, `${hash}:${i}`));
        blockCounts.set(hash, blockWords.length);
    }
}

// Uncovered as far as the reader is concerned, even while its bar is still fading.
const isUncovered = (word) => redaction.revealed || uncovered.has(wordKeys.get(word));

// Saves the redaction state and brings everything that depends on it up to date.
function redactionChanged() {
    redaction.words = [...uncovered];
    save();
    updateLocks();
    updateStats();
}

function rememberUncovered(words) {
    for (const word of words) {
        uncovered.add(wordKeys.get(word));
    }
    redactionChanged();
}

// One function per checkbox item that locks or unlocks its box (see setupCheckItem).
const locks = [];
function updateLocks() {
    locks.forEach((update) => update());
}

// --- redaction stats ---------------------------------------------------------

// Redacted words per block, by the hash in their word keys. Covers every block
// on the page once `pendingGroups` reaches 0.
const blockCounts = new Map();
let pendingGroups = 0;

// The sidebar's numbers. Progress counts only what the reader uncovered by
// guessing or checking boxes, not "Reveal all".
function updateStats() {
    const stats = document.querySelector('.redact-stats');
    const show = (name, value) => {
        stats.querySelector(`[data-stat="${name}"]`).textContent = value;
    };
    const { tries, correct } = redaction;
    show('tries', tries);
    show('correct', tries ? `${correct} (${Math.round((correct / tries) * 100)}%)` : '0');

    if (pendingGroups > 0) {
        return;
    }
    let total = 0;
    for (const count of blockCounts.values()) {
        total += count;
    }
    // Saved keys whose paragraph has since been edited no longer count.
    let found = 0;
    for (const key of uncovered) {
        const [hash, i] = key.split(':');
        if (Number(i) < (blockCounts.get(hash) ?? 0)) {
            found++;
        }
    }
    const share = total ? found / total : 0;
    show('left', (total - found).toLocaleString());
    show('progress', `${(share * 100).toFixed(1)}%`);
    gsap.to('.redact-meter-fill', { scaleX: share, duration: REDACT.duration, ease: REDACT.ease });
}

// The sidebar controls act on the redacted words of every section. Returns a
// function that registers words as they are wrapped.
function setupRedactControls() {
    const words = [];
    const controls = document.querySelector('[data-controls="redaction"]');
    const button = controls.querySelector('.redact-toggle');

    const showRevealed = () => {
        button.textContent = redaction.revealed ? 'Redact all' : 'Reveal all';
        button.setAttribute('aria-pressed', redaction.revealed);
    };
    showRevealed();

    // The button stays hidden until the reader has made REDACT.revealAfter guesses.
    const showButton = (animate) => {
        if (!button.hidden) {
            return;
        }
        button.hidden = false;
        if (animate) {
            gsap.from(button, { opacity: 0, y: 6, duration: REDACT.duration * 2, ease: REDACT.ease });
        }
    };
    if (redaction.tries >= REDACT.revealAfter || redaction.revealed) {
        showButton(false);
    }

    button.addEventListener('click', () => {
        redaction.revealed = !redaction.revealed;
        // "Redact all" covers everything again, so forget what was uncovered.
        if (!redaction.revealed) {
            uncovered.clear();
        }
        redactionChanged();
        showRevealed();

        gsap.to(words, {
            '--bar-opacity': redaction.revealed ? 0 : 1,
            duration: REDACT.duration,
            ease: REDACT.ease,
            stagger: { each: REDACT.stagger, from: REDACT.order },
            overwrite: true // clicking mid-fade reverses from wherever it is
        });
    });

    // Typing a redacted word reveals every occurrence plus its neighbours.
    // Case-folds and reduces to a root ("Scams" -> "scam", "attacked" -> "attack")
    // so singular/plural and verb forms of a word count as the same guess.
    // Cached: the checklists repeat the same few hundred words thousands of times.
    const roots = new Map();
    const normalize = (text) => {
        if (!roots.has(text)) {
            const doc = nlp(text).compute('root');
            const term = doc.json()[0]?.terms[0];
            const key = term?.root ?? term?.normal ?? text;
            roots.set(text, key.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''));
        }
        return roots.get(text);
    };
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
        words.forEach((word, i) => {
            // Guessing a word that is already uncovered does nothing.
            if (normalize(word.textContent) !== key || isUncovered(word)) {
                return;
            }
            for (let j = i - REDACT.context; j <= i + REDACT.context; j++) {
                if (words[j]) {
                    hits.add(words[j]);
                }
            }
        });
        redaction.tries++;
        if (hits.size > 0) {
            redaction.correct++;
        }
        rememberUncovered(hits);
        if (redaction.tries >= REDACT.revealAfter) {
            showButton(true);
        }

        gsap.to([...hits], {
            '--bar-opacity': 0,
            duration: REDACT.duration,
            ease: REDACT.ease,
            stagger: { each: REDACT.stagger, from: 'start' },
            overwrite: 'auto'
        });
    });

    // Kept in reading order, so a guess uncovers the words that sit around it.
    // Each batch is one contiguous stretch of the page, so it is spliced in
    // whole where its first word belongs. New words start out the way the
    // reader left them.
    return (added) => {
        if (added.length === 0) {
            return;
        }
        keyWords(added);
        gsap.set(added.filter(isUncovered), { '--bar-opacity': 0 });

        let lo = 0;
        let hi = words.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (words[mid].compareDocumentPosition(added[0]) & Node.DOCUMENT_POSITION_FOLLOWING) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        words.splice(lo, 0, ...added);
        updateLocks();
        updateStats();
    };
}

// --- checkbox items ----------------------------------------------------------

// A redacted checklist line. Checking the box lifts each word's bar and draws
// cipher glyphs over the text; unchecking fades the glyphs back off but leaves
// the words unredacted.
function setupCheckItem(item) {
    const box = item.querySelector('input[type="checkbox"]');
    const words = wrapWords(item, 'redact');
    setCipherVars(item);
    item.classList.add('cipher-check');

    // Words are split into chars only once the box is first checked: most never
    // are, and splitting every item up front slows the page load. Chars start
    // with their glyph hidden (see style.css); the bar covers the plain text meanwhile.
    let chars = null;
    const split = () => {
        chars ??= words.flatMap((word) => splitIntoChars(word));
        return chars;
    };
    const cipher = cipherSweeper();

    // A box restored as checked (see checklist.js) starts out swept, with no animation.
    if (box.checked) {
        cipher.run(split(), { animate: false });
        gsap.set(words, { '--bar-opacity': 0 });
    }

    // The box stays locked until the reader has uncovered enough of the line to
    // know what it asks. A checked box can always be unchecked.
    const length = (list) => list.reduce((n, word) => n + word.textContent.length, 0);
    const total = length(words);
    const updateLock = () => {
        const locked = !box.checked && length(words.filter(isUncovered)) < total * REDACT.unlockShare;
        box.disabled = locked;
        box.title = locked ? `Uncover at least ${Math.round(REDACT.unlockShare * 100)}% of this step to check it off` : '';
        item.classList.toggle('locked', locked);
    };
    locks.push(updateLock);

    box.addEventListener('change', () => {
        const on = box.checked;
        const sweep = cipher.run(split(), { on });
        if (!on) {
            updateLock();
            return;
        }
        // The bars lift as the glyphs come in. Unchecking never puts a bar back.
        rememberUncovered(words);
        sweep.to(words, { '--bar-opacity': 0, duration: 0.1, ease: 'none' }, 0);
    });
    return words;
}

// --- form fields -------------------------------------------------------------

// A text field can't hold per-character spans, so each .cipher-field gets an
// overlay that redraws its value as cipher characters in the same monospace
// layout. Leaving the field sweeps the text into glyphs like a checked item;
// focusing it hides the overlay so the reader edits the real text.
function setupFieldCipher(wrapper) {
    const field = wrapper.querySelector('input, textarea');
    const overlay = document.createElement('span');
    overlay.className = 'cipher-field-overlay cipher-check';
    overlay.setAttribute('aria-hidden', 'true');
    setCipherVars(overlay);
    wrapper.append(overlay);
    const cipher = cipherSweeper();

    const clear = () => {
        cipher.stop();
        overlay.textContent = '';
        wrapper.classList.remove('enciphered');
    };

    const encipher = (animate) => {
        clear();
        if (!field.value) {
            return;
        }
        // The overlay is drawn from the top-left, so the field must be too.
        field.scrollTop = 0;
        field.scrollLeft = 0;
        overlay.textContent = field.value;
        const chars = splitIntoChars(overlay).filter((c) => {
            if (/\S/.test(c.textContent)) {
                return true;
            }
            delete c.dataset.glyph; // spaces and line breaks stay blank
            return false;
        });
        wrapper.classList.add('enciphered');
        cipher.run(chars, { animate, stagger: REDACT.fieldStagger });
    };

    field.addEventListener('focus', clear);
    field.addEventListener('blur', () => encipher(true));
    // Autofill can change a field the reader isn't in.
    field.addEventListener('change', () => {
        if (document.activeElement !== field) {
            encipher(true);
        }
    });
    field.form?.addEventListener('reset', clear);
    encipher(false); // values restored by checklist.js start out enciphered
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

    const tick = (time) => {
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
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
}

// Fades cipher glyphs in over a run of chars (or back out), optionally sweeping
// from first to last, then keeps them changing. Checkbox items and form fields
// each keep one, so a new run cancels the one before.
function cipherSweeper() {
    let sweep = null;
    let stopCipher = null;
    const stop = () => {
        sweep?.kill();
        sweep = null;
        stopCipher?.();
        stopCipher = null;
    };
    const start = (chars) => {
        stopCipher = animateCipher(chars);
    };

    // Returns the sweep's timeline, for callers to add to, or null without
    // `animate`. `stagger` is the time between one char and the next (s).
    const run = (chars, { on = true, animate = true, stagger = 0 } = {}) => {
        stop();
        const end = { '--glyph-opacity': on ? 1 : 0, '--plain-opacity': on ? 0 : 1 };
        if (!animate) {
            gsap.set(chars, end);
            if (on) {
                start(chars);
            }
            return null;
        }
        sweep = gsap.timeline().to(chars, {
            ...end,
            duration: 0.1,
            ease: 'none',
            stagger: { each: stagger, from: on ? 'start' : 'end' }
        }, 0);
        if (on) {
            sweep.call(() => start(chars));
        }
        return sweep;
    };
    return { run, stop };
}

// Hides something CIPHER.hoverLinger after the pointer leaves it, so it stays
// readable for a moment; cancel() when the pointer comes back in time.
export function linger(hide) {
    let pending = null;
    return {
        cancel() {
            pending?.kill();
            pending = null;
        },
        leave() {
            pending ??= gsap.delayedCall(CIPHER.hoverLinger, () => {
                pending = null;
                hide();
            });
        }
    };
}

// Hovering one of `chars` unmasks it and its neighbours (CIPHER.hoverRadius); a
// character the pointer moves off stays unmasked for a moment. Returns a
// function that cancels any re-masking still pending.
export function hoverUnmask(container, chars) {
    const remask = chars.map((c) => linger(() => c.classList.remove('unmasked')));
    const unmask = (center) => {
        chars.forEach((c, i) => {
            if (Math.abs(i - center) <= CIPHER.hoverRadius) {
                remask[i].cancel();
                c.classList.add('unmasked');
            } else if (c.classList.contains('unmasked')) {
                remask[i].leave();
            }
        });
    };
    container.addEventListener('mouseover', (event) => {
        const i = chars.indexOf(event.target);
        if (i !== -1) {
            unmask(i);
        }
    });
    container.addEventListener('mouseleave', () => unmask(Infinity));
    return () => remask.forEach((r) => r.cancel());
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

        hoverUnmask(heading, own);
    }
    animateCipher(chars);
}

// --- init --------------------------------------------------------------------

setupChecklists();

const addRedactedWords = setupRedactControls();
for (const section of document.querySelectorAll('[data-effect]')) {
    if (section.dataset.effect === 'redact') {
        setupRedact(section, addRedactedWords);
    } else {
        setupCipher(section);
    }
}

document.querySelectorAll('.cipher-field').forEach(setupFieldCipher);

setupHeadings();

document.documentElement.classList.remove('effects-pending');
