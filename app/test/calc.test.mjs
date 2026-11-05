import { calc as _calc, withFine as _wf, stageFor as _st, periodFor as _pf, rollGov } from "../src/lib/tax.ts";
import { DEFAULT_GOV as G, parseGov } from "../src/lib/gov.ts";
const calc=(...a)=>_calc(G,...a), withFine=(t,p)=>_wf(G,t,p), stageFor=(d)=>_st(G,d), periodFor=(k,y,n)=>_pf(k,y,n,G.taxYear);
let fail = 0;
const t = (name, got, exp) => { const ok = Math.abs(got - exp) < 0.001; if (!ok) fail++; console.log(ok ? "PASS" : "FAIL", name, got, "expected", exp); };
const eq = (name, got, exp) => { const ok = got === exp; if (!ok) fail++; console.log(ok ? "PASS" : "FAIL", name, got, "expected", exp); };
// published worked examples (logariase.gr, financialreport.gr)
t("WLTP 139", calc("car","wltp","ice",139).tax, 88.96);
t("WLTP 140", calc("car","wltp","ice",140).tax, 98);
t("WLTP 155", calc("car","wltp","ice",155).tax, 108.5);
t("WLTP 208", calc("car","wltp","ice",208).tax, 176.8);
t("WLTP 209", calc("car","wltp","ice",209).tax, 390.83);
t("WLTP 130", calc("car","wltp","ice",130).tax, 83.2);
t("WLTP 180", calc("car","wltp","ice",180).tax, 153);
t("WLTP 122 exempt", calc("car","wltp","ice",122).tax, 0);
t("NEDC 135", calc("car","nedc","ice",135).tax, 162);
t("NEDC 99", calc("car","nedc","ice",99).tax, 89.1);
t("NEDC 120", calc("car","nedc","ice",120).tax, 117.6);
t("NEDC 140", calc("car","nedc","ice",140).tax, 168);
t("NEDC 141", calc("car","nedc","ice",141).tax, 260.85);
t("NEDC 150", calc("car","nedc","ice",150).tax, 277.5);
t("NEDC 160", calc("car","nedc","ice",160).tax, 296);
t("NEDC 161", calc("car","nedc","ice",161).tax, 394.45);
// cc tables (law 5177/2025 art. 55)
t("cc 2006+ 1400", calc("car","y2010","ice",1400).tax, 255);
t("cc 2006+ 1357", calc("car","y2010","ice",1357).tax, 135);
t("cc <=2000 1600", calc("car","y2000","ice",1600).tax, 250);
t("cc 2001-05 2000", calc("car","y2005","ice",2000).tax, 630);
t("cc 4500", calc("car","y2010","ice",4500).tax, 1380);
t("hybrid pre2010 1500 exempt", calc("car","y2010","hybrid",1500).tax, 0);
t("hybrid pre2010 1600 60%", calc("car","y2010","hybrid",1600).tax, 168);
t("hybrid wltp normal", calc("car","wltp","hybrid",130).tax, 83.2);
t("ev", calc("car","wltp","ev",0).tax, 0);
t("moto 125", calc("moto","y2010","ice",125).tax, 22);
t("moto ev", calc("moto","y2010","ev",0).tax, 0);
// fines (law 5113/2024), examples from financialreport.gr
t("135 jan", withFine(135,.25), 168.75); t("135 feb", withFine(135,.5), 202.5); t("135 mar", withFine(135,1), 270);
t("120 mar", withFine(120,1), 240); t("22 jan min 30", withFine(22,.25), 52); t("0 any", withFine(0,1), 0);
// periods
eq("car 2019", periodFor("car",2019,null), "nedc"); eq("car 2021", periodFor("car",2021,null), "wltp");
eq("car 2010 before", periodFor("car",2010,false), "y2010"); eq("car 2010 after", periodFor("car",2010,true), "nedc");
eq("car 2010 unknown", periodFor("car",2010,null), null); eq("car 2005", periodFor("car",2005,null), "y2005");
eq("moto 2019", periodFor("moto",2019,null), "y2010"); eq("car 1999", periodFor("car",1999,null), "y2000");
eq("stage nov", stageFor(new Date("2026-11-04T12:00:00Z")), 0); eq("stage jan", stageFor(new Date("2027-01-15T12:00:00Z")), 1);
eq("stage feb", stageFor(new Date("2027-02-10T12:00:00Z")), 2); eq("stage mar", stageFor(new Date("2027-03-02T12:00:00Z")), 3);
eq("parseGov accepts default", !!parseGov(JSON.parse(JSON.stringify(G))), true); eq("parseGov rejects junk", parseGov({schema:1}), null);
// automatic change of year on 1 November
const same = rollGov(G, "2026-11-05");
eq("rollGov keeps 2027 before 1/11/2027", same.taxYear, 2027);
const next = rollGov(G, "2027-11-01");
eq("rollGov moves to 2028 on 1/11/2027", next.taxYear, 2028);
eq("rollGov new deadline", next.deadline, "2027-12-31");
eq("rollGov new surcharge dates", next.stages.map((x) => x.from).join(","), "2028-01-01,2028-02-01,2028-03-01");
eq("rollGov drops old notices", next.notices.length, 0);
eq("rollGov keeps rates", next.co2.wltp[1][2], G.co2.wltp[1][2]);
eq("rollGov two years later", rollGov(G, "2028-11-02").taxYear, 2029);
console.log(fail ? `${fail} FAILED` : "ALL PASS"); process.exit(fail ? 1 : 0);

