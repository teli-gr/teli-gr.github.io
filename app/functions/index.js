/* Τέλη Κυκλοφορίας — backend (Firebase Cloud Functions v2, plain code, no AI).
   - api:        /api/gov (official data for the app), /api/subscribe, /api/subscription, /api/unsubscribe, /api/confirm
   - checkGov:   Mon + Thu 09:30 Athens. Rolls the tax year on 1 Nov, reads AADE press releases, watches the law article.
   - sendAlerts: every day 10:00 Athens. Deadline / surcharge / immobilisation / AADE-news alerts by push or email. */
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import * as L from "./logic.js";

initializeApp();
const db = getFirestore();
const REGION = "europe-west1";
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");           // set to "off" to disable email
const SITE_URL = defineString("SITE_URL", { default: "" });       // e.g. https://teli-kykloforias.gr
const ADMIN_EMAIL = defineString("ADMIN_EMAIL", { default: "" }); // where change reports go
const MAIL_FROM = defineString("MAIL_FROM", { default: "Τέλη Κυκλοφορίας <alerts@example.com>" });
const NEWS_URL = defineString("NEWS_URL", { default: "https://www.aade.gr/deltia-typoy-anakoinoseis" });
const LAW_URL = defineString("LAW_URL", { default: "https://www.taxheaven.gr/law/5177/2025/arthro/55" });
const SEED = JSON.parse(readFileSync(new URL("./seed/gov.json", import.meta.url), "utf8"));

/* ---------- helpers ---------- */
const site = () => SITE_URL.value().replace(/\/$/, "");
async function govDoc() {
  const ref = db.doc("gov/current"); const snap = await ref.get();
  if (snap.exists) return { ref, gov: snap.data() };
  await ref.set({ ...SEED, checkedAt: new Date().toISOString(), changelog: [{ at: new Date().toISOString(), note: "Αρχικά στοιχεία" }] });
  return { ref, gov: (await ref.get()).data() };
}
async function fetchText(url) {
  const r = await fetch(url, { headers: { "user-agent": `Mozilla/5.0 (compatible; TeliKykloforias/1.0; ${site() || "road-tax checker"})`, "accept-language": "el" }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.text();
}
const mailOn = () => { const k = RESEND_API_KEY.value(); return k && k !== "off"; };
/* Returns "ok", "quota" (Resend free plan: 100 emails a day) or "fail". */
async function sendMail(to, subject, html, unsubscribeUrl) {
  if (!mailOn() || !to) return "fail";
  const body = JSON.stringify({ from: MAIL_FROM.value(), to, subject, html, ...(unsubscribeUrl ? { headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` } } : {}) });
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${RESEND_API_KEY.value()}`, "content-type": "application/json" }, body });
    if (r.ok) return "ok";
    const text = await r.text();
    if (r.status === 429 && /daily_quota/.test(text)) return "quota";
    if (r.status === 429 && attempt === 0) { await new Promise((ok) => setTimeout(ok, 1100)); continue; } // 10 requests/second limit
    console.warn("mail failed", r.status, text); return "fail";
  }
  return "fail";
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const page = (title, text) => `<!doctype html><html lang="el"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;line-height:1.5;color:#0b1220"><h1 style="font-size:1.5rem">${esc(title)}</h1><p>${esc(text)}</p><p><a href="${esc(site() || "/")}">Πίσω στον υπολογισμό</a></p></body></html>`;
const mailHtml = (e, unsub) => `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#0b1220;max-width:32rem">
<p style="font-size:18px;font-weight:700">${esc(e.title)}</p><p>${esc(e.body)}</p>
<p><a href="${esc(e.link || site() || "https://www.aade.gr/mycar")}" style="display:inline-block;background:#3ee38a;color:#04140b;font-weight:700;padding:12px 18px;border-radius:10px;text-decoration:none">${e.link ? "Διαβάστε περισσότερα" : "Άνοιγμα"}</a></p>
<p style="font-size:13px;color:#5b6676">Δεν είμαστε η ΑΑΔΕ και δεν ζητάμε ποτέ πληρωμή ή κωδικούς με email. <a href="${esc(unsub)}">Διαγραφή από τις ειδοποιήσεις</a></p></div>`;

/* ---------- api ---------- */
const PREF_KEYS = ["deadline", "surcharge", "news", "immobilise", "showAmount"];
function cleanPrefs(p) { const o = {}; for (const k of PREF_KEYS) o[k] = !!(p && p[k]); return o; }
function cleanAmount(a) { const n = Number(a); return Number.isFinite(n) && n >= 0 && n < 10000 ? Math.round(n * 100) / 100 : null; }
async function authed(body) {
  if (typeof body?.id !== "string" || typeof body?.secret !== "string" || !/^[a-f0-9]{32}$/.test(body.id)) return null;
  const ref = db.doc(`subscribers/${body.id}`); const snap = await ref.get();
  return snap.exists && snap.data().secretHash === L.sha(body.secret) ? { ref, sub: snap.data() } : null;
}

export const api = onRequest({ region: REGION, secrets: [RESEND_API_KEY], maxInstances: 5, memory: "256MiB" }, async (req, res) => {
  const path = req.path.replace(/^\/api/, "") || "/";
  try {
    if (req.method === "GET" && path === "/gov") {
      const { gov } = await govDoc();
      const { changelog, ...pub } = gov;
      res.set("Cache-Control", "public, max-age=900, s-maxage=900").json({ ...pub, notices: (pub.notices || []).map(({ notified, ...n }) => n) });
      return;
    }
    if (req.method === "POST" && path === "/subscribe") {
      const b = req.body || {};
      const channel = b.channel === "email" ? "email" : b.channel === "push" ? "push" : null;
      const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
      const token = typeof b.token === "string" ? b.token : "";
      if (!channel || (channel === "email" && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) || (channel === "push" && (token.length < 20 || token.length > 4096))) { res.status(400).send("Bad request"); return; }
      if (channel === "email" && !mailOn()) { res.status(503).send("Email alerts are off"); return; }
      const id = L.sha(`${channel}:${channel === "email" ? email : token}`).slice(0, 32);
      const secret = randomBytes(24).toString("hex");
      const ref = db.doc(`subscribers/${id}`); const prev = await ref.get();
      const confirmed = channel === "push" || (prev.exists && prev.data().confirmed === true);
      const taxYear = Number(b.taxYear) || null; const amount = cleanAmount(b.amount);
      await ref.set({
        channel, ...(channel === "email" ? { email, unsubToken: prev.exists && prev.data().unsubToken ? prev.data().unsubToken : randomBytes(16).toString("hex") } : { token }), prefs: cleanPrefs(b.prefs), taxYear,
        amount: amount ?? FieldValue.delete(), paidYear: b.paid && taxYear ? taxYear : FieldValue.delete(),
        confirmed, secretHash: L.sha(secret), updatedAt: new Date().toISOString(), ...(prev.exists ? {} : { createdAt: new Date().toISOString() }),
      }, { merge: true });
      if (channel === "email" && !confirmed) {
        const link = `${site()}/api/confirm?id=${id}&t=${secret}`;
        await sendMail(email, "Επιβεβαιώστε τις ειδοποιήσεις για τα τέλη κυκλοφορίας",
          `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;max-width:32rem"><p>Πατήστε για να ξεκινήσουν οι ειδοποιήσεις για τα τέλη κυκλοφορίας:</p><p><a href="${esc(link)}" style="display:inline-block;background:#3ee38a;color:#04140b;font-weight:700;padding:12px 18px;border-radius:10px;text-decoration:none">Επιβεβαίωση</a></p><p style="font-size:13px;color:#5b6676">Αν δεν το ζητήσατε εσείς, αγνοήστε αυτό το email.</p></div>`);
      }
      res.json({ id, secret, confirmed });
      return;
    }
    if (req.method === "POST" && path === "/subscription") {
      const a = await authed(req.body); if (!a) { res.status(403).send("Forbidden"); return; }
      const b = req.body; const patch = { updatedAt: new Date().toISOString() };
      if (b.prefs) patch.prefs = cleanPrefs(b.prefs);
      if ("amount" in b) patch.amount = cleanAmount(b.amount) ?? FieldValue.delete();
      if ("paid" in b) patch.paidYear = b.paid ? Number(b.taxYear) || a.sub.taxYear : FieldValue.delete();
      if (b.taxYear) patch.taxYear = Number(b.taxYear);
      await a.ref.update(patch); res.json({ ok: true }); return;
    }
    if (req.method === "POST" && path === "/unsubscribe") {
      const a = await authed(req.body); if (a) await a.ref.delete();
      res.json({ ok: true }); return;
    }
    if (req.method === "GET" && (path === "/confirm" || path === "/unsubscribe")) {
      const qid = String(req.query.id || ""), qt = String(req.query.t || "");
      let a = await authed({ id: qid, secret: qt });
      if (!a && path === "/unsubscribe" && /^[a-f0-9]{32}$/.test(qid) && qt) { const r = db.doc(`subscribers/${qid}`); const sn = await r.get(); if (sn.exists && sn.data().unsubToken === qt) a = { ref: r, sub: sn.data() }; }
      if (!a) { res.status(400).send(page("Ο σύνδεσμος δεν ισχύει", "Ίσως έχει ήδη χρησιμοποιηθεί. Δοκιμάστε ξανά από τη σελίδα.")); return; }
      if (path === "/confirm") { await a.ref.update({ confirmed: true }); res.send(page("Έτοιμο", "Οι ειδοποιήσεις για τα τέλη κυκλοφορίας ξεκίνησαν.")); }
      else { await a.ref.delete(); res.send(page("Διαγραφήκατε", "Δεν θα λάβετε άλλες ειδοποιήσεις.")); }
      return;
    }
    res.status(404).send("Not found");
  } catch (e) { console.error(e); res.status(500).send("Error"); }
});

/* ---------- checkGov: look for new official information and store it ---------- */
export const checkGov = onSchedule({ region: REGION, schedule: "30 9 * * 1,4", timeZone: "Europe/Athens", secrets: [RESEND_API_KEY], timeoutSeconds: 300, memory: "256MiB" }, async () => {
  const { ref, gov } = await govDoc();
  const metaRef = db.doc("gov/meta"); const metaSnap = await metaRef.get();
  const meta = metaSnap.exists ? metaSnap.data() : { seen: [], lawFp: null };
  const today = L.athensDate(); const changes = []; const patch = {};

  const roll = L.rollover(gov, today);
  if (roll) { Object.assign(patch, roll); changes.push(`Νέα χρονιά τελών: ${roll.taxYear}, προθεσμία ${roll.deadline}`); }

  const added = [];
  try {
    const firstRun = !meta.seen?.length;
    const links = L.releaseLinks(await fetchText(NEWS_URL.value())).filter((u) => !meta.seen.includes(u));
    for (const url of links.slice(0, 15)) {
      meta.seen.push(url);
      if (firstRun) continue; // the first run only learns what already exists
      try {
        const html = await fetchText(url);
        if (L.isRelevant(L.mainContent(html))) added.push({ date: L.dateFromUrl(url, today), title: L.pageTitle(html) || "Ανακοίνωση ΑΑΔΕ για τα τέλη κυκλοφορίας", url, source: "aade.gr", notified: false });
      } catch (e) { console.warn("skip", url, e.message); }
    }
    meta.seen = meta.seen.slice(-400);
  } catch (e) { console.warn("news check failed", e.message); changes.push(`Δεν διαβάστηκαν τα νέα της ΑΑΔΕ (${e.message})`); }
  if (added.length) { patch.notices = L.mergeNotices(gov.notices || [], added); changes.push(`${added.length} νέα ανακοίνωση(εις) ΑΑΔΕ`); }

  try {
    const fp = L.lawFingerprint(L.mainContent(await fetchText(LAW_URL.value())));
    if (meta.lawFp && meta.lawFp !== fp) {
      await db.doc("gov/review").set({ at: new Date().toISOString(), url: LAW_URL.value(), note: "Άλλαξαν αριθμοί στο άρθρο του νόμου. Ελέγξτε τα ποσά και ενημερώστε το gov/current." });
      changes.push("ΠΡΟΣΟΧΗ: άλλαξαν αριθμοί στο άρθρο του νόμου. Χρειάζεται έλεγχος των ποσών.");
    }
    meta.lawFp = fp;
  } catch (e) { console.warn("law check failed", e.message); changes.push(`Δεν διαβάστηκε ο νόμος (${e.message})`); }

  const alertsRef = db.doc("gov/alerts"); const alertsSnap = await alertsRef.get();
  if (alertsSnap.exists && !alertsSnap.data().reported) {
    changes.push(`ΠΡΟΣΟΧΗ: ${alertsSnap.data().missed} email ειδοποιήσεις δεν στάλθηκαν στις ${alertsSnap.data().at} λόγω ορίου του Resend. Αναβαθμίστε σε Pro.`);
    await alertsRef.update({ reported: true });
  }

  const at = new Date().toISOString();
  patch.checkedAt = at;
  patch.changelog = [...(gov.changelog || []), { at, note: changes.join(" · ") || "Καμία αλλαγή" }].slice(-20);
  await ref.update(patch); await metaRef.set(meta);
  if (changes.length && ADMIN_EMAIL.value()) await sendMail(ADMIN_EMAIL.value(), `Τέλη κυκλοφορίας: ${changes.length} ενημέρωση(εις)`, `<ul>${changes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><p>${added.map((n) => `<a href="${esc(n.url)}">${esc(n.title)}</a>`).join("<br>")}</p>`);
  console.log({ today, changes, added: added.length });
});

/* ---------- sendAlerts: smart alerts, each delivered once per person ---------- */
export const sendAlerts = onSchedule({ region: REGION, schedule: "0 10 * * *", timeZone: "Europe/Athens", secrets: [RESEND_API_KEY], timeoutSeconds: 540, memory: "512MiB" }, async () => {
  const { ref, gov } = await govDoc();
  const today = L.athensDate();
  const todays = L.alertsForDate(gov, today);
  const news = (gov.notices || []).filter((n) => n.notified === false);
  for (const n of news) todays.push({ type: "news", id: `news-${L.sha(n.url || n.title).slice(0, 16)}`, title: "Νέα από την ΑΑΔΕ για τα τέλη κυκλοφορίας", body: n.title, link: n.url });

  // store today's alerts with an end date, so anyone missed today (e.g. email limit) gets them on a later run
  for (const e of todays) { const s = db.doc(`events/${e.id}`); if (!(await s.get()).exists) await s.set({ ...e, created: today, until: L.eventUntil(e, today) }); }
  if (news.length) await ref.update({ notices: gov.notices.map((n) => ({ ...n, notified: true })) });
  const live = (await db.collection("events").where("until", ">=", today).get()).docs.map((d) => d.data());
  if (!live.length) { console.log({ today, live: 0 }); return; }

  let last = null, push = 0, mail = 0, removed = 0, missed = 0, quota = false;
  for (;;) {
    let q = db.collection("subscribers").where("confirmed", "==", true).orderBy("__name__").limit(300);
    if (last) q = q.startAfter(last);
    const pageSnap = await q.get(); if (pageSnap.empty) break; last = pageSnap.docs[pageSnap.docs.length - 1];
    for (const doc of pageSnap.docs) {
      const sub = doc.data();
      const mine = L.pendingFor(live, sub, gov).map((e) => L.personalise(e, sub));
      for (const e of mine) {
        const link = e.link || site() || "https://www.aade.gr/mycar";
        let done = false;
        if (sub.channel === "push") {
          try {
            await getMessaging().send({ token: sub.token, notification: { title: e.title, body: e.body }, data: { link },
              webpush: { notification: { icon: site() ? `${site()}/icon-192.png` : undefined, lang: "el" }, ...(link.startsWith("https://") ? { fcmOptions: { link } } : {}) } });
            push++; done = true;
          } catch (err) {
            if (["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(err?.errorInfo?.code || err?.code)) { await doc.ref.delete(); removed++; break; }
            console.warn("push failed", err?.code || err?.message);
          }
        } else if (sub.channel === "email") {
          if (quota) { missed++; continue; }
          const unsub = `${site()}/api/unsubscribe?id=${doc.id}&t=${sub.unsubToken}`;
          const r = await sendMail(sub.email, e.title, mailHtml(e, unsub), unsub);
          if (r === "ok") { mail++; done = true; } else if (r === "quota") { quota = true; missed++; }
        }
        if (done) await doc.ref.update({ got: FieldValue.arrayUnion(e.id) });
      }
    }
  }
  if (missed) await db.doc("gov/alerts").set({ at: today, missed, note: "Έφτασε το ημερήσιο όριο email του Resend (δωρεάν πλάνο: 100/ημέρα)." });
  console.log({ today, live: live.map((e) => e.id), push, mail, removed, missed });
});
