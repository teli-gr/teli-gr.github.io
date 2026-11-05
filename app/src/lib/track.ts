import { gaEvent } from "./consent";

/* Privacy-friendly analytics, no cookies, no personal data.
   - GoatCounter (free for personal sites): the website build puts the code in <meta name="goatcounter">.
   - Plausible (paid): set VITE_PLAUSIBLE_DOMAIN.
   Does nothing when neither is set (e.g. on the Claude page). */
type Plausible = (event: string, opts?: { props?: Record<string, string | number> }) => void;
type Goat = { count?: (o: { path: string; title?: string; event?: boolean }) => void };
const w = () => window as unknown as { plausible?: Plausible; goatcounter?: Goat };
const sent = new Set<string>();
const queue: string[] = [];

function goatCode(): string {
  if (typeof document === "undefined") return "";
  const c = document.querySelector<HTMLMetaElement>('meta[name="goatcounter"]')?.content?.trim() || "";
  return /^[a-z0-9-]+$/i.test(c) ? c : ""; // ignores empty values and unfilled placeholders
}

export function track(event: string, props?: Record<string, string | number>, once = false) {
  if (once) { if (sent.has(event)) return; sent.add(event); }
  try { w().plausible?.(event, props ? { props } : undefined); } catch { /* ignore */ }
  gaEvent(event, props);
  const path = [event, ...Object.values(props ?? {})].join("-");
  try { const g = w().goatcounter; if (g?.count) g.count({ path, title: event, event: true }); else if (goatCode()) queue.push(path); } catch { /* ignore */ }
}

/* JavaScript errors on visitors' phones show up in GoatCounter as js_error-… (message only, max 5 per visit). */
export function watchErrors() {
  if (typeof window === "undefined") return;
  const seen = new Set<string>();
  const send = (m: unknown) => {
    const k = String((m as { message?: string })?.message ?? m ?? "").replace(/[^\w .:()-]/g, "").trim().slice(0, 60);
    if (!k || seen.has(k) || seen.size >= 5) return;
    seen.add(k); track("js_error", { m: k });
  };
  window.addEventListener("error", (e) => send(e.message || e.error));
  window.addEventListener("unhandledrejection", (e) => send(e.reason));
}

export function loadAnalytics() {
  if (typeof document === "undefined") return;
  const code = goatCode();
  if (code) {
    const s = document.createElement("script");
    s.async = true; s.src = "https://gc.zgo.at/count.js"; s.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
    s.onload = () => { const g = w().goatcounter; while (queue.length && g?.count) { const p = queue.shift()!; g.count({ path: p, title: p, event: true }); } };
    document.head.appendChild(s);
  }
  const domain = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_PLAUSIBLE_DOMAIN;
  if (!domain) return;
  const s = document.createElement("script");
  s.defer = true; s.dataset.domain = domain; s.src = "https://plausible.io/js/script.tagged-events.js";
  document.head.appendChild(s);
  (window as unknown as { plausible?: unknown }).plausible ??= function (...a: unknown[]) { ((window as any).plausible.q = (window as any).plausible.q || []).push(a); };
}
