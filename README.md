# Τέλη Κυκλοφορίας 2027

A free road-tax calculator for Greece, in Greek, English, Albanian, Chinese and Russian, plus five Greek guide pages.

**Live:** https://teli-gr.github.io

## Where everything lives
- **Website:** GitHub Pages, organisation `teli-gr`, repository `teli-gr.github.io`. **GitHub holds the master copy.** This folder is a backup.
- **Visitor counter:** https://eni.goatcounter.com (code `eni`). Only visitors who tap «Ναι» on the card at the bottom are counted. Smart-alerts votes are counted for everyone who votes.
- **Settings:** `deploy/settings.json` (domain, GoatCounter code, contact email). Change them on github.com: open the file, click the pencil, edit, then **Commit changes**.
- **Contact email on the site:** hi@eneapapa.com
- **Automatic AADE check:** every Monday and Thursday morning (GitHub Actions).
  - New AADE announcements for vehicle owners appear on the site by themselves.
  - GitHub emails you an "issue" when a person needs to look: new AADE news, the law's numbers changed, or AADE unreachable for two weeks.
  - It never changes tax amounts by itself.

## Dates to remember
- **Mon 9 Nov 2026:** first automatic AADE check. The date under the title ("Έλεγχος ΑΑΔΕ: …") should change.
- **10 Dec 2026:** decide on smart alerts using the GoatCounter votes (`alerts_interest-yes-…` / `alerts_interest-no-…`).
  - Many yes: build them (`app/SETUP.md`).
  - Few: remove the card.
- **31 Dec 2026:** the electric-car grant line hides itself.
- **1 Nov 2027:** the site switches to 2028 by itself. Check the rates and the deadline then.

## Changing the site later (github.com only)
1. Make the change in a **copy** of the `app` folder (or ask Claude to do it).
2. In that copy, **delete** `app/src/content/aade-data.ts` and `app/scripts/aade-state.json`. GitHub's automatic check keeps these two up to date, and uploading them would overwrite its newer copies.
3. github.com → repository → **Add file → Upload files** → drag the `app` folder → **Commit changes**.
4. In the **Actions** tab, wait for the green tick (about 2 minutes). Check the result in a private browser window.

## When you buy a domain
1. In `deploy/settings.json`, write the domain without https or www, e.g. `"domain": "teli.gr"`, then commit.
2. GitHub → repository → **Settings → Pages → Custom domain** → `teli.gr` → **Save**.
3. In your domain seller's DNS settings, add:
   - four **A** records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - one **CNAME** record for `www` → `teli-gr.github.io`
4. Wait up to 24 hours, then tick **Enforce HTTPS** in Settings → Pages.
5. Google Search Console → **Add property → Domain** → add the TXT record it gives you → **Verify** → add `sitemap.xml`.

## Still to do
- Switch off the old Firebase copy: run `firebase hosting:disable --project teli-a7061` in Terminal and type `y`.

## Privacy (GDPR) in short
- Nothing is counted before «Ναι».
- «Ναι» and «Όχι» look exactly the same. ✕ means "not now" and counts nothing.
- The choice expires after 12 months, and the site asks again.
- Browsers that send "Do Not Track" or "Global Privacy Control" are never asked and never counted.
- «Απόρρητο» names you as the person responsible and explains:
  - GitHub hosting, which logs visitor IPs for security;
  - GoatCounter (EU servers, no cookies);
  - what's stored on the visitor's device;
  - visitors' rights.
- Visitors can delete everything the site saved on their device from «Απόρρητο».

## What's in this folder
- **`app/`:** the source code (React + Vite + Tailwind).
  - Texts for each language: `app/src/i18n/`.
  - Tax rates: `app/src/lib/gov.ts`. Change them only after checking the law.
  - News and the date of the last check: `app/src/content/aade-data.ts`.
  - The AADE check itself: `app/scripts/check-aade.mjs`.
- **`deploy/`:** `settings.json`, the built site (`site/`) and `fill.mjs`, which fills in the address, counter and email.
  - `deploy/README.md` explains every GoatCounter event (what `pay_click`, `result_shown`… mean) and the Firebase way to publish.
- **`github-workflow.yml`:** a copy of `.github/workflows/publish.yml` on GitHub (publishing plus the AADE check).
- **`app/SETUP.md`:** smart alerts (Phase 2). Off; it needs Firebase's paid Blaze plan.
- **To try the site on a computer:** in the `app` folder run `npm ci` once, then `npm run build:site`.
