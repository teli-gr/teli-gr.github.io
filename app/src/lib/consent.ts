/* Visitor counting, ONLY after the visitor says yes (Greek DPA 2020 + EDPB 2/2023: counting needs prior consent,
   even without cookies; «Όχι» as easy as «Ναι»; the choice can be changed any time in «Απόρρητο»).
   - GoatCounter (no cookies, EU servers): code from <meta name="goatcounter"> (settings.json).
   - Google Analytics 4 (sets cookies): ID from <meta name="ga-id">. Not used now.
   No code set = no question, nothing loads.
   A browser that sends Global Privacy Control or Do Not Track counts as «Όχι», and we don't ask. */
const KEY = "teli.consent";
export type Consent = "granted" | "denied";
type G = { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void } & Record<string, unknown>;
const w = () => window as unknown as G;
const meta = (name: string) => (typeof document === "undefined" ? "" : document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content?.trim() || "");

export function goatCode(): string { const c = meta("goatcounter"); return /^[a-z0-9-]+$/i.test(c) ? c : ""; } // ignores unfilled placeholders
export function gaId(): string { const v = meta("ga-id"); return /^G-[A-Z0-9]{4,}$/.test(v) ? v : ""; }
export function contactEmail(): string { const v = meta("contact"); return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(v) ? v : ""; }
/** Is any visitor counter set up? If not, there's nothing to ask. */
export function hasStats(): boolean { return !!(goatCode() || gaId()); }
/** The browser already says "don't track me" (Global Privacy Control or Do Not Track). */
export function browserSaysNo(): boolean {
  if (typeof navigator === "undefined") return false;
  const n = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  return n.globalPrivacyControl === true || n.doNotTrack === "1" || n.msDoNotTrack === "1" || (window as unknown as { doNotTrack?: string }).doNotTrack === "1";
}
const AT = "teli.consent.at", YEAR = 365 * 24 * 3600 * 1000;
/* The choice is kept for 12 months, then we ask again. */
export function getConsent(): Consent | null {
  if (browserSaysNo()) return "denied";
  try {
    const v = localStorage.getItem(KEY), at = Number(localStorage.getItem(AT) || 0);
    if (v !== "granted" && v !== "denied") return null;
    if (!at || Date.now() - at > YEAR) { localStorage.removeItem(KEY); localStorage.removeItem(AT); return null; }
    return v;
  } catch { return null; }
}
export const counting = () => getConsent() === "granted";

/* ---- loading the counters (only after «Ναι») ---- */
type Goat = { count?: (o: { path: string; title?: string; event?: boolean }) => void };
const queue: string[] = [];
let goatLoaded = false, gaLoaded = false;
export function goat(): Goat | undefined { return (window as unknown as { goatcounter?: Goat }).goatcounter; }
export function queueGoat(path: string) { if (goatCode() && queue.length < 30) queue.push(path); }

function loadGoat(code: string) {
  if (goatLoaded) return; goatLoaded = true;
  const s = document.createElement("script");
  s.async = true; s.src = "https://gc.zgo.at/count.js"; s.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  s.onload = () => { const g = goat(); while (queue.length && g?.count) { const p = queue.shift()!; g.count({ path: p, title: p, event: true }); } };
  document.head.appendChild(s);
}
function loadGA(id: string) {
  w()[`ga-disable-${id}`] = false;
  if (gaLoaded) return; gaLoaded = true;
  const g = w(); g.dataLayer = g.dataLayer || [];
  g.gtag = function () { (g.dataLayer as unknown[]).push(arguments); }; // eslint-disable-line prefer-rest-params
  g.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  g.gtag("js", new Date());
  g.gtag("config", id, { cookie_expires: 60 * 60 * 24 * 395, allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement("script"); s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
}
export function clearGA() {
  const id = gaId(); if (!id) return;
  w()[`ga-disable-${id}`] = true;
  const host = location.hostname, parts = host.split(".");
  const domains = ["", host, ...parts.map((_, i) => "." + parts.slice(i).join(".")).slice(0, -1)];
  for (const c of document.cookie.split(";").map((x) => x.split("=")[0].trim()).filter((n) => n === "_ga" || n.startsWith("_ga_"))) {
    for (const d of domains) document.cookie = `${c}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
  }
}
function start() {
  if (!counting()) return;
  const code = goatCode(); if (code) loadGoat(code);
  const id = gaId(); if (id) loadGA(id);
}

const listeners = new Set<() => void>();
export function onConsentChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function setConsent(v: Consent) {
  try { localStorage.setItem(KEY, v); localStorage.setItem(AT, String(Date.now())); } catch { /* ignore */ }
  if (v === "granted") start(); else { queue.length = 0; clearGA(); }
  listeners.forEach((fn) => fn());
}
/* On page load: start the counters only if the visitor already said yes. */
export function initConsent() { start(); }
export function gaEvent(event: string, props?: Record<string, string | number>) {
  if (!gaLoaded || !counting()) return;
  try { w().gtag?.("event", event, props ?? {}); } catch { /* ignore */ }
}

/* «Διαγραφή από αυτή τη συσκευή»: removes everything this site saved in the browser, then reloads. */
export function eraseLocal() {
  for (const store of [localStorage, sessionStorage]) {
    try { Object.keys(store).filter((k) => k.startsWith("teli.")).forEach((k) => store.removeItem(k)); } catch { /* ignore */ }
  }
  clearGA();
  location.reload();
}
