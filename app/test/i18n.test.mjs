/* Every language has the same keys, the same list lengths, and every text function returns text. */
import { el } from "../src/i18n/el.ts";
import { en } from "../src/i18n/en.ts";
import { zh } from "../src/i18n/zh.ts";
import { ru } from "../src/i18n/ru.ts";
import { sq } from "../src/i18n/sq.ts";
let fails = 0;
const sample = [3, 2027, "x", 5, 1];
function walk(a, b, path, lang) {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) { console.log(`FAIL ${lang}: ${path} type ${typeof a} vs ${typeof b}`); fails++; return; }
  if (path === "gov") return; // translations of official Greek text: any subset is fine
  if (Array.isArray(a)) { if (a.length !== b.length) { console.log(`FAIL ${lang}: ${path} length ${a.length} vs ${b.length}`); fails++; } a.forEach((x, i) => walk(x, b[i], `${path}[${i}]`, lang)); return; }
  if (typeof a === "function") {
    for (const args of [[1, "a", "b", "c", "u"], [2027, "31/12/2026", "x", "y", "u"], [3, "x", "y", "z", "u"], [21, "x", "y", "z", "u"], ["car", "2019", 0, "z", "u"], ["moto", null, 1, "z", "u"]]) {
      let out; try { out = b(...args); } catch (e) { console.log(`FAIL ${lang}: ${path}() throws ${e.message}`); fails++; break; }
      const ok = typeof out === "string" || (Array.isArray(out) && out.every((x) => typeof x === "string"));
      if (!ok || (typeof out === "string" && /undefined|NaN|\[object/.test(out))) { console.log(`FAIL ${lang}: ${path}() -> ${JSON.stringify(out)}`); fails++; break; }
    }
    return;
  }
  if (a && typeof a === "object") {
    const ka = Object.keys(a).sort().join(","), kb = Object.keys(b).sort().join(",");
    if (ka !== kb) { console.log(`FAIL ${lang}: ${path} keys differ\n  el: ${ka}\n  ${lang}: ${kb}`); fails++; }
    for (const k of Object.keys(a)) if (k in b) walk(a[k], b[k], path ? `${path}.${k}` : k, lang);
    return;
  }
  if (typeof b === "string" && b.trim() === "" && !["inGreekTag"].includes(path)) { console.log(`FAIL ${lang}: ${path} empty`); fails++; }
}
for (const [lang, d] of Object.entries({ en, sq, zh, ru })) walk(el, d, "", lang);
// Russian plurals
const ok = (c, m) => { if (!c) { console.log("FAIL", m); fails++; } };
ok(ru.intro.daysLeft(1) === "остался 1 день", "ru 1 day: " + ru.intro.daysLeft(1));
ok(ru.intro.daysLeft(3) === "осталось 3 дня", "ru 3 days: " + ru.intro.daysLeft(3));
ok(ru.intro.daysLeft(57) === "осталось 57 дней", "ru 57 days: " + ru.intro.daysLeft(57));
ok(ru.saver.months(5) === "5 месяцев", "ru 5 months");
ok(en.intro.daysLeft(1) === "1 day left", "en 1 day");
ok(sq.intro.daysLeft(1) === "ka mbetur 1 ditë" && sq.intro.daysLeft(5) === "kanë mbetur 5 ditë", "sq days");
console.log(fails ? `${fails} FAILED` : "i18n ALL PASS");
process.exit(fails ? 1 : 0);
