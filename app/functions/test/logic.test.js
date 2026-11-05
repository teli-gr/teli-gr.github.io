import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, alertsForDate, athensDate, dateFromUrl, eventUntil, eventsForSubscriber, pendingFor, isRelevant, lawFingerprint, mainContent, mergeNotices, pageTitle, personalise, releaseLinks, rollover } from "../logic.js";

const gov = { taxYear: 2027, deadline: "2026-12-31", stages: [{ from: "2027-01-01", pct: 0.25 }, { from: "2027-02-01", pct: 0.5 }, { from: "2027-03-01", pct: 1 }] };

test("dates", () => {
  assert.equal(addDays("2026-12-31", -14), "2026-12-17");
  assert.equal(addDays("2027-03-01", -1), "2027-02-28");
  assert.equal(athensDate(new Date("2026-12-30T23:30:00Z")), "2026-12-31"); // Athens is UTC+2
});
test("deadline alerts at 14, 3, 1 days and immobilisation at 7", () => {
  assert.equal(alertsForDate(gov, "2026-12-17")[0].type, "deadline");
  assert.equal(alertsForDate(gov, "2026-12-24")[0].type, "immobilise");
  assert.equal(alertsForDate(gov, "2026-12-28")[0].type, "deadline");
  assert.match(alertsForDate(gov, "2026-12-30")[0].title, /Αύριο/);
  assert.equal(alertsForDate(gov, "2026-12-20").length, 0);
});
test("surcharge eve alerts", () => {
  assert.equal(alertsForDate(gov, "2026-12-31")[0].type, "surcharge");
  assert.match(alertsForDate(gov, "2027-02-28")[0].body, /\+100%/);
});
test("paid people only get news", () => {
  const ev = [...alertsForDate(gov, "2026-12-30"), { type: "news", title: "x", body: "y" }];
  const sub = { prefs: { deadline: true, news: true, surcharge: true }, paidYear: 2027 };
  assert.deepEqual(eventsForSubscriber(ev, sub, gov).map((e) => e.type), ["news"]);
  assert.equal(eventsForSubscriber(ev, { ...sub, paidYear: undefined }, gov).length, 2);
});
test("amount only when allowed", () => {
  const e = { type: "deadline", title: "t", body: "b." };
  assert.equal(personalise(e, { prefs: { showAmount: false }, amount: 162 }).body, "b.");
  assert.match(personalise(e, { prefs: { showAmount: true }, amount: 162 }).body, /162,00/);
});
test("rollover on 1 November", () => {
  assert.equal(rollover(gov, "2027-10-31"), null);
  assert.deepEqual(rollover(gov, "2027-11-01"), { taxYear: 2028, deadline: "2027-12-31", stages: [{ from: "2028-01-01", pct: 0.25 }, { from: "2028-02-01", pct: 0.5 }, { from: "2028-03-01", pct: 1 }] });
});
test("AADE page parsing ignores the menu", () => {
  const page = `<html><head><title>ΑΑΔΕ</title></head><body><nav><a>Τέλη Kυκλοφορίας - Ακινησία οχημάτων</a></nav>
    <ul class="main-menu"><li>Τέλη κυκλοφορίας</li></ul><main><h1>Δελτίο Τύπου 02/11/2026</h1><h2>myAADE: Δηλώσεις Pillar II</h2><p>Κείμενο για φόρο.</p></main></body></html>`;
  assert.equal(isRelevant(mainContent(page)), false);
  const road = page.replace("Κείμενο για φόρο.", "Αναρτήθηκαν τα ειδοποιητήρια των τελών κυκλοφορίας στο myCAR.").replace("myAADE: Δηλώσεις Pillar II", "Τέλη κυκλοφορίας 2028");
  assert.equal(isRelevant(mainContent(road)), true);
  assert.equal(pageTitle(road), "Τέλη κυκλοφορίας 2028");
});
test("release links and dates", () => {
  const list = `<a href="/deltia-typoy-anakoinoseis/deltio-typoy-02112026">a</a><a href="https://aade.gr/deltia-typoy-anakoinoseis/deltio-typoy-30102026-1">b</a><a href="/other">c</a>`;
  const links = releaseLinks(list);
  assert.deepEqual(links, ["https://www.aade.gr/deltia-typoy-anakoinoseis/deltio-typoy-02112026", "https://www.aade.gr/deltia-typoy-anakoinoseis/deltio-typoy-30102026-1"]);
  assert.equal(dateFromUrl(links[0]), "2026-11-02");
  assert.equal(dateFromUrl(links[1]), "2026-10-30");
});
test("law fingerprint only reacts to numbers", () => {
  assert.equal(lawFingerprint("Έως 300 22 ευρώ"), lawFingerprint("έως   300 cc: 22 €"));
  assert.notEqual(lawFingerprint("300 22"), lawFingerprint("300 25"));
});
test("notices merge without duplicates", () => {
  const m = mergeNotices([{ date: "2026-11-02", title: "a", url: "u1" }], [{ date: "2026-11-05", title: "b", url: "u2" }, { date: "2026-11-02", title: "a", url: "u1" }]);
  assert.deepEqual(m.map((n) => n.url), ["u2", "u1"]);
});

test("missed alerts can catch up only when the wording still holds", () => {
  const d14 = alertsForDate(gov, "2026-12-17")[0], d1 = alertsForDate(gov, "2026-12-30")[0];
  assert.match(d14.title, /31\/12/);
  assert.equal(eventUntil(d14, "2026-12-17"), "2026-12-20");
  assert.equal(eventUntil(d1, "2026-12-30"), "2026-12-30");
  assert.equal(eventUntil({ type: "news", id: "news-x" }, "2026-12-01"), "2026-12-08");
});
test("each person gets each alert once", () => {
  const ev = [{ type: "deadline", id: "deadline-2027-14" }, { type: "news", id: "news-a" }];
  const sub = { prefs: { deadline: true, news: true } };
  assert.equal(pendingFor(ev, sub, gov).length, 2);
  assert.deepEqual(pendingFor(ev, { ...sub, got: ["deadline-2027-14"] }, gov).map((e) => e.id), ["news-a"]);
});
