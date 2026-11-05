# Τέλη Κυκλοφορίας 2027

A free road tax calculator for Greece in Greek, English, Albanian, Chinese and Russian, plus five Greek guide pages.

It's hosted free on **GitHub Pages**. Every Monday and Thursday GitHub also checks AADE by itself: road-tax announcements appear on the site, and GitHub emails you about them.

## Put it online (once, about 15 minutes)
1. **GitHub account.** Sign up at https://github.com if you don't have one.
2. **A name for the site.** Click your picture (top right) → **Your organizations** → **New organization** → **Free**. Name it `teli-gr`. Your site will be `https://teli-gr.github.io`.
   (Organizations are free. This keeps your personal `yourname.github.io` free for your portfolio.)
3. **GitHub Desktop.** Install it from https://desktop.github.com and sign in.
4. In GitHub Desktop: **File → Add local repository** → choose this folder (`teli-kykloforias-2027`). It says it isn't a repository yet: click **create a repository** → **Create repository** (leave the options as they are).
   If the left side then lists files, type `First version` in **Summary** and click **Commit to main**.
5. Click **Publish repository**:
   - Name: `teli-gr.github.io` (exactly your organization's name + `.github.io`)
   - **Untick** "Keep this code private"
   - Organization: `teli-gr`
   - **Publish repository**
6. On github.com, open the repository → **Settings** → **Pages** → under "Source" choose **GitHub Actions**.
7. Add the automation (one copy-paste, because it has to live in a hidden folder):
   - Open `github-workflow.yml` from this folder in a text editor (Notepad / TextEdit), select all and copy.
   - On github.com, in the repository: **Add file → Create new file**.
   - Name it exactly `.github/workflows/publish.yml` (typing the `/` creates the folders), paste, then **Commit changes**.
   - This starts the first publish. After about 2 minutes the site is live at `https://teli-gr.github.io` (watch it in the **Actions** tab).
8. Optional, to run the first AADE check now: **Actions → Publish site → Run workflow**. Otherwise it runs by itself on Monday or Thursday.
9. In GitHub Desktop click **Fetch origin**, then **Pull origin**, so your folder has the new file too. You can delete `github-workflow.yml` afterwards.

GitHub emails you when the automatic check opens an "issue" (new AADE road-tax announcement, a change in the law's numbers, or AADE unreachable for two weeks). Make sure **Settings → Notifications → Email** is on in your GitHub account.

## To change something later
1. Edit the files in `app/src` (the texts for each language are in `app/src/i18n`), or `deploy/settings.json`.
2. In GitHub Desktop: click **Fetch origin** / **Pull origin** first (the automatic check saves its results twice a week), then write a short summary, **Commit to main** and **Push origin**.
3. GitHub rebuilds and publishes the site by itself in about 2 minutes. (To try it on your computer first: in the `app` folder run `npm ci` once, then `npm run build:site`.)

## settings.json (in the deploy folder)
- `"domain"`: your own domain when you buy one, e.g. `"teli.gr"`.
- `"goatcounter"`: your GoatCounter code (free visitor counter, no cookies, https://www.goatcounter.com).
- `"contactEmail"`: shown on the site for privacy questions and «Βρήκατε λάθος;». It's public.

## When you buy a domain
1. Put it in `deploy/settings.json` (`"domain": "teli.gr"`), then commit and push.
2. GitHub → repository → **Settings → Pages → Custom domain** → `teli.gr` → **Save**.
3. At your domain seller, in the DNS settings:
   - four **A** records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - one **CNAME** record for `www` → `teli-gr.github.io`
4. Wait up to 24 hours, then tick **Enforce HTTPS** in Settings → Pages.
5. Google Search Console → **Add property → Domain** → add the TXT record it gives you → **Verify** → add `sitemap.xml`.

## What's in here
- **.github/workflows/publish.yml** (copied from `github-workflow.yml`): the automatic publishing and AADE check.
- **app/**: the source code (React + Vite + Tailwind). News and the check date are in `app/src/content/aade-data.ts`; the AADE check is `app/scripts/check-aade.mjs`. It never changes tax amounts by itself: those are in `app/src/lib/gov.ts` and need a person to check them.
- **deploy/**: the finished website (`site/`) and its settings. `deploy/README.md` also explains the Firebase way to put it online.
- `app/SETUP.md`: Firebase smart alerts (Phase 2). Off; it needs Firebase's paid Blaze plan.
