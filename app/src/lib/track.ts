import { counting, gaEvent, goat, goatCode, queueGoat } from "./consent";

/* Usage counting with GoatCounter (no cookies, EU servers). Sends nothing unless the visitor said yes
   (see consent.ts). The one exception is answer(): a vote the visitor sends on purpose. */
const sent = new Set<string>();
const pathOf = (event: string, props?: Record<string, string | number>) => [event, ...Object.values(props ?? {})].join("-");

export function track(event: string, props?: Record<string, string | number>, once = false) {
  if (!counting()) return;
  if (once) { if (sent.has(event)) return; sent.add(event); }
  gaEvent(event, props);
  const path = pathOf(event, props);
  try { const g = goat(); if (g?.count) g.count({ path, title: event, event: true }); else queueGoat(path); } catch { /* ignore */ }
}

/* A vote the visitor clicks on purpose («Να το φτιάξουμε; Ναι/Όχι»). Sending it is what they asked for,
   so it goes even without consent to counting: only the answer, as a plain request with no script,
   no cookies, no screen size and no page address. */
export function answer(event: string, props?: Record<string, string | number>) {
  if (counting()) return track(event, props);
  const code = goatCode(); if (!code) return;
  const path = pathOf(event, props);
  try {
    const img = new Image(); img.referrerPolicy = "no-referrer";
    img.src = `https://${code}.goatcounter.com/count?p=${encodeURIComponent(path)}&t=${encodeURIComponent(event)}&e=true&rnd=${Math.random().toString(36).slice(2, 8)}`;
  } catch { /* ignore */ }
}

/* JavaScript errors on visitors' phones show up in GoatCounter as js_error-… (message only, max 5 per visit, only with consent). */
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
