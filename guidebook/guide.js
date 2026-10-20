// The order the page walks through both opt-out lists, most important first.
// A broker that is in both lists appears once, with BADBOOL's newer steps.
// Keys match the `data-removals` containers in index.html.

import * as workbook from './removals.js';
import * as badbool from './badbool.js';
import * as steps from './steps.js';

const byId = (groups) => Object.fromEntries(groups.map((g) => [g.id, g]));
const wb = byId(workbook.GROUPS);
const bb = byId(badbool.GROUPS);

// The sites in a list, with groups flattened out.
export const sitesOf = (items) => items.flatMap((item) => item.sites ?? [item]);

// Later sources win, so BADBOOL replaces the workbook's text for shared brokers.
const latest = new Map(
    sitesOf([
        ...workbook.PRIORITY, ...workbook.GROUPS,
        ...badbool.CRUCIAL, ...badbool.HIGH, ...badbool.GROUPS, ...badbool.SEARCH, ...badbool.CREDIT, ...badbool.MARKETING
    ]).map((s) => [s.id, s])
);

// Each broker lands in the first list that claims it; later lists skip it.
const placed = new Set();
const claim = (sites) => sites
    .map((s) => latest.get(s.id))
    .filter((s) => !placed.has(s.id) && placed.add(s.id));
const alphabetical = (sites) => [...sites].sort((a, b) => a.name.localeCompare(b.name));

// --- step one: the biggest brokers -------------------------------------------

const BIGGEST = alphabetical(claim([...workbook.PRIORITY, ...badbool.CRUCIAL, ...badbool.HIGH.filter((s) => s.id === 'acxiom')]));
const HIGH = claim(badbool.HIGH);

// --- step two: freezes & opt-outs --------------------------------------------

const CREDIT = claim(badbool.CREDIT);
const SEARCH = claim(badbool.SEARCH);
const FACES = claim(bb['badbool-faces'].sites);
const MARKETING = claim(badbool.MARKETING);
const SPECIAL = claim(bb['badbool-special'].sites);

// --- optional: every other broker --------------------------------------------

const pick = (group, ...ids) => group.sites.filter((s) => ids.includes(s.id));

// A workbook category plus whatever BADBOOL adds to it.
const category = (group, ...extra) => ({
    ...group,
    sites: alphabetical(claim([...group.sites, ...extra]))
});

// Built before people-search, which would otherwise claim BADBOOL's phone books.
const PHONE = category(wb.phone);

const REST = [
    { ...wb.shared, sites: claim(wb.shared.sites) },
    category(wb['people-search'], ...bb['badbool-people'].sites),
    PHONE,
    category(wb.genealogy, ...pick(bb['badbool-records'], 'archives', 'classmates', 'familysearch')),
    category(wb.records, ...pick(bb['badbool-records'], 'propertyrecs', 'voter-records')),
    category(wb.professional, ...pick(bb['badbool-records'], 'zoominfo')),
    category(wb.investigative),
    category(wb.marketing)
];

export const LISTS = {
    'start-biggest': BIGGEST,
    'start-high': HIGH,
    'protect-credit': CREDIT,
    'protect-tax': steps.TAX,
    'protect-search': SEARCH,
    'protect-faces': FACES,
    'protect-marketing': MARKETING,
    'protect-special': SPECIAL,
    'mask-browser': steps.BROWSER,
    'mask-payments': steps.PAYMENTS,
    'mask-files': steps.FILES,
    rest: REST
};

// Every broker from both sources should land somewhere exactly once.
const missing = [...latest.keys()].filter((id) => !placed.has(id));
if (missing.length) {
    console.warn('guide.js: brokers not placed in any list:', missing);
}
