# Firebase: the other way to put the site online (Windows)

The main way is GitHub Pages (see `README.md` one folder up): free, and it checks AADE by itself. This page is for Firebase Hosting, if you prefer it.

## Once
1. Install **Node.js LTS** from https://nodejs.org (all default options).
2. Open **Command Prompt** and run:
   ```
   npm install -g firebase-tools
   firebase login
   ```
3. Go to https://console.firebase.google.com → **Create a project**. Analytics off, free **Spark** plan.
   Pick the project ID carefully: it becomes your free address and can't be changed. Example: `teli-gr` → `https://teli-gr.web.app`.
4. In the project: **Hosting → Get started**, click through to the end.

## Upload (every time)
1. Open this `deploy` folder in File Explorer, click the address bar, type `cmd` and press Enter. Command Prompt opens in this folder.
2. Run (with your project ID):
   ```
   firebase deploy --project teli-gr
   ```
3. Open `https://teli-gr.web.app`. Done.

Before uploading, Firebase runs `fill.mjs` by itself: it puts the right address into the pages. You don't touch it.

## Optional: settings.json
Open it with Notepad. Leave `""` for anything you don't have, then upload again.
- `"domain"`: your domain when you have one, e.g. `"teli.gr"`. Empty = the free `.web.app` address.
- `"goatcounter"`: your GoatCounter code (free visitor counter, no cookies, https://www.goatcounter.com), e.g. `"teli"`.
- `"contactEmail"`: shown on the site for privacy questions and «Βρήκατε λάθος;». It's public.

## Optional: preview on your PC first
```
node fill.mjs
firebase emulators:start --project demo-teli
```
Open http://localhost:5050. Press `Ctrl+C` to stop.

## When you buy a domain
1. In `settings.json` write `"domain": "teli.gr"` and upload again.
2. Firebase → **Hosting → Add custom domain** → `teli.gr`. Copy the records it shows (TXT and A) into your registrar's DNS settings and delete any old A records for `@` and `www`. Keep the TXT record forever. Wait a few hours (up to 24).
3. Add `www.teli.gr` too and tick **redirect** to `teli.gr`.
4. Google Search Console → **Add property → Domain** → `teli.gr`. Add the TXT record it gives you at your registrar, press **Verify**, then add `sitemap.xml` under **Sitemaps**.

## What you'll see in GoatCounter
- Visits per page: `/` (Greek), `/en/`, `/sq/`, `/zh/`, `/ru/`, and where people came from.
- `result_shown-co2` / `result_shown-cc`: people who got their amount.
- `pay_click` (myCAR login) and `pay_nocodes_click` (the no-TAXISnet page).
- `reminder_google`, `reminder_outlook`, `reminder_ics`, `share_copy`, `share_family` (sent to a relative), `marked_paid`.
- `immobilise_click` (off-the-road declaration), `ev_grant_click` / `ev_map_click` (electric-car grant and charger map), `feedback_click` («Βρήκατε λάθος;»).
- `js_error-…`: the page broke for someone. A few are normal (old browsers, extensions). If one keeps repeating, send me the text.
- Visits to the guide pages: `/odigos/akinisia/`, `/odigos/me-to-mina/`, `/odigos/prostima/`, `/odigos/ilektrika-ybridika/`, `/odigos/amea/`.
- `language-en`, `language-sq`… : people who switched language.
- The smart-alerts vote: `alerts_interest-yes-answer` / `alerts_interest-no-answer` (the quick vote in the result box) and `…-card` (the section lower down). `alerts_channel-push` / `alerts_channel-email` show how "yes" voters want them.

## Guide pages (for Google)
Five short Greek pages answer the most searched questions and link back to the calculator: `/odigos/akinisia/`, `/odigos/me-to-mina/`, `/odigos/prostima/`, `/odigos/ilektrika-ybridika/`, `/odigos/amea/`. They are in the sitemap, so Search Console finds them on its own.

## Smart alerts: on or off?
Off for now. The site describes the idea («Σε σχεδιασμό») and asks visitors «Να το φτιάξουμε;» Yes / No.
Decide by **10 December**, because the first alert (14 days before the deadline) goes out on 17 December:
- **Many yes votes** (my rule of thumb: 100+, or 1 in 5 of the people who answer): switch on Phase 2 with `../app/SETUP.md`. It costs about €0–2 a month, plus $20 a month for email only if you pass about 80 email sign-ups.
- **Few:** leave it off. The calendar reminders already cover most people.

## Limits
- The free plan allows 360 MB of traffic a day. A first visit is about 250 KB (fonts included) and a return visit only a few KB, so roughly 1,400 new visitors a day plus their return visits (estimate). If you reach it, the site stops until the next day. That's the moment to switch to the Blaze plan.
- The 2027 tax figures are built in. On 1 November 2027 the page switches to 2028 by itself (same rates, new dates). If the government changes the rates, or to refresh the text Google reads, ask for a rebuild then.
- The electric-car grant line («Επιδότηση 3.000 €») hides itself after 31 December 2026, the programme's deadline. If the government extends it, ask for an update.

## Stay informed (free)
Set two alerts at https://www.google.com/alerts: «παράταση τελών κυκλοφορίας» and «τέλη κυκλοφορίας 2028». If one fires (extension, new rates), ask for an update.
