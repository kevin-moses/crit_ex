import { gsap } from 'gsap';
import { CIPHER, REDACT, randomGlyph, hoverUnmask } from './app.js';

// An introductory modal that shows, with small looping GSAP demos, how the
// page's effects work. It opens on a first visit and again from the sidebar.
// Each step's demo is built into `.wt-stage` from the same classes style.css
// uses for the real effects, so the demos look like the page.

const SEEN_KEY = 'masks-guide:walkthrough-seen';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- small DOM helpers -------------------------------------------------------

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

// Appends one .cipher-char per character of `text` to `parent` and records them
// in `chars`, exactly as app.js does for the page.
function addChars(parent, text, chars) {
    for (const c of text) {
        const span = el('span', 'cipher-char', c);
        span.dataset.glyph = randomGlyph();
        parent.append(span);
        chars.push(span);
    }
}

// A word reduced to lowercase letters and digits, for comparing guesses.
const bare = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// A paragraph of words; the ones in `redacted` (lowercase) get a bar. Returns
// the paragraph and its redacted word spans.
function redactedText(text, redacted) {
    const p = el('p', 'wt-text');
    const bars = [];
    for (const part of text.split(/(\s+)/)) {
        if (redacted.includes(bare(part))) {
            const word = el('span', 'redact', part);
            bars.push(word);
            p.append(word);
        } else {
            p.append(part);
        }
    }
    return { p, bars };
}

// Cycles the glyphs of `chars` like animateCipher in app.js, minus the fade:
// that one overwrites every other tween on a char, which would cancel the
// check demo's sweep.
function cycleGlyphs(chars, add) {
    if (reduceMotion) {
        return;
    }
    const next = chars.map(() => gsap.ticker.time + Math.random() * CIPHER.interval);
    const tick = (time) => {
        chars.forEach((c, i) => {
            if (time < next[i]) {
                return;
            }
            c.dataset.glyph = randomGlyph();
            next[i] = time + CIPHER.interval * (1 + (Math.random() * 2 - 1) * CIPHER.jitter);
        });
    };
    gsap.ticker.add(tick);
    add(() => gsap.ticker.remove(tick));
}

const pause = (seconds) => ({ duration: seconds });

// Sets a demo's status line; `hint` makes it pulse to draw the eye.
function say(status, text, hint = false) {
    status.textContent = text;
    status.classList.toggle('wt-hint', hint);
}

// --- demos -------------------------------------------------------------------
// Each takes the stage and an `add(fn)` that registers cleanup. A demo that
// animates on its own returns its timeline.

function demoIntro(stage, add) {
    const chars = [];
    const h = el('div', 'wt-heading cipher-heading');
    addChars(h, 'Masks for Our Digital Lives', chars);
    stage.append(h);
    cycleGlyphs(chars, add);

    const { p, bars } = redactedText('Most likely your information has already been leaked.', ['most', 'likely', 'information', 'already', 'leaked']);
    const second = redactedText('Data brokers collect your name, address history and phone numbers.', ['data', 'brokers', 'collect', 'name', 'address', 'history', 'phone', 'numbers']);
    stage.append(p, second.p);
    const all = [...bars, ...second.bars];

    return gsap.timeline({ repeat: -1, repeatDelay: 1.2 })
        .set(all, { '--bar-opacity': 0 })
        .to({}, pause(0.8))
        .to(all, { '--bar-opacity': 1, duration: 0.5, ease: 'power2.out', stagger: 0.07 })
        .to({}, pause(3));
}

// Steps 2-4 are interactive: the reader does the thing, and a status line answers.

function demoHover(stage, add) {
    const chars = [];
    const h = el('div', 'wt-heading cipher-heading');
    // Words in their own spans so the heading wraps between them, as on the page.
    for (const [i, word] of ['Data', 'Leakage'].entries()) {
        const span = el('span');
        addChars(span, word, chars);
        h.append(span, i === 0 ? ' ' : '');
    }
    const status = el('div', 'wt-status');
    say(status, 'Hover over the heading.', true);
    stage.append(h, status);
    cycleGlyphs(chars, add);

    add(hoverUnmask(h, chars));
    h.addEventListener('mouseover', () => say(status, 'Move away and it scrambles again.'));
}

function demoGuess(stage, add) {
    const { p, bars } = redactedText(
        'Data brokers collect your name, address history and phone numbers, then sell them.',
        ['data', 'brokers', 'collect', 'name', 'address', 'history', 'phone', 'numbers', 'sell']
    );
    const input = el('input', 'redact-guess');
    input.placeholder = 'Type a redacted word…';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Guess a redacted word');
    const status = el('div', 'wt-status');
    const GUESS_HINT = 'Hint: type address and press Enter.';
    say(status, GUESS_HINT, true);
    const again = el('button', 'wt-again', 'Try again');
    again.type = 'button';
    again.hidden = true;
    stage.append(p, input, status, again);

    input.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') {
            return;
        }
        const key = bare(input.value);
        input.value = ''; // Enter always empties the box, hit or miss
        if (!key) {
            return;
        }
        const hits = new Set();
        bars.forEach((word, i) => {
            if (bare(word.textContent) !== key) {
                return;
            }
            for (let j = i - REDACT.context; j <= i + REDACT.context; j++) {
                if (bars[j]) {
                    hits.add(bars[j]);
                }
            }
        });
        if (hits.size === 0) {
            say(status, 'No match. Try address.');
            gsap.fromTo(input, { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
            return;
        }
        say(status, 'Match! The word and its neighbours are uncovered.');
        again.hidden = false;
        gsap.to([...hits], { '--bar-opacity': 0, duration: 0.6, ease: 'power2.out', stagger: 0.06, overwrite: 'auto' });
    });
    again.addEventListener('click', () => {
        gsap.to(bars, { '--bar-opacity': 1, duration: 0.4, overwrite: 'auto' });
        say(status, GUESS_HINT, true);
        again.hidden = true;
        input.focus();
    });
    input.focus({ preventScroll: true });
}

function demoCheck(stage, add) {
    const chars = [];
    const bars = [];
    const line = el('label', 'check-item cipher-check');
    const box = el('input');
    box.type = 'checkbox';
    box.disabled = true;
    line.classList.add('locked');
    const label = el('span');
    for (const part of 'Consider using a password manager, and never store passwords in plaintext.'.split(/(\s+)/)) {
        if (/^\s*$/.test(part)) {
            label.append(part);
            continue;
        }
        const word = el('span', 'redact');
        addChars(word, part, chars);
        label.append(word);
        bars.push(word);
    }
    line.append(box, label);
    const status = el('div', 'wt-status', 'Locked until two thirds of the line are uncovered…');
    stage.append(line, status);
    cycleGlyphs(chars, add);

    box.addEventListener('change', () => {
        const on = box.checked;
        gsap.to(chars, {
            '--glyph-opacity': on ? 1 : 0,
            '--plain-opacity': on ? 0 : 1,
            duration: 0.1,
            ease: 'none',
            stagger: { each: 0.02, from: on ? 'start' : 'end' },
            overwrite: true
        });
        if (on) {
            gsap.to(bars, { '--bar-opacity': 0, duration: 0.1, ease: 'none' });
        }
        say(status, on ? 'Checked. The line turns to cipher. Click again to uncheck.' : 'Unchecked. The words stay uncovered.');
    });

    // The page locks the box until two thirds of the line (by characters) are
    // uncovered; here the first eight words are uncovered for you, then the box unlocks.
    return gsap.timeline()
        .to({}, pause(0.8))
        .to(bars.slice(0, 8), { '--bar-opacity': 0, duration: 0.5, stagger: 0.12 })
        .call(() => {
            box.disabled = false;
            line.classList.remove('locked');
            say(status, 'Unlocked. Click the checkbox.', true);
        });
}

function demoProgress(stage) {
    const panel = el('div', 'wt-panel');
    panel.innerHTML = `
        <div class="sidebar-label">Redaction</div>
        <dl class="redact-stats">
            <div><dt>Guesses</dt><dd data-v="tries">0</dd></div>
            <div><dt>Uncovered</dt><dd data-v="share">0.0%</dd></div>
        </dl>
        <div class="redact-meter"><div class="redact-meter-fill"></div></div>
        <button type="button" class="redact-toggle" tabindex="-1">Reveal all</button>`;
    stage.append(panel);
    const tries = panel.querySelector('[data-v="tries"]');
    const share = panel.querySelector('[data-v="share"]');
    const fill = panel.querySelector('.redact-meter-fill');
    const button = panel.querySelector('.redact-toggle');

    const v = { tries: 0, share: 0 };
    const draw = () => {
        tries.textContent = Math.round(v.tries);
        share.textContent = `${(v.share * 100).toFixed(1)}%`;
        gsap.set(fill, { scaleX: v.share });
    };
    return gsap.timeline({ repeat: -1, repeatDelay: 0.5, onRepeat: draw })
        .call(() => { v.tries = 0; v.share = 0; draw(); })
        .set(button, { opacity: 0, y: 6 })
        .to(v, { tries: 10, share: 0.38, duration: 3.2, ease: 'power1.inOut', onUpdate: draw })
        .to(button, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' })
        .to({}, pause(2.5));
}

// --- steps -------------------------------------------------------------------

const STEPS = [
    {
        title: 'Welcome',
        body: 'This guide hides itself. Its contents are enciphered and redacted, and it\'s up to you to uncover it.',
        demo: demoIntro
    },
    {
        title: 'Hover to decrypt',
        body: 'Titles are scrambled. Move your pointer over the heading below to decipher it.',
        demo: demoHover
    },
    {
        title: 'Type a word to uncover it',
        body: 'Most of this guide is redacted. Type a hidden word into the redaction box in the sidebar and press Enter. Every copy of that word clears, along with some words around it. Wrong guesses just count as tries.',
        demo: demoGuess
    },
    {
        title: 'Check off your steps',
        body: 'Each removal step is a checklist item. Its box stays locked until you have uncovered two thirds of the line, so you read it first. Once it unlocks and you\'ve completed the step, check it off.',
        demo: demoCheck
    },
    {
        title: 'Your progress is saved',
        body: 'The sidebar tracks how much you have uncovered. After ten guesses a “Reveal all” button appears. Everything is saved in this browser only.',
        demo: demoProgress
    }
];

// --- modal -------------------------------------------------------------------

let backdrop = null;
let ui = null; // the dialog's parts, looked up once in build()
let index = 0;
let timeline = null;
let cleanups = [];
let opener = null;

function build() {
    backdrop = el('div', 'wt-backdrop');
    backdrop.hidden = true;
    backdrop.innerHTML = `
        <div class="wt-modal" role="dialog" aria-modal="true" aria-labelledby="wt-title">
            <button type="button" class="wt-close" aria-label="Close walkthrough">×</button>
            <div class="wt-count"></div>
            <h2 class="wt-title" id="wt-title"></h2>
            <p class="wt-body"></p>
            <div class="wt-stage" aria-hidden="true"></div>
            <div class="wt-footer">
                <div class="wt-dots"></div>
                <div class="wt-nav">
                    <button type="button" class="wt-back">Back</button>
                    <button type="button" class="wt-next">Next</button>
                </div>
            </div>
        </div>`;
    document.body.append(backdrop);
    const q = (sel) => backdrop.querySelector(sel);
    ui = {
        count: q('.wt-count'),
        title: q('.wt-title'),
        body: q('.wt-body'),
        stage: q('.wt-stage'),
        back: q('.wt-back'),
        next: q('.wt-next'),
        modal: q('.wt-modal')
    };

    const dots = q('.wt-dots');
    STEPS.forEach((step, i) => {
        const dot = el('button', 'wt-dot');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Step ${i + 1}: ${step.title}`);
        dot.addEventListener('click', () => show(i));
        dots.append(dot);
    });

    q('.wt-close').addEventListener('click', close);
    ui.back.addEventListener('click', () => show(index - 1));
    ui.next.addEventListener('click', () => {
        if (index === STEPS.length - 1) {
            close();
        } else {
            show(index + 1);
        }
    });
    backdrop.addEventListener('mousedown', (event) => {
        if (event.target === backdrop) {
            close();
        }
    });
    backdrop.addEventListener('keydown', onKey);
}

function clearDemo() {
    timeline?.kill();
    timeline = null;
    cleanups.forEach((fn) => fn());
    cleanups = [];
}

function show(i) {
    index = Math.max(0, Math.min(STEPS.length - 1, i));
    const step = STEPS[index];
    const { stage } = ui;

    clearDemo();
    stage.replaceChildren();
    stage.style.setProperty('--cipher-color', CIPHER.color);
    stage.style.setProperty('--cipher-font', CIPHER.font);
    stage.style.setProperty('--cipher-size', CIPHER.size);
    stage.style.setProperty('--redact-color', REDACT.color);

    ui.count.textContent = `Step ${index + 1} of ${STEPS.length}`;
    ui.title.textContent = step.title;
    ui.body.textContent = step.body;
    ui.back.disabled = index === 0;
    ui.next.textContent = index === STEPS.length - 1 ? 'Start reading' : 'Next';
    backdrop.querySelectorAll('.wt-dot').forEach((dot, n) => {
        dot.classList.toggle('active', n === index);
        dot.setAttribute('aria-current', n === index ? 'step' : 'false');
    });

    if (!reduceMotion) {
        gsap.fromTo([ui.title, ui.body, stage],
            { opacity: 0, y: 8 },
            { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.06, overwrite: true });
    }
    timeline = step.demo(stage, (fn) => cleanups.push(fn));
    if (reduceMotion) {
        timeline?.progress(1).pause();
    }
}

function onKey(event) {
    if (event.target instanceof HTMLInputElement && event.key.startsWith('Arrow')) {
        return; // arrow keys belong to the guess box
    }
    if (event.key === 'Escape') {
        close();
    } else if (event.key === 'ArrowRight') {
        show(index + 1); // show() stays within the first and last step
    } else if (event.key === 'ArrowLeft') {
        show(index - 1);
    } else if (event.key === 'Tab') {
        // Keep focus inside the dialog.
        const focusable = [...backdrop.querySelectorAll('button:not(:disabled)')];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
}

export function openWalkthrough() {
    if (!backdrop) {
        build();
    }
    if (!backdrop.hidden) {
        return;
    }
    opener = document.activeElement;
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    show(0);
    ui.next.focus();
    if (!reduceMotion) {
        gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.25, overwrite: true });
        gsap.fromTo(ui.modal, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out', overwrite: true });
    }
}

function close() {
    try {
        localStorage.setItem(SEEN_KEY, '1');
    } catch {
        // Blocked storage: the walkthrough will simply show again next visit.
    }
    clearDemo();
    document.body.style.overflow = '';
    const done = () => {
        backdrop.hidden = true;
        opener?.focus?.();
    };
    if (reduceMotion) {
        done();
    } else {
        gsap.to(backdrop, { opacity: 0, duration: 0.2, overwrite: true, onComplete: done });
    }
}

// --- init --------------------------------------------------------------------

document.querySelector('.walkthrough-open')?.addEventListener('click', openWalkthrough);

let seen = false;
try {
    seen = Boolean(localStorage.getItem(SEEN_KEY));
} catch {
    // Treated as unseen.
}
if (!seen) {
    // After the page's own reveal has played.
    gsap.delayedCall(0.6, openWalkthrough);
}
