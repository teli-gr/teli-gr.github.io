# Phase 2: smart alerts and self-updating data

> **Phase 1 (free website, no card) is the `deploy` folder next to this one: see `../deploy/README.md`.** Use this guide only when you want alerts and automatic updates (Blaze plan).

Everything runs on **Firebase** (Google). No Claude, no AI. Plan on about 45 minutes the first time.

## What you get

| Part | What it does | Where |
|---|---|---|
| Website | The calculator, as one fast page + app icon (installable on phones) | Firebase Hosting → `dist/` |
| `/api/gov` | Serves the latest official data to the page | Cloud Function `api` |
| `checkGov` | Mon + Thu 09:30 Athens: rolls the tax year on 1 Nov, reads AADE press releases and stores road-tax ones, watches the law article for changed numbers and emails you | Cloud Function (scheduled) |
| `sendAlerts` | Every day 10:00 Athens: deadline (14/3/1 days), surcharge eve, immobilisation (7 days), new AADE news. Skips people who pressed «Το πλήρωσα». Each alert is sent once. | Cloud Function (scheduled) |
| Push alerts | Phone/computer notifications from the app (Android, Windows, Mac; iPhone after «Προσθήκη στην οθόνη Αφετηρίας», iOS 16.4+) | Firebase Cloud Messaging |
| Email alerts | Optional, with confirmation and one-click unsubscribe | Resend (free tier) |

## 0. On your Mac (5 min, once)
1. Install **Node.js 24 LTS** from https://nodejs.org (the backend runs on Node 24; Node 20 was switched off by Google on 30/10/2026).
2. Check it in Terminal: `node -v` should print `v24…`.

## 1. Create the Firebase project (10 min)
1. Go to https://console.firebase.google.com → **Add project**. Turn Google Analytics off (not needed).
2. **Upgrade to the Blaze plan** (pay as you go). Scheduled functions need it. Blaze still includes the free quotas: push (FCM) is free, Firestore gives 50k reads / 20k writes a day, and Cloud Scheduler gives 3 free jobs per billing account (this app uses 2). Expect about €0–2 a month at small scale (estimate). Set a budget alert at €10 under *Usage and billing*.
3. **Build → Firestore Database → Create database**, location `eur3 (europe-west)`, production mode.
4. **Project settings → General → Your apps → Web (</>)**. Register the app. Copy the `firebaseConfig` object.
5. **Project settings → Cloud Messaging → Web Push certificates → Generate key pair**. Copy the key (this is the VAPID key).

## 2. Email (optional, 10 min)
1. Create an account at https://resend.com and verify your domain (it gives you DNS records to add).
2. Create an API key.
3. Skip this whole step if you only want push alerts.
4. **Limit to know:** Resend's free plan sends 100 emails a day (3,000 a month). Confirmation emails count too. Once you pass about 80 email subscribers, move to Resend Pro ($20/month, 50,000 emails, no daily limit) before December. If the limit is hit, the app keeps going: the 14-day, immobilisation and news alerts are retried on the next days, and the Mon/Thu report email warns you. The "3 days" and "tomorrow" alerts are not retried, because their wording would be wrong a day later.

## 3. Fill in the settings
In the `app` folder:
```
cp .env.example .env.production
cp functions/.env.example functions/.env
```
- `.env.production`: your site address, the `firebaseConfig` as one line of JSON, the VAPID key. Leave `VITE_GOV_URL=/api/gov`.
- `functions/.env`: your site address, your email for change reports, the sender address.
- `.firebaserc`: replace `YOUR-FIREBASE-PROJECT-ID` with your project id (or run `firebase use --add` after `firebase login` and pick the project).

## 4. Deploy (10 min)
```
npm install -g firebase-tools
firebase login
cd ~/Desktop/teli-kykloforias-2027/app
npm install
npm run build                 # builds dist/ (website + icons + push worker)
cd functions && npm install && npm test && cd ..
firebase functions:secrets:set RESEND_API_KEY   # paste the key, or type: off
firebase deploy
```
Then **Hosting → Add custom domain** if you have one.

## 5. Check it works (5 min)
1. Open the site, fill in a car, scroll to **Έξυπνες ειδοποιήσεις**, press **Ειδοποιήσεις σε αυτή τη συσκευή** and allow.
2. In Google Cloud Console → **Cloud Scheduler**, press **Force run** on `firebase-schedule-checkGov-…`, then on `…sendAlerts…`.
3. In Firestore you should see `gov/current`, `gov/meta` and your entry in `subscribers`.
4. To test a push right away, temporarily add a test notice in `gov/current.notices` with `"notified": false`, then force-run `sendAlerts`.

## How the self-updating works (and its limits)
- **Year rollover** is a fixed rule: on 1 November the tax year moves on (deadline 31/12, +25% / +50% / +100% from 1 Jan / 1 Feb / 1 Mar).
- **AADE news**: new links on https://www.aade.gr/deltia-typoy-anakoinoseis are opened; a release is stored when its main text mentions road tax, myCAR or ακινησία. The first run only learns the existing links, so old releases don't flood people.
- **Rates** live in a law, so they are never changed automatically. When the numbers on the law page change, you get an email and a `gov/review` note. Then edit `gov/current` in the Firestore console (same shape as `functions/seed/gov.json`).
- **If AADE redesigns its site**, news reading may stop. Nothing wrong is shown (the page rejects badly shaped data), and the change report email tells you the check failed.

## Privacy (GDPR)
- Stored: email or device token, alert choices, tax year, and the amount only if the person turns it on. No vehicle details, no names.
- Every email has an unsubscribe link; the app has **Απενεργοποίηση**.
- Add a short privacy page with your contact details before you advertise the site.

## Turning off the Claude parts
Once this is live you don't need the claude.ai page or its Mon/Thu scheduled task. Ask Claude to delete the task, or remove it from your scheduled tasks list.
