// Checks AADE for road-tax news. GitHub runs it every Monday and Thursday (.github/workflows/publish.yml).
// - New AADE announcements a vehicle owner may need (road tax, myCAR, off-the-road, plates, transfers…) are added to the site (src/content/aade-data.ts).
// - It opens a GitHub issue (GitHub emails you) when there's a new announcement, when the numbers in the law
//   article change, or when AADE can't be read for two weeks.
// - It never changes tax amounts by itself: those need a person to check them.
// Run by hand with:  node scripts/check-aade.mjs   (in the app folder)
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { athensDate, dateFromUrl, htmlToText, lawFingerprint, mainContent, mergeNotices } from "../functions/logic.js";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(APP, "src", "content", "aade-data.ts");
const STATE = join(APP, "scripts", "aade-state.json");
// AADE's list of press releases, pages 1 and 2 (about 30 announcements). Each item has a one-line summary,
// so the check needs only these 2 requests. AADE blocks rapid requests, so it waits between them.
const NEWS_PAGES = ["https://www.aade.gr/deltia-typoy-anakoinoseis", "https://www.aade.gr/deltia-typoy-anakoinoseis?page=1"];
const LAW_URL = "https://www.taxheaven.gr/law/5177/2025/arthro/55";
// Greek accents move (τέλη, τελών, τέλους), so accents are removed before matching.
const plain = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
// What a vehicle owner may need to act on: road tax, myCAR, off-the-road, plates, transfer, registration tax, EVs, motorbikes.
const RELEVANT = [/τελ(η|ων|ους|ος)\s+κυκλοφορ/, /\bmycar\b/, /\bmyauto\b/, /ακινησι/, /πινακιδ/, /μεταβιβασ\w*\s+(του\s+|των\s+)?οχημ/,
  /τελ(ος|ους)\s+ταξινομ/, /ηλεκτρικ\w*\s+(αυτοκινητ|οχημ)/, /μοτοσικλετ/, /(ιδιοκτητ|κατοχ)\w*\s+(ι\.?χ\.?|οχημ|αυτοκινητ)/];
// AADE also announces customs seizures ("κατασχέθηκαν οχήματα…"): not news for owners.
const IGNORE = [/λαθρ/, /κατασχ/, /δεσμευ/, /συλληψ/, /εντοπισ/, /διακινησ/, /ναρκωτ/];
const relevant = (title) => { const t = plain(title); return RELEVANT.some((k) => k.test(t)) && !IGNORE.some((k) => k.test(t)); };
const FIXTURES = process.env.CHECK_FIXTURES; // tests only: a folder of saved pages instead of the internet

async function get(url) {
  if (FIXTURES) {
    const f = join(FIXTURES, url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "_") + ".html");
    if (!existsSync(f)) throw new Error(`no fixture for ${url}`);
    return readFileSync(f, "utf8");
  }
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; teli-kykloforias road-tax checker)", "accept-language": "el" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.text();
}

// aade-data.ts is plain JSON after the "=" sign, so it can be read and written without a TypeScript tool.
const src = readFileSync(DATA, "utf8");
const start = src.indexOf("= {") + 2, end = src.lastIndexOf("}") + 1;
const data = JSON.parse(src.slice(start, end));
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
state.seen ??= []; state.lawFp ??= null; state.failures ??= 0;

const today = athensDate();
const added = [], alerts = [], problems = [];
let newsOk = false;

// Items on a list page: <a href="/deltia-typoy-anakoinoseis/.../deltio-typoy-DDMMYYYY">Δελτίο Τύπου … <div class="subtitle">summary</div></a>
function items(html) {
  const out = new Map();
  for (const m of html.matchAll(/<a\b[^>]*?href="([^"#?]*\/deltia-typoy-anakoinoseis\/[^"#?]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = "https://www.aade.gr" + m[1].replace(/^https?:\/\/(www\.)?aade\.gr/i, "");
    const date = dateFromUrl(url, null);
    if (!date || out.has(url)) continue;
    const sub = (m[2].match(/class="subtitle"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "";
    out.set(url, { url, date, title: htmlToText(sub) || htmlToText(m[2]) });
  }
  return [...out.values()];
}
const pause = (ms) => (FIXTURES ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));

try {
  const firstRun = state.seen.length === 0;
  const all = [];
  for (const [i, page] of NEWS_PAGES.entries()) {
    if (i) await pause(8000);
    try { all.push(...items(await get(page))); } catch (e) { if (!i) throw e; problems.push(`Page 2 skipped: ${e.message}`); }
  }
  if (!all.length) throw new Error("no announcements found on the page (has AADE changed its layout?)");
  newsOk = true;
  for (const it of all) {
    if (state.seen.includes(it.url)) continue;
    state.seen.push(it.url);
    if (firstRun) continue; // the first run only learns what already exists
    if (relevant(it.title)) added.push({ date: it.date, title: it.title.slice(0, 200), url: it.url, source: "aade.gr" });
  }
  state.seen = state.seen.slice(-400);
} catch (e) { problems.push(`Couldn't read AADE's announcements: ${e.message}`); }

try {
  const fp = lawFingerprint(mainContent(await get(LAW_URL)));
  if (state.lawFp && state.lawFp !== fp) alerts.push(`The numbers in the road-tax law article changed: ${LAW_URL}\nCheck the amounts. If they changed, the calculator needs an update (app/src/lib/gov.ts).`);
  state.lawFp = fp;
} catch (e) { problems.push(`Couldn't read the law article: ${e.message}`); }

state.failures = newsOk ? 0 : state.failures + 1;
if (state.failures === 4) alerts.push(`The automatic check couldn't read AADE for two weeks in a row.\n${problems.join("\n")}\nThe site still works with the data it has.`);

if (added.length) data.notices = mergeNotices(data.notices, added).map(({ date, title, url, source }) => ({ date, title, url, source }));
if (newsOk) data.checkedAt = new Date().toISOString().replace(/\.\d+Z$/, "Z");
writeFileSync(DATA, src.slice(0, start) + JSON.stringify(data, null, 2) + src.slice(end));
writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");

// Tell the owner. On GitHub this opens an issue, and GitHub emails it to you.
const lines = [
  ...added.map((n) => `New AADE announcement for vehicle owners (now shown on your site):\n${n.title}\n${n.url}\nIf it changes the deadline or the amounts, the calculator itself still needs an update.`),
  ...alerts,
];
const summary = [`AADE check ${today}: ${added.length} new announcement(s), ${alerts.length} alert(s).`, ...problems].join("\n");
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.replace(/\n/g, "\n\n") + "\n");
if (lines.length) {
  const title = added.length ? `AADE: ${added[0].title}`.slice(0, 120) : "Road-tax site: please check";
  const body = lines.join("\n\n---\n\n");
  if (process.env.GITHUB_ACTIONS) {
    try { execFileSync("gh", ["issue", "create", "--title", title, "--body", body], { stdio: "inherit" }); }
    catch (e) { console.log(`Could not open an issue: ${e.message}\n${body}`); }
  } else console.log(`\n${title}\n${body}`);
}
