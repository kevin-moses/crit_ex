// Steps beyond the two broker lists, in the same shape as a broker ({ id, name, how })
// so checklist.js renders them the same way. `how` is trusted HTML.

import { link, site } from './removals.js';

export const TAX = [
    site('IRS Identity Protection PIN', `${link('https://www.irs.gov/identity-theft-fraud-scams/get-an-identity-protection-pin', 'Get an IP PIN')} through your IRS online account. It is a six-digit number that stops anyone else from filing a tax return with your Social Security number. It changes every year, so look up the new one in your account before you file. Can’t verify online? Use Form 15227 or visit a Taxpayer Assistance Center. You can get one for your dependents too.`, 'irs-ip-pin')
];

export const BROWSER = [
    site('Cover Your Tracks', `Test your browser at the EFF’s ${link('https://coveryourtracks.eff.org/', 'Cover Your Tracks')}. It shows what trackers can see and whether your browser’s fingerprint is unique enough to follow you between sites. Run it again after the next step to see the difference.`),
    site('AdNauseam', `Install ${link('https://adnauseam.io/', 'AdNauseam')}. It blocks ads (it is built on uBlock Origin) and quietly clicks every ad it blocks, so the profile ad networks keep on you fills with noise. Use it instead of another ad blocker, not alongside one. It is easiest on Firefox; Google bans it from the Chrome Web Store, so Chrome needs a manual install.`)
];

export const PAYMENTS = [
    site('Payment masking', `Pay online with a masked card number, so a merchant’s data breach never leaks your real card. Choose one of the ${link('https://www.privacyguides.org/en/financial-services/#payment-masking-services', 'services Privacy Guides lists')}: Privacy.com (free plan, up to 12 cards a month) or MySudo (paid; cards in the iOS app, plus masked phone numbers and email addresses). Both are US only and need your ID. Check first whether your own bank already offers virtual card numbers.`, 'payment-masking')
];

export const FILES = [
    site('Photo & file metadata', `Photos and documents carry hidden metadata, such as where a photo was taken (EXIF location), the device that took it, and the author’s name. Strip it before you share or post a file. ${link('https://github.com/jvoisin/mat2#readme', 'mat2')} cleans images, PDFs, office documents, audio and video from the command line, and writes a cleaned copy beside the original. ${link('https://metadatacleaner.gitlab.io/metadatacleaner/', 'Metadata Cleaner')} is a desktop app built on mat2. Neither can promise every field is gone from complex formats. On an iPhone, tap Options in the share sheet and turn off Location before sending a photo.`, 'metadata-removal')
];
