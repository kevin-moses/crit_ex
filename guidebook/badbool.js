// Adapted from the Big Ass Data Broker Opt-Out List (BADBOOL) by Yael Grauer,
// https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List, licensed
// CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/). This
// file is shared under the same license. `how` is trusted HTML.
//
// Brokers that are also in the IntelTechniques workbook (removals.js) reuse its
// ids; guide.js shows each broker once, using these newer steps.

import { link, mail, site } from './removals.js';

export const CRUCIAL = [
    site('BeenVerified', `Opt out of ${link('https://www.beenverified.com/app/optout/search', 'people search')} and ${link('https://www.beenverified.com/app/optout/address-search', 'property search')}, then confirm by email. Also covers PeopleLooker and PeopleSmart. Only one opt-out per email address, so use another address or email them for extra listings.`),
    site('CheckPeople', `First ask for a copy of your data under “Right to Know” on the ${link('https://checkpeople.com/privacy-rights', 'privacy rights page')}. If they have you, ${link('https://checkpeople.com/opt-out', 'opt out')}; it asks for your birthdate and full legal name.`, 'check-people'),
    site('Clustal', `Search ${link('http://clustal.org', 'Clustal')} and click “view full record” to get the right URL. Paste it into the ${link('https://www.clustal.org/privacy-control', 'privacy control page')}, add an email, and confirm the email they send. Each listing needs its own email address.`),
    site('Intelius', `Find yourself on ${link('https://www.intelius.com/', 'Intelius')}, then ${link('https://suppression.peopleconnect.us/login', 'submit the suppression form')}, email ${mail('support@mailer.intelius.com')}, or call 1-888-245-1655. Also covers its other sites, including Instant Checkmate, TruthFinder, US Search and Zabasearch.`),
    site('Men Stopping Violence', `${link('https://www.menstoppingviolence.org/people/', 'Search for your name')}, paste your listing’s URL into the ${link('https://www.menstoppingviolence.org/opt-out/', 'opt-out page')}, add your email, and confirm the email they send.`),
    site('MyLife', `Find your profile on ${link('https://www.mylife.com', 'MyLife')} and ${link('https://www.mylife.com/privacyrequest', 'request removal')}, or email ${mail('privacy@mylife.com')} with your name and profile link. They may push you to make an account with a copy of your driver’s license, or to call (888) 704-1900.`),
    site('Nuwber', `Find yourself on ${link('https://nuwber.com/', 'Nuwber')} (filter by state to get your “person” URL) and use the ${link('https://nuwber.com/removal/link', 'removal form')}. If the URL won’t work, email a screenshot of your listing to ${mail('support@nuwber.com')}. Skip the paid “full report”.`),
    site('SmartBackgroundChecks', `Find yourself on ${link('https://www.smartbackgroundchecks.com/', 'SmartBackgroundChecks')} and ${link('https://www.smartbackgroundchecks.com/optout', 'opt out')}. This usually removes you from PeopleFinders too.`, 'smart-background-checks'),
    site('Spokeo', `${link('https://www.spokeo.com/search', 'Find your profile')}, paste its URL and your email into the “opt out your information” section of the ${link('https://www.spokeo.com/optout', 'opt-out page')}, and confirm the email. Paid accounts may still see removed data.`),
    site('That’s Them', `Search ${link('https://thatsthem.com/', 'That’s Them')} and, if you’re listed, ${link('https://thatsthem.com/optout', 'opt out')}. Skip the Spokeo identity-protection link; it’s a paid product.`),
    site('Whitepages', `Find yourself on ${link('https://www.whitepages.com/', 'Whitepages')} and ${link('https://www.whitepages.com/suppression_requests', 'opt out')}; an automated call gives you a code to enter. Also check 411.com, which uses the same opt-out, and Whitepages Premium, which may keep your listing.`)
];

export const HIGH = [
    site('Acxiom', `Submit the ${link('https://www.acxiom.com/optout/', 'U.S. opt-out')} or the ${link('https://privacyportal.onetrust.com/webform/342ca6ac-4177-4827-b61e-19070296cbd3/6896cf25-6953-4500-9c69-5a8fb6f6f932', 'international rights portal')}, or call (877) 774-2094. You can’t see their data on you for free, so just submit.`),
    site('Ancestry', `Make a free account (not a free trial), search the sidebar for records from every state you have lived in, and email the URLs to ${mail('privacy@ancestry.com')}, even ones that lead to a sales page. Or submit them one at a time on the ${link('https://support.ancestry.com/s/reportissue?language=en_US', 'content removal form')}.`),
    site('FamilyTreeNow', `Search for yourself and ${link('https://www.familytreenow.com/optout', 'opt out')}.`, 'family-tree-now'),
    site('FastPeopleSearch', `${link('https://www.fastpeoplesearch.com/', 'Search')} and ${link('https://www.fastpeoplesearch.com/optout', 'opt out')}. Expect a captcha.`, 'fast-people-search'),
    site('USPhoneBook', `Look up your number and ${link('https://www.usphonebook.com/opt-out/', 'opt out')}. If the page hangs, email ${mail('support+optout@usphonebook.com')}.`, 'us-phonebook')
];

export const GROUPS = [
    {
        id: 'badbool-people',
        title: 'People-search sites',
        sites: [
            site('Cyber Background Checks', `${link('https://www.cyberbackgroundchecks.com/', 'Search')} and ${link('https://www.cyberbackgroundchecks.com/removal', 'opt out')}.`),
            site('EveryJoe', `Find your listing on ${link('https://www.everyjoe.com/', 'EveryJoe')} and paste its link into the ${link('https://www.everyjoe.com/do-not-sell/', 'opt-out page')}.`),
            site('FreePeopleDirectory', `${link('https://www.freepeopledirectory.com', 'Search')}. If you’re there, opt out in the “opt out your information” section of ${link('https://www.spokeo.com/optout', 'Spokeo’s opt-out page')}.`, 'free-people-directory'),
            site('InfoTracer', `${link('https://www.infotracer.com', 'Search')} and fill out the ${link('https://infotracer.com/optout/', 'opt-out form')}, or mail or fax (1-617-933-9946) their ${link('https://members.infotracer.com/tspec/shared/assets/data_opt_out_form.pdf', 'paper form')}.`, 'infotracer'),
            site('National Public Data', `${link('https://nationalpublicdata.com/search', 'Search')}, paste your record’s URL into the ${link('https://nationalpublicdata.com/optout.html', 'opt-out form')}, and confirm by email.`),
            site('PeopleByName', `${link('https://www.peoplebyname.com/people', 'Look up your name')} (or go straight to peoplebyname.com/people/Last_Name/First_Name) and ${link('https://www.peoplebyname.com/remove.php', 'opt out')} of each record.`, 'people-by-name'),
            site('PeopleSearchNow', `Find yourself and ${link('https://www.peoplesearchnow.com/opt-out', 'opt out')}.`, 'people-search-now'),
            site('PrivateEye', `${link('https://www.privateeye.com/', 'Search')} and ${link('https://www.privateeye.com/removal', 'start the opt-out')}; they email you a removal form to fill out.`),
            site('PrivateRecords', `${link('https://www.privaterecords.net/name/landing', 'Search your name and state')} and ${link('https://www.privaterecords.net/api/helper/optOutLight/search', 'opt out')}.`, 'private-records'),
            site('Searchbug', `Searching needs a credit card sign-up (first search free). Ask them to block your listing through their ${link('https://www.searchbug.com/contact-us.aspx', 'contact form or chat')}, by phone or text at (760) 454-7301, or by fax at (760) 454-7341.`, 'search-bug'),
            site('SearchPeopleFree', `Search by name, phone, address and email, then ${link('https://www.searchpeoplefree.com/opt-out', 'opt out')}.`, 'search-people-free'),
            site('SearchQuarry', `${link('https://www.searchquarry.com/', 'Search')}. If you’re listed, ${link('https://members.searchquarry.com/removeMyData/', 'opt out')} and click the verification link.`, 'search-quarry'),
            site('Social Catfish', `Note the URL of every page that lists you, then follow the steps on the ${link('https://socialcatfish.com/opt-out/', 'opt-out page')} and confirm by email. Only ask to remove what you have seen on the site.`),
            site('SpyFly', `${link('https://www.spyfly.com', 'Search')}, then use the ${link('https://www.spyfly.com/help-center/privacy-requests', 'privacy request page')} or email ${mail('support@spyfly.com')}. Confirm they have your data before giving your name, age and address.`),
            site('TruePeopleSearch', `Follow the ${link('https://www.truepeoplesearch.com/removal', 'removal steps')}: name, city, state and email, then several captchas.`),
            site('TruePeopleSearch.net', `${link('https://truepeoplesearch.net', 'Search')}, closing any pages it pops open and ignoring the “top rated background search” links. If you’re there, submit your URL on their ${link('https://docs.google.com/forms/d/e/1FAIpQLSeCPggzv4iXE20iUjcr6vdVWxBOblCyGwDLcO-jZA5j2YF5fQ/viewform', 'opt-out form')}.`),
            site('United Nations Public Administration Network', `Search ${link('https://unpan.org/', 'unpan.org')} with only your first and last name, paste the URL into the ${link('https://unpan.org/opt-out', 'opt-out page')}, and click “confirm request” in the email they send.`, 'unpan'),
            site('United States Phonebook', `${link('https://www.unitedstatesphonebook.com/search.php', 'Search')}. If your address shows, enter the phone number and ZIP code it lists on the ${link('https://www.unitedstatesphonebook.com/contact.php', 'removal page')}.`),
            site('Unmask', `Find your entry on ${link('https://unmask.com/', 'Unmask')}, enter your name, city and state on the ${link('https://unmask.com/opt-out/', 'opt-out form')}, and confirm by email.`),
            site('USA People Search', `${link('https://www.usa-people-search.com/', 'Search')} and ${link('https://www.usa-people-search.com/removal', 'remove your information')}.`),
            site('Veripages', `Paste your profile URL, name and email into the ${link('https://veripages.com/inner/control-privacy', 'privacy control page')} and confirm by email.`)
        ]
    },
    {
        id: 'badbool-records',
        title: 'Genealogy, records & work profiles',
        sites: [
            site('Archives', `Finding your data takes a free trial (cancel it afterwards). If you’re listed, ${link('https://www.archives.com/Optout', 'opt out')}.`),
            site('Classmates', `If you have an account, ${link('https://help.classmates.com/hc/en-us/articles/115002224171-How-can-I-cancel-my-membership-', 'cancel your membership')}.`),
            site('FamilySearch', `Make a free account, ${link('https://www.familysearch.org/search/', 'search historical records')}, and submit the URLs that list you on the ${link('https://submit-irm.trustarc.com/services/validation/b8d6e704-e5b1-42a0-9f86-bbdec35939a1', 'opt-out form')}. Confirm by email.`),
            site('PropertyRecs', `Search your name and state on the ${link('https://dashboard.propertyrecs.com/opt-out', 'opt-out page')} and opt out if you’re listed.`),
            site('VoterRecords', `Find your record on ${link('https://voterrecords.com/', 'VoterRecords')}, click “record opt-out” at the bottom of the page, and submit the form. Confirm by email if asked.`, 'voter-records'),
            site('ZoomInfo', `Check whether they have you with the ${link('https://privacyrequest.zoominfo.com/remove/verify', 'privacy request form')}. If they hold an email for you, they send a code to finish the opt-out.`)
        ]
    },
    {
        id: 'badbool-faces',
        title: 'Face search engines',
        note: 'Anyone can upload one photo of you and find the rest, which is ready source material for a deepfake. Opting out hides you from their search, not from the sites the photos are on.',
        sites: [
            site('PimEyes', `Submit the ${link('https://pimeyes.com/en/opt-out-request-form', 'opt-out form')} with a photo of your face and a photo ID with everything but your name and picture blurred. Signal’s ${link('https://signal.org/blog/blur-tools/', 'blur tool')} works for this.`),
            site('FaceCheck.ID', `On the ${link('https://facecheck.id/Face-Search/RemoveMyPhotos', 'removal page')}, search your face, then verify with an ID (name, address and number hidden) or a selfie with two fingers touching your chin.`, 'facecheck')
        ]
    },
    {
        id: 'badbool-special',
        title: 'Special circumstances',
        note: 'Victims of violent crime or identity theft can often remove records others can’t, sometimes with a court order. The Privacy Rights Clearinghouse keeps a fuller broker list for those cases.',
        sites: [
            site('Address confidentiality', 'If you have experienced domestic violence, sexual abuse or stalking, search “address confidentiality program” and your state for a program that gives you a substitute address and forwards your mail.'),
            site('NPI registry', `Healthcare workers: ${link('https://opennpi.com/provider/', 'look up your NPI listing')} and ${link('https://opennpi.com/contact', 'update it')} with a practice address or PO box instead of your home address.`, 'npi'),
            site('Doximity', `Then ${link('https://support.doximity.com/hc/en-us/articles/9349631650323-How-to-Update-Edit-Your-Profile-on-the-Doximity-Website', 'edit')} or ${link('https://support.doximity.com/hc/en-us/articles/360039340393-How-to-Delete-Your-Doximity-Profile', 'delete')} your Doximity profile, which copies NPI data.`)
        ]
    }
];

export const SEARCH = [
    site('Google Results About You', `Use ${link('https://support.google.com/websearch/answer/12719076', 'Results About You')} to find search results that show your phone number, address or email, and ask Google to remove them.`),
    site('Google removal requests', `${link('https://support.google.com/websearch/troubleshooter/3111061', 'Ask Google to remove')} doxed contact details, intimate images, or fake explicit images of you from its results.`),
    site('Bing removal requests', `Ask ${link('https://www.microsoft.com/en-ca/concern/bing', 'Bing')} to remove the same.`)
];

export const CREDIT = [
    site('Equifax', `${link('https://www.equifax.com/personal/credit-report-services/credit-freeze/', 'Freeze your Equifax file')}, or call 1 (800) 349-9960.`),
    site('Experian', `${link('https://www.experian.com/freeze/center.html', 'Freeze your Experian file')}, or call 1 (888) 397-3742.`),
    site('TransUnion', `${link('https://www.transunion.com/credit-freeze/place-credit-freeze', 'Freeze your TransUnion file')}, or call 1 (888) 909-8872.`),
    site('Innovis', `${link('https://www.innovis.com/personal/securityFreeze', 'Freeze your Innovis file')}, or call 1 (800) 540-2505.`),
    site('ChexSystems', `${link('https://www.chexsystems.com/security-freeze/place-freeze', 'Freeze your ChexSystems file')}, or call 1 (800) 428-9623. This stops bank accounts being opened in your name.`),
    site('Family freezes', `Freeze the file of a child, or of an adult you are guardian or power of attorney for. The free ${link('https://github.com/stepuplaw/elder-fraud-toolkit', 'Elder Fraud Toolkit')} writes the letter for each bureau.`)
];

export const MARKETING = [
    site('Prescreened offers', `Opt out of prescreened credit offers at ${link('https://www.optoutprescreen.com/', 'OptOutPrescreen.com')}.`),
    site('Do Not Call', `Add your numbers to the ${link('https://www.donotcall.gov/', 'Do Not Call Registry')}.`),
    site('Targeted ads', `Opt out of cookie-based ad targeting in each browser at ${link('https://optout.aboutads.info', 'optout.aboutads.info')}.`),
    site('Motor vehicle records', 'Ask your state’s motor vehicle department what privacy options it offers.'),
    site('Phone carriers', 'Ask your home and mobile phone companies about hiding your name from caller ID and opting out of the sale of your number.')
];
