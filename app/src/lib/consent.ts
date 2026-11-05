/* Google Analytics 4, loaded ONLY after the visitor presses «Αποδοχή» (Greek DPA / GDPR: prior consent,
   rejecting as easy as accepting, consent can be withdrawn any time). Ads features stay off.
   The measurement ID comes from <meta name="ga-id"> (filled in by deploy.sh). No ID = no banner, nothing loads. */
const KEY = "teli.consent";
export type Consent = "granted" | "denied";
type G = { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void } & Record<string, unknown>;
const w = () => window as unknown as G;

export function gaId(): string {
  if (typeof document === "undefined") return "";
  const v = document.querySelector<HTMLMetaElement>('meta[name="ga-id"]')?.content?.trim() || "";
  return /^G-[A-Z0-9]{4,}$/.test(v) ? v : "";
}
export function contactEmail(): string {
  const v = document.querySelector<HTMLMetaElement>('meta[name="contact"]')?.content?.trim() || "";
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(v) ? v : "";
}
export function getConsent(): Consent | null {
  try { const v = localStorage.getItem(KEY); return v === "granted" || v === "denied" ? v : null; } catch { return null; }
}

let loaded = false;
function loadGA(id: string) {
  w()[`ga-disable-${id}`] = false;
  if (loaded) return; loaded = true;
  const g = w(); g.dataLayer = g.dataLayer || [];
  g.gtag = function () { (g.dataLayer as unknown[]).push(arguments); }; // eslint-disable-line prefer-rest-params
  g.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  g.gtag("js", new Date());
  g.gtag("config", id, { cookie_expires: 60 * 60 * 24 * 395, allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement("script"); s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
}
function clearGA(id: string) {
  w()[`ga-disable-${id}`] = true;
  const host = location.hostname, parts = host.split(".");
  const domains = ["", host, ...parts.map((_, i) => "." + parts.slice(i).join(".")).slice(0, -1)];
  for (const c of document.cookie.split(";").map((x) => x.split("=")[0].trim()).filter((n) => n === "_ga" || n.startsWith("_ga_"))) {
    for (const d of domains) document.cookie = `${c}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
  }
}

const listeners = new Set<() => void>();
export function onConsentChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function setConsent(v: Consent) {
  try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
  const id = gaId(); if (id) { if (v === "granted") loadGA(id); else clearGA(id); }
  listeners.forEach((fn) => fn());
}
/* On page load: start GA only if the visitor already said yes. */
export function initConsent() { const id = gaId(); if (id && getConsent() === "granted") loadGA(id); }
export function gaEvent(event: string, props?: Record<string, string | number>) {
  if (!loaded || getConsent() !== "granted") return;
  try { w().gtag?.("event", event, props ?? {}); } catch { /* ignore */ }
}
