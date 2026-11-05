/* Smart alerts: browser/phone push (Firebase Cloud Messaging) or email.
   Works on the deployed site once VITE_FIREBASE_CONFIG + VITE_FIREBASE_VAPID_KEY are set (see SETUP.md).
   No vehicle details are sent: only the alert choices, the tax year and (if the person allows it) the amount. */

const env = ((import.meta as unknown as { env?: Record<string, string> }).env ?? {}) as Record<string, string>;
export const firebaseConfig: Record<string, string> | null = (() => { try { return env.VITE_FIREBASE_CONFIG ? JSON.parse(env.VITE_FIREBASE_CONFIG) : null; } catch { return null; } })();
const vapidKey = env.VITE_FIREBASE_VAPID_KEY;
const apiBase = env.VITE_API_BASE || "/api";
const FB = "https://www.gstatic.com/firebasejs/10.14.1";

export type AlertPrefs = { deadline: boolean; surcharge: boolean; news: boolean; immobilise: boolean; showAmount: boolean };
export const DEFAULT_PREFS: AlertPrefs = { deadline: true, surcharge: true, news: true, immobilise: false, showAmount: false };
export type Subscription = { id: string; secret: string; channel: "push" | "email"; confirmed: boolean; prefs: AlertPrefs };

export type Support = "ok" | "ios-install" | "unsupported" | "not-configured";
export function pushSupport(): Support {
  if (!firebaseConfig || !vapidKey) return "not-configured";
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return "ok";
}
export const emailSupported = () => !!firebaseConfig;

type Payload = { prefs: AlertPrefs; taxYear: number; amount?: number; paid?: boolean };

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(apiBase + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export async function enablePush(p: Payload): Promise<Subscription> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("denied");
  const reg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?config=${encodeURIComponent(JSON.stringify(firebaseConfig))}`);
  const { initializeApp } = await import(/* @vite-ignore */ `${FB}/firebase-app.js`);
  const { getMessaging, getToken } = await import(/* @vite-ignore */ `${FB}/firebase-messaging.js`);
  const app = initializeApp(firebaseConfig!);
  const token: string = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
  const r = await post<{ id: string; secret: string; confirmed: boolean }>("/subscribe", { channel: "push", token, ...p });
  return { ...r, channel: "push", prefs: p.prefs };
}
export async function subscribeEmail(email: string, p: Payload): Promise<Subscription> {
  const r = await post<{ id: string; secret: string; confirmed: boolean }>("/subscribe", { channel: "email", email, ...p });
  return { ...r, channel: "email", prefs: p.prefs };
}
export const updateSubscription = (s: Subscription, patch: Partial<Payload>) => post<{ ok: true }>("/subscription", { id: s.id, secret: s.secret, ...patch });
export const unsubscribe = (s: Subscription) => post<{ ok: true }>("/unsubscribe", { id: s.id, secret: s.secret });

const KEY = "teli.alerts";
export function loadSub(): Subscription | null { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch { return null; } }
export function saveSub(s: Subscription | null) { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); } catch { /* ignore */ } }
