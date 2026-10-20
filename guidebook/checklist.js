import { LISTS, sitesOf } from './guide.js';
import { mailtoHref } from './removals.js';

// Each list renders into the element whose `data-removals` names it. A list holds
// sites ({ id, name, how }) and/or collapsible groups ({ id, title, note, sites }).

// Everything the reader fills in lives under one localStorage key, so it survives
// a refresh. It stays in this browser only.
const STORAGE_KEY = 'masks-guide:v1';

const empty = () => ({
    checked: {},
    notes: {},
    open: {},
    details: {},
    redaction: { revealed: false, words: [], tries: 0, correct: 0 }
});

function load() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
        // Merged one level down, so fields added later get their defaults.
        return Object.fromEntries(Object.entries(empty()).map(([key, value]) => [key, { ...value, ...saved[key] }]));
    } catch {
        return empty();
    }
}

const state = load();

// What the reader has uncovered of the redacted text, put back by app.js on load:
// whether "Reveal all" is on, the keys of words uncovered by a guess or a
// checked box, and how many guesses were made and how many hit. Call save()
// after changing it.
export const redaction = state.redaction;

export function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Private mode or blocked storage: the page still works, it just won't remember.
    }
}

// --- rendering ---------------------------------------------------------------

// One site: a redacted .check-item (wired up by app.js) plus a notes drawer.
function renderSite({ id, name, how }) {
    const item = document.createElement('div');
    item.className = 'removal';
    item.innerHTML = `
        <label class="check-item">
            <input type="checkbox" data-id="${id}">
            <span><strong>${name}</strong>: ${how}</span>
        </label>
        <details class="removal-notes">
            <summary>notes</summary>
            <div class="removal-fields">
                <label>Requested on <input type="date"></label>
                <textarea rows="3" placeholder="Their response, a confirmation number, when to recheck…"></textarea>
            </div>
        </details>`;

    const summary = item.querySelector('summary');
    const date = item.querySelector('input[type="date"]');
    const text = item.querySelector('textarea');
    text.setAttribute('aria-label', `Notes for ${name}`);

    const saved = state.notes[id] ?? {};
    date.value = saved.date ?? '';
    text.value = saved.text ?? '';

    const showSummary = () => {
        const parts = ['notes'];
        if (date.value) {
            parts.push(`requested ${date.value}`);
        } else if (text.value.trim()) {
            parts.push('saved');
        }
        summary.textContent = parts.join(' · ');
    };
    showSummary();

    const onInput = () => {
        if (date.value || text.value.trim()) {
            state.notes[id] = { date: date.value, text: text.value };
        } else {
            delete state.notes[id];
        }
        save();
        showSummary();
    };
    date.addEventListener('input', onInput);
    text.addEventListener('input', onInput);
    return item;
}

function renderGroup(group) {
    const details = document.createElement('details');
    details.className = 'removal-group';
    details.open = Boolean(state.open[group.id]);
    details.innerHTML = `
        <summary><h3>${group.title}</h3><span class="removal-count" data-count="${group.id}"></span></summary>
        ${group.note ? `<p>${group.note}</p>` : ''}`;
    details.append(...group.sites.map(renderSite));
    details.addEventListener('toggle', () => {
        state.open[group.id] = details.open;
        save();
    });
    return details;
}

// --- progress ----------------------------------------------------------------

// Sites by list key and by group id, for `data-count` tallies.
const sitesByKey = new Map();
for (const [key, items] of Object.entries(LISTS)) {
    sitesByKey.set(key, sitesOf(items));
    for (const group of items.filter((item) => item.sites)) {
        sitesByKey.set(group.id, group.sites);
    }
}

// `data-count` holds one or more space-separated keys, so one tally can span
// several lists.
function updateCounts() {
    for (const el of document.querySelectorAll('[data-count]')) {
        const ids = new Set(el.dataset.count.split(' ').flatMap((key) => (sitesByKey.get(key) ?? []).map((s) => s.id)));
        const done = [...ids].filter((id) => state.checked[id]).length;
        el.textContent = `${done} / ${ids.size}`;
    }
}

// --- removal email details ---------------------------------------------------

// Writes the reader's details into every removal email link on the page.
function updateEmailLinks() {
    for (const a of document.querySelectorAll('a[data-to]')) {
        a.href = mailtoHref(a.dataset.to, a.dataset.subject, state.details);
    }
}

function setupDetailsForm() {
    const form = document.querySelector('.removal-details');
    if (!form) {
        return;
    }
    const fields = [...form.querySelectorAll('[name]')];
    for (const field of fields) {
        field.value = state.details[field.name] ?? '';
    }

    // Enter in a field would otherwise submit the form and reload the page.
    form.addEventListener('submit', (event) => event.preventDefault());
    form.addEventListener('input', () => {
        state.details = Object.fromEntries(fields.filter((f) => f.value.trim()).map((f) => [f.name, f.value]));
        save();
        updateEmailLinks();
    });
    form.querySelector('.removal-details-forget').addEventListener('click', () => {
        form.reset();
        form.dispatchEvent(new Event('input'));
    });
    updateEmailLinks();
}

// --- init --------------------------------------------------------------------

// Builds the lists and restores every saved checkbox. Must run before app.js
// wraps words, so the new items get redacted and a checked box starts out
// enciphered.
export function setupChecklists() {
    for (const container of document.querySelectorAll('[data-removals]')) {
        const items = LISTS[container.dataset.removals] ?? [];
        container.append(...items.map((item) => (item.sites ? renderGroup(item) : renderSite(item))));
    }

    for (const box of document.querySelectorAll('input[type="checkbox"][data-id]')) {
        const id = box.dataset.id;
        box.checked = Boolean(state.checked[id]);
        box.addEventListener('change', () => {
            if (box.checked) {
                state.checked[id] = true;
            } else {
                delete state.checked[id];
            }
            save();
            updateCounts();
        });
    }
    updateCounts();
    setupDetailsForm();
}
