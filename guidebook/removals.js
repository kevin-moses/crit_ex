// Data broker opt-outs, from the IntelTechniques Personal Data Removal Workbook
// (https://inteltechniques.com/data/workbook.pdf). `how` is trusted HTML.

export const link = (href, text) =>
    `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;

// The workbook's fallback message, prefilled into every email link. With no
// details it leaves blanks to fill in; once the reader saves some, it carries
// them and drops the phone and email lines they left empty.
function emailBody({ name, address, phone, email } = {}) {
    const filled = [name, address, phone, email].some((v) => v?.trim());
    const line = (label, value, blank) => (value?.trim() ? `${label}: ${value.trim()}` : blank);
    return [
        'I have been unsuccessful in removing my personal information from your website. Per the information provided from your legal privacy policy, please remove the following details from your service.',
        '',
        line('Full name', name, 'Full Name (as it appears on your service):'),
        line('Physical address', address, 'Physical Address (as it appears on your service):'),
        line('Telephone number', phone, filled ? null : 'Telephone Number (only if it appears on your service):'),
        line('Email address', email, filled ? null : 'Email Address (only if it appears on your service):')
    ].filter((l) => l !== null).join('\n');
}

export const mailtoHref = (address, subject, details) =>
    `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody(details))}`;

// checklist.js rebuilds the href from data-to/data-subject when details change.
export const mail = (address, subject = 'Personal information removal request') =>
    `<a href="${mailtoHref(address, subject)}" data-to="${address}" data-subject="${subject}">${address}</a>`;

const form = (url, extra) =>
    `Submit the ${link(url, 'opt-out form')}.${extra ? ` ${extra}` : ''}`;

const email = (addresses, extra, subject) =>
    `Email ${[addresses].flat().map((a) => mail(a, subject)).join(' and ')} asking them to remove your listing.${extra ? ` ${extra}` : ''}`;

const contact = (url, extra) =>
    `Request removal through their ${link(url, 'contact page')}.${extra ? ` ${extra}` : ''}`;

// Epsilon wants "Removal" as the subject with your name and address in the body.
const epsilon = (address) =>
    email(address, 'Use “Removal” as the subject and include your name and address.', 'Removal');

// `id` keys the saved checkbox and notes. A broker in both source lists has the
// same id in each, which is how guide.js merges them.
export const site = (name, how, id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) =>
    ({ id, name, how });

// --- step one ------------------------------------------------------------------

export const PRIORITY = [
    site('Spokeo', form('https://www.spokeo.com/optout', 'Paste the URL of your listing, then click the link in the verification email.')),
    site('Whitepages', form('https://www.whitepages.com/suppression-requests', 'Paste the URL of your listing; they call the number you give with a PIN to confirm.')),
    site('Intelius', form('https://www.intelius.com/opt-out', 'The same form removes you from Intelius-run sites such as Addresses.com and PeopleFinder.')),
    site('BeenVerified', form('https://www.beenverified.com/app/optout/search', 'Search for your listing and confirm by email.')),
    site('Acxiom', form('https://isapps.acxiom.com/optout/optout.aspx', 'Acxiom sells marketing profiles rather than public listings, so there is nothing to search for first.')),
    site('Infotracer', form('https://infotracer.com/optout', `If it fails, try the ${link('https://members.infotracer.com/removeMyData', 'alternate form')}.`)),
    site('LexisNexis', form('https://optout.lexisnexis.com', 'Covers Accurint, a database used by investigators. You can upload supporting documents.')),
    site('TruePeopleSearch', form('https://www.truepeoplesearch.com/removal', 'Find your record and confirm the removal.'))
];

// --- step two ------------------------------------------------------------------

export const GROUPS = [
    {
        id: 'shared',
        title: 'Shares an opt-out with Step One',
        note: 'These sites use a Step One opt-out. Check that you are no longer listed, and if you are, run the same opt-out again for this listing.',
        sites: [
            site('411', form('https://www.whitepages.com/suppression-requests', 'Whitepages handles it; they call with a PIN to confirm.')),
            site('Addresses', form('https://www.intelius.com/opt-out/submit/', 'Run by Intelius.')),
            site('Free Phone Tracer', form('https://www.beenverified.com/app/optout/search', 'Run by BeenVerified.')),
            site('Infospace', form('https://infospace.intelius.com/optout.php', 'Run by Intelius.')),
            site('Infotracer UK', form('https://infotracer.com/optout/', `UK entries also need an email through ${link('https://infotracer.com/help/', 'their help page')}.`)),
            site('Number Guru', form('https://www.beenverified.com/app/optout/search', 'Run by BeenVerified.')),
            site('Ownerly', form('https://www.beenverified.com/app/optout/search', 'Run by BeenVerified.')),
            site('People Finder', form('https://peoplefinder.com/optout.php', 'Run by Intelius; confirm by email.')),
            site('People Smart', form('https://www.peoplesmart.com/app/optout/search', 'Run by BeenVerified.')),
            site('Public Records Search', form('https://www.intelius.com/opt-out', 'Run by Intelius.')),
            site('Reverse Phone Lookup', form('https://www.intelius.com/opt-out', 'Run by Intelius.')),
            site('Selfie Systems', form('https://www.spokeo.com/optout', 'Run by Spokeo.')),
            site('State Records', form('https://infotracer.com/optout/', 'Run by Infotracer.')),
            site('Yellow Book', form('https://www.beenverified.com/app/optout/search', 'Run by BeenVerified.'))
        ]
    },
    {
        id: 'people-search',
        title: 'People-search & background checks',
        note: 'Sites that sell your name, address history, relatives and phone numbers. Search each for yourself first and skip any that don’t list you.',
        sites: [
            site('411 Info', form('https://411.info/manage/')),
            site('Absolute People Search', form('https://absolutepeoplesearch.com/public.php?funct=optout', 'Confirm by email.')),
            site('Address Search', form('https://addresssearch.com/remove-info.php')),
            site('Advanced Background Checks', form('https://www.advancedbackgroundchecks.com/opt-out', 'Confirm your email, then fill out the form it links to. They only promise to honor it in states with a privacy law.')),
            site('All People', `Open your profile on ${link('https://allpeople.com/', 'allpeople.com')}, click “Edit List”, then “Remove Listing”.`),
            site('Anywho', `Open your profile on ${link('https://anywho.com', 'anywho.com')} and choose “Remove Listing”.`),
            site('Background Alert', form('https://www.backgroundalert.com/optout/')),
            site('Background Checkers', form('https://www.backgroundcheckers.net/optOut/name/landing')),
            site('Check People', form('https://www.checkpeople.com/opt-out')),
            site('Check Secrets', form('https://www.checksecrets.com/optOut/name/landing')),
            site('CocoFinder', form('https://cocofinder.com/remove-my-info')),
            site('Cyber Background Checks', form('https://www.cyberbackgroundchecks.com/removal')),
            site('Fast People Search', form('https://www.fastpeoplesearch.com/removal')),
            site('Find People Search', form('https://findpeoplesearch.com/customerservice/')),
            site('Free Background Checks', email('privacy@infopay.com', 'Follow the instructions on the Infopay privacy policy.')),
            site('Free People Directory', form('https://www.freepeopledirectory.com/optout')),
            site('Glad I Know', form('https://gladiknow.com/opt-out')),
            site('GoLookup', form('https://golookup.com/support/optout')),
            site('Grey Pages', form('https://www.grey-pages.com/removal')),
            site('ID Crawl', form('https://www.idcrawl.com/opt-out')),
            site('ID True', form('https://www.idtrue.com/optout/')),
            site('Infopay', email('privacy@infopay.com')),
            site('Instant Checkmate', form('https://www.instantcheckmate.com/privacy-center/')),
            site('Locate Family', form('https://www.locatefamily.com/removal2.html')),
            site('MyLife', email('privacy@mylife.com', `California residents can use the ${link('https://www.mylife.com/ccpa/index.pubview', 'CCPA form')} instead.`)),
            site('Neighbor Report', form('https://neighbor.report/remove')),
            site('Nuwber', form('https://nuwber.com/removal/link')),
            site('Official USA', form('https://www.officialusa.com/opt-out')),
            site('Old Friends', `On ${link('https://old-friends.co/', 'old-friends.co')}, hover over your name to find the removal option.`),
            site('PeekYou', form('https://www.peekyou.com/about/contact/optout/')),
            site('People By Name', form('https://www.peoplebyname.com/remove.php')),
            site('People Finders', form('https://www.peoplefinders.com/opt-out#IT')),
            site('People Looker', form('https://www.peoplelooker.com/f/optout/search')),
            site('People-Search', `Use the removal link on your listing at ${link('https://www.people-search.org', 'people-search.org')}.`),
            site('People Search 123', form('https://www.peoplesearch123.com/optOut/name/landing')),
            site('People Search Expert', `Use the removal link on your result page at ${link('https://www.peoplesearchexpert.com', 'peoplesearchexpert.com')}.`),
            site('People Search Now', `Fill out the ${link('https://www.peoplesearchnow.com/opt-out', 'opt-out form')} and send it by postal mail to the address listed.`),
            site('People Searcher', form('https://www.peoplesearcher.com/optOut/name/landing')),
            site('People Trace UK', form('https://www.peopletraceuk.com/RequestRecordRemoval.asp')),
            site('People Whiz', form('https://www.peoplewhiz.com/remove-my-info', 'Confirm by email.')),
            site('Persopo', email('support@persopo.com', 'Also removes you from several of their subsidiaries.')),
            site('Pipl', form('https://pipl.com/personal-information-removal-request', 'Confirm by email.')),
            site('Private Records', form('https://www.privaterecords.net/optOut/name/landing')),
            site('Pro People Search', form('https://propeoplesearch.com/optout')),
            site('Public Data USA', form('https://publicdatausa.com/remove.php')),
            site('Public Info Services', form('https://www.publicinfoservices.com/help-center/remove-me-from-website')),
            site('Quick People Trace', email('clients@quickpeopletrace.com', 'Include your name and address and ask to be removed from all databases.')),
            site('Search Bug', form('https://www.searchbug.com/peoplefinder/how-to-remove.aspx')),
            site('Search People Free', form('https://www.searchpeoplefree.com/opt-out')),
            site('Search Quarry', form('https://members.searchquarry.com/removeMyData/')),
            site('Smart Background Checks', form('https://www.smartbackgroundchecks.com/optout')),
            site('Social Catfish', form('https://socialcatfish.com/opt-out/')),
            site('SpyFly', email('support@spyfly.com')),
            site('Spytox', form('https://www.spytox.com/opt_out')),
            site('That’s Them', form('https://thatsthem.com/optout')),
            site('TruePeopleSearch.net', email('support@truepeoplesearch.net')),
            site('Truth Finder', form('https://www.truthfinder.com/opt-out/')),
            site('UFind', email('support@ufind.name', 'Also removes you from several of their subsidiaries.')),
            site('Unmask', form('https://unmask.com/opt-out')),
            site('USA Official', form('https://usa-official.com/remove.php')),
            site('USA People Search', form('https://www.usa-people-search.com/manage/')),
            site('USA Trace', form('https://www.peoplefinders.com/opt-out#IT', 'Run by PeopleFinders.')),
            site('US Search', form('https://www.ussearch.com/opt-out/submit/')),
            site('Veripages', `Start the removal process on the ${link('https://veripages.com/inner/control-privacy', 'privacy control page')} and confirm by email, or email ${mail('removal@veripages.com')}.`),
            site('WYTY', form('https://www.wyty.com/remove/')),
            site('Yasni', `No opt-out: ${link('https://yasni.com', 'Yasni')} aggregates other sites. Use it to find sources you missed, and remove yourself there.`),
            site('Zabasearch', 'Fax a written opt-out request to 425-974-6194.')
        ]
    },
    {
        id: 'phone',
        title: 'Phone books & caller ID',
        note: 'Reverse phone lookups are how a scammer turns a number into a name — and how they learn which number reaches you.',
        sites: [
            site('All Area Codes', form('https://www.allareacodes.com/remove_name.htm')),
            site('America Phonebook', `Use the ${link('http://www.americaphonebook.com/contact.php', 'removal page')}.`),
            site('Call Truth', form('https://www.calltruth.com/opt_out.php')),
            site('Caller Smart', `Email them through their ${link('https://www.callersmart.com/contact', 'contact page')}; it skips the account the ${link('https://www.callersmart.com/opt-out', 'opt-out form')} requires.`),
            site('Callyo', email('callyo.support@motorolasolutions.com', 'Demand removal of all information tied to your number.')),
            site('Cell Revealer', `Search your number on ${link('https://cellrevealer.com', 'cellrevealer.com')} and click the removal link beside your entry.`),
            site('Confidential Phone Lookup', `Highlight your entry on ${link('https://www.confidentialphonelookup.com', 'the site')} and click “Do Not Display”.`),
            site('DexKnows', form('https://tinyurl.com/dexknowscom', 'Run by Thryv, which also covers Superpages and Yellow Pages.')),
            site('HPCC-USA', form('https://www.hpcc-usa.org/research/change-listing.html')),
            site('National Cellular Directory', form('https://www.nationalcellulardirectory.com/optout/')),
            site('OK Caller', `In your results on ${link('https://www.okcaller.com/', 'okcaller.com')}, click “Opt-out” or “Unlist”.`),
            site('Old Phone Book', `Click the removal link below your results on ${link('http://www.oldphonebook.com/', 'oldphonebook.com')}.`),
            site('Peep Lookup', form('https://www.peeplookup.com/opt_out')),
            site('People By Phone', form('https://www.peoplebyphone.com/remove-my-number/')),
            site('Phone Owner', email('customer-service@phoneowner.com', 'Also removes you from several of their subsidiaries.')),
            site('Phonebooks', `Use the “Request That This Person Be Removed” link at the bottom right of your listing on ${link('https://www.phonebooks.com', 'phonebooks.com')}.`),
            site('Reveal Name', form('https://www.revealname.com/opt_out', 'You need the full URL of your listing.')),
            site('Reveal Phone Owner', form('https://www.revealphoneowner.com/data-removal')),
            site('Spy Dialer', form('https://www.spydialer.com/optout.aspx')),
            site('Superpages', form('https://tinyurl.com/dexknowscom', 'Same Thryv form as DexKnows.')),
            site('Sync.me', form('https://sync.me/optout/')),
            site('Telephone Directories', form('https://www.telephonedirectories.us/Edit_Records')),
            site('Tenn Help', form('https://www.tennhelp.com/public-resources/change-listing.html')),
            site('The Real Yellow Pages', form('https://tinyurl.com/dexknowscom', 'Same Thryv form as DexKnows.')),
            site('Truecaller', form('https://www.truecaller.com/unlisting')),
            site('United States Phonebook', email(['paulmfield@gmail.com', 'lookupuk@gmail.com'])),
            site('US Phonebook', form('https://www.usphonebook.com/opt-out')),
            site('Valid Number', contact('https://validnumber.com/doc/contact/')),
            site('Whoseno', `Request removal through the form on ${link('https://www.whoseno.com/', 'whoseno.com')}.`),
            site('Yellow Pages', form('https://tinyurl.com/dexknowscom', 'Same Thryv form as DexKnows.'))
        ]
    },
    {
        id: 'marketing',
        title: 'Marketing lists & junk mail',
        note: 'Marketing brokers build the household profiles that targeted scams start from. These rarely have a page to search; just submit.',
        sites: [
            site('Catalog Choice', `Use ${link('https://catalogchoice.org', 'Catalog Choice')} to opt out of catalogs and mailers.`),
            site('Data Axle', form('https://www.data-axle.com/do-not-sell-my-data/', 'Fill out the required fields.')),
            site('DirectMail', form('https://www.directmail.com/mail_preference/')),
            site('DMA Choice', `Opt out of ${link('https://www.ims-dm.com/cgi/dncc.php', 'mail')} and ${link('https://www.ims-dm.com/cgi/optoutemps.php', 'email')} marketing lists.`),
            site('Epsilon', epsilon('optout@epsilon.com')),
            site('Epsilon Abacus', epsilon('abacusoptout@epsilon.com')),
            site('Epsilon CFD', epsilon('dataoptout1@epsilon.com')),
            site('Epsilon Shopper’s Voice', epsilon('contactus@shoppers-voice.com')),
            site('Haines & Company', email(['criscros@haines.com', 'custserv@haines.com'], 'Include your name and address and ask to be removed from all databases.')),
            site('LexisNexis Direct Marketing', form('https://www.lexisnexis.com/privacy/directmarketingopt-out.aspx', 'Separate from the Step One LexisNexis opt-out.')),
            site('Mastercard', `Opt out of ${link('https://www.mastercard.us/en-us/vision/corp-responsibility/commitment-to-privacy/privacy/data-analytics-opt-out.html', 'data analytics')} and ${link('https://www.mastercard.us/en-us/vision/corp-responsibility/commitment-to-privacy/privacy/email-opt-out.html', 'marketing email')}.`),
            site('Melissa Data', email(['paul.nelson@melissa.com', 'brett.mcwhorter@melissa.com'])),
            site('Plaid', form('https://plaid.com/legal/data-protection-request-form/', 'Plaid links bank accounts to apps; confirm by email.')),
            site('Publishers Clearing House', email('privacychoices@pchmail.com', 'Include your name and address and ask to be removed from all databases.')),
            site('RetailMeNot / RedPlum', contact('https://help.retailmenot.com/s/contactsupport')),
            site('Valpak', form('https://www.valpak.com/coupons/show/mailinglistsuppression')),
            site('Visa', form('https://marketingreportoptout.visa.com/OPTOUT/request.do'))
        ]
    },
    {
        id: 'genealogy',
        title: 'Genealogy & family history',
        note: 'Family trees map exactly the relationships a “relative in distress” voice scam needs.',
        sites: [
            site('Ancestry', email(['support@ancestry.com', 'customersolutions@ancestry.com'], 'Email both, naming the specific records to remove.')),
            site('Archives', form('https://archives.com/optout')),
            site('FamilySearch', email('DataPrivacyOfficer@ldschurch.org')),
            site('Family Tree Now', form('https://www.familytreenow.com/optout')),
            site('MyHeritage', email('support@myheritage.com', `If you have an account, ${link('https://faq.myheritage.com/en/article/how-do-i-delete-my-account-on-myheritage', 'delete it')} too.`))
        ]
    },
    {
        id: 'records',
        title: 'Property, vehicle & court records',
        sites: [
            site('Arrest Facts', `Now at ${link('https://nkreeger.com/', 'nkreeger.com')}. Click “Information Control” on any record that lists you and follow the removal steps.`),
            site('BlockShopper', email('scarlett@blockshopper.com', 'Cite special circumstances and expect resistance.')),
            site('Cars Owners', contact('https://carsowners.net/feedback')),
            site('City-Data', form('https://www.city-data.com/privacy-form.php?w=usget')),
            site('Connected Investors', form('https://connectedinvestors.com/content/do-not-sell')),
            site('Fax VIN', contact('https://www.faxvin.com/company/contact')),
            site('MugshotLook', form('https://www.mugshotlook.com/optOut/name/landing')),
            site('Property Shark', email('support@propertyshark.com')),
            site('Vehicle History', email('support@vehiclehistory.com')),
            site('Voter Records', `Follow the removal steps in the ${link('https://voterrecords.com/faq', 'Voter Records FAQ')}.`)
        ]
    },
    {
        id: 'professional',
        title: 'Professional & business profiles',
        note: 'Work emails, titles and org charts feed impersonation scams aimed at you and your employer.',
        sites: [
            site('Apollo', form('https://www.apollo.io/privacy-policy/remove/')),
            site('Buzzfile', form('http://www.buzzfile.com/Company/Remove')),
            site('ContactOut', form('https://contactout.com/optout', `Or email ${mail('support@contactout.com')}.`)),
            site('Corporation Wiki', form('https://www.corporationwiki.com/profiles/public')),
            site('Meritpages', email('help@meritpages.com')),
            site('OpenCorporates', email('data.protection@opencorporates.com', 'Include the public details you want removed.')),
            site('People Data Labs', form('https://www.peopledatalabs.com/opt-out-form')),
            site('SalesSpider', `Find your profile and select “Delete this profile” (${link('http://salespidermedia.com/opt-out-and-information-removal.php', 'instructions')}).`),
            site('ZoomInfo', `Use the ${link('https://www.zoominfo.com/about-zoominfo/privacy-manage-profile', 'profile manager')}: click “Is this you?”, sign up, and delete what you want removed.`)
        ]
    },
    {
        id: 'investigative',
        title: 'Investigator & screening databases',
        note: 'Used by skip tracers, landlords, employers and private investigators. Mostly email-only; expect pushback.',
        sites: [
            site('BatchDialer', form('https://batchdialer.com/personal-information')),
            site('BatchLeads', form('https://batchleads.io/personal-information')),
            site('BatchSkipTracing', form('https://batchskiptracing.com/personal-information')),
            site('Checkr', form('https://candidate.checkr.com/privacy/delete')),
            site('DataChk', contact('https://www.datacheckinc.com/contact/', 'Also removes you from several of their subsidiaries.')),
            site('DelvePoint', email('customerservice@delvepoint.com')),
            site('Fama', email('privacy@fama.io')),
            site('IRBSearch', email('customercare@irbsearch.com')),
            site('Thomson Reuters CLEAR', `Submit the ${link('https://privacyportal-cdn.onetrust.com/dsarwebform/dbf5ae8a-0a6a-4f4b-b527-7f94d0de6bbc/5dc91c0f-f1b7-4b6e-9d42-76043adaf72d.html', 'privacy request form')} and email ${mail('privacy.issues@thomsonreuters.com')}. Covers Westlaw.`),
            site('TLO (TransUnion)', `Submit the ${link('https://service.transunion.com/dss/ccpa_optout.page', 'opt-out form')} and email ${mail('CustomerSupport@TLO.com')} demanding removal of all records. Expect resistance.`),
            site('Whooster', email('privacy@whooster.com'))
        ]
    }
];
