/* Pure logic for the backend — no Firebase imports, so it is easy to test (npm test). */
import { createHash } from "node:crypto";

export const KEYWORDS = [/τελ(η|ων|ους|ος)\s+κυκλοφορ/, /mycar/, /ακινησι/];
const plainText = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase(); // Greek accents move: τέλη, τελών, τέλους

/* Today's date in Athens as YYYY-MM-DD. */
export function athensDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function addDays(ymd, n) {
  const d = new Date(`${ymd}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
const dmy = (ymd) => ymd.split("-").reverse().map((x) => String(+x)).join("/");

/* Every 1 November the tax year moves on: deadline 31/12, surcharges from 1 Jan / 1 Feb / 1 Mar.
   These dates are fixed in law (5113/2024); the rates stay as they are unless the law changes. */
export function rollover(gov, today) {
  if (today < `${gov.taxYear}-11-01`) return null;
  const y = gov.taxYear + 1;
  return {
    taxYear: y,
    deadline: `${y - 1}-12-31`,
    stages: [{ from: `${y}-01-01`, pct: 0.25 }, { from: `${y}-02-01`, pct: 0.5 }, { from: `${y}-03-01`, pct: 1 }],
  };
}

/* What to tell people today. Each event has a type that matches an alert preference. */
export function alertsForDate(gov, today) {
  const out = [];
  for (const d of [14, 3, 1]) {
    if (today === addDays(gov.deadline, -d)) out.push({
      type: "deadline", id: `deadline-${gov.taxYear}-${d}`,
      title: d === 1 ? "Αύριο λήγει η προθεσμία για τα τέλη κυκλοφορίας" : d === 3 ? "Σε 3 ημέρες λήγει η προθεσμία για τα τέλη κυκλοφορίας" : `Πλησιάζει η προθεσμία για τα τέλη κυκλοφορίας (${dmy(gov.deadline)})`,
      body: `Πληρώστε έως ${dmy(gov.deadline)} για να μην πληρώσετε προσαύξηση.`,
    });
  }
  if (today === addDays(gov.deadline, -7)) out.push({
    type: "immobilise", id: `immobilise-${gov.taxYear}`,
    title: "Δεν θα κυκλοφορήσετε το όχημα;",
    body: `Δηλώστε ακινησία στο myCAR έως ${dmy(gov.deadline)} και δεν πληρώνετε τέλη για το ${gov.taxYear}.`,
  });
  for (const st of gov.stages || []) {
    if (today === addDays(st.from, -1)) out.push({
      type: "surcharge", id: `surcharge-${st.from}`,
      title: "Αύριο ανεβαίνει η προσαύξηση στα τέλη κυκλοφορίας",
      body: `Από αύριο το ποσό γίνεται +${Math.round(st.pct * 100)}%. Αν πληρώσετε σήμερα, γλιτώνετε τη διαφορά.`,
    });
  }
  return out;
}

/* How long an alert may still go out if it could not be delivered on the day (e.g. the email daily limit was reached).
   Alerts that say "tomorrow" or "in 3 days" only go out on their own day; the rest can catch up. */
export function eventUntil(e, today) {
  if (e.type === "news") return addDays(today, 7);
  if (e.type === "immobilise" || /-14$/.test(e.id || "")) return addDays(today, 3);
  return today;
}
/* Alerts a subscriber still needs: live, wanted, and not delivered to them before. */
export function pendingFor(events, sub, gov) {
  const got = new Set(sub.got || []);
  return eventsForSubscriber(events.filter((e) => !got.has(e.id)), sub, gov);
}

/* Which of today's events a subscriber gets. Paying stops deadline, surcharge and immobilisation alerts. */
export function eventsForSubscriber(events, sub, gov) {
  const paid = sub.paidYear === gov.taxYear;
  return events.filter((e) => sub.prefs?.[e.type] && !(paid && e.type !== "news"));
}
export function personalise(e, sub) {
  if (e.type === "news" || !sub.prefs?.showAmount || !sub.amount) return e;
  const amt = Number(sub.amount).toLocaleString("el-GR", { style: "currency", currency: "EUR" });
  return { ...e, body: `${e.body} Το ποσό σας: ${amt}.` };
}

/* ---------- reading AADE pages (plain HTML, no AI) ---------- */
const decode = (s) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
export function htmlToText(html) { return decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }

/* Remove site chrome (menus repeat "Τέλη Κυκλοφορίας" on every AADE page) and keep the main content. */
export function mainContent(html) {
  let h = html.replace(/<(script|style|noscript|svg|nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, " ");
  h = h.replace(/<(ul|ol|div)\b[^>]*(class|id)="[^"]*(menu|nav|breadcrumb|sidebar|footer|header)[^"]*"[\s\S]*?<\/\1>/gi, " ");
  const m = h.match(/<main\b[\s\S]*?<\/main>/i) || h.match(/<article\b[\s\S]*?<\/article>/i);
  return htmlToText(m ? m[0] : h);
}
export function pageTitle(html) {
  const pick = (re) => { const m = html.match(re); return m ? htmlToText(m[1]) : ""; };
  const h1 = pick(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const sub = pick(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
  const t = h1 && sub && !/δελτίο τύπου/i.test(sub) ? `${sub}` : h1 || pick(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return t.slice(0, 140);
}
export const isRelevant = (text) => KEYWORDS.some((k) => k.test(plainText(text)));

/* Press-release links on AADE's listing page. */
export function releaseLinks(html, base = "https://www.aade.gr") {
  const out = new Set();
  for (const m of html.matchAll(/href="([^"#?]*\/deltia-typoy-anakoinoseis\/[^"#?]+)"/gi)) {
    const href = m[1].startsWith("http") ? m[1] : base + (m[1].startsWith("/") ? "" : "/") + m[1];
    out.add(href.replace(/^https?:\/\/aade\.gr/, "https://www.aade.gr"));
  }
  return [...out];
}
/* "deltio-typoy-02112026" → "2026-11-02" */
export function dateFromUrl(url, fallback) {
  const m = url.match(/(\d{2})(\d{2})(\d{4})(?:-\d+)?\/?$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : fallback;
}
export const sha = (s) => createHash("sha256").update(s).digest("hex");
/* Fingerprint of the law article: only the numbers matter, so wording or layout changes don't trigger alarms. */
export const lawFingerprint = (text) => sha((text.match(/\d+(?:[.,]\d+)?/g) || []).join("|"));

/* Merge new notices in: newest first, no duplicate URLs, at most 20. */
export function mergeNotices(existing, added) {
  const seen = new Set(); const out = [];
  for (const n of [...added, ...existing]) { const k = n.url || n.title; if (seen.has(k)) continue; seen.add(k); out.push(n); }
  return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
}
