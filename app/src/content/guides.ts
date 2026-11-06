/* Short Greek guide pages for the questions people search most. Built as static HTML at /odigos/<slug>/
   (fast, readable by search engines), each one pointing to the calculator. Numbers come from the same data as the app.
   Relative imports only: vite.config.js loads this file. Facts checked 5 Nov 2026 against the sources listed per page. */
import { DEFAULT_GOV } from "../lib/gov";
import { withFine } from "../lib/tax";
import { GUIDE_LINKS } from "./guideLinks";
import { CREDIT } from "./credit";

const g = DEFAULT_GOV;
const y = g.taxYear;
const eur = (n: number) => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(n);
const dmy = (iso: string) => iso.split("-").reverse().map((x) => String(+x)).join("/");
const DL = dmy(g.deadline);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Section = { h: string; p?: string[]; list?: string[]; steps?: string[]; table?: [string, string][] };
type Guide = { slug: string; title: string; desc: string; lead: string; sections: Section[]; sources: { label: string; url: string }[] };

const AADE_GUIDE = { label: "ΑΑΔΕ: Οδηγίες myCAR", url: "https://www.aade.gr/sites/default/files/2024-11/odigies_my%20CAR%2011_24.pdf" };
const AADE_MYCAR = { label: "ΑΑΔΕ: myCAR", url: "https://www.aade.gr/mycar" };
const LAW = { label: "ν. 5177/2025, άρθρο 55", url: "https://www.taxheaven.gr/law/5177/2025/arthro/55" };

const ex = 162; // the calculator's own example: 135 g/km × 1,20 €
const small = 55; // a small car (cc table), shows the 30 € minimum surcharge

export const GUIDES: Guide[] = [
  {
    slug: "akinisia",
    title: `Ακινησία αυτοκινήτου ${y}: πώς τη δηλώνετε και πόσα γλιτώνετε`,
    desc: `Δεν θα οδηγήσετε το όχημα το ${y}; Δηλώστε ακινησία στο myCAR έως ${DL} και δεν πληρώνετε τέλη κυκλοφορίας. Τι ισχύει, βήμα βήμα.`,
    lead: `Αν το όχημα δεν θα κυκλοφορήσει το ${y}, δηλώστε ακινησία στο myCAR έως ${DL}. Αλλιώς πληρώνετε τα τέλη κανονικά, ακόμα κι αν δεν κινείται.`,
    sections: [
      { h: "Τι κερδίζετε", p: ["Όσο το όχημα είναι σε ακινησία, δεν πληρώνετε τέλη κυκλοφορίας. Για ένα αυτοκίνητο με τέλη 162 € τον χρόνο, γλιτώνετε όλο το ποσό."] },
      { h: "Τι πρέπει να ισχύει", list: ["Το όχημα μένει σταθμευμένο στον ιδιωτικό χώρο που δηλώνετε και δεν κυκλοφορεί.", "Δεν παραδίδετε πινακίδες: η δήλωση γίνεται ψηφιακά.", "Αν το όχημα έχει συνιδιοκτήτες, χρειάζεται έγκριση από όλους."] },
      { h: "Πώς τη δηλώνετε", steps: ["Μπείτε στο myCAR της ΑΑΔΕ με τους κωδικούς TAXISnet.", "Διαλέξτε το όχημα και τη δήλωση ακινησίας.", "Δηλώστε τον χώρο όπου μένει σταθμευμένο και υποβάλετε."] },
      { h: "Θέλετε να το ξαναβγάλετε;", p: ["Κάνετε άρση ακινησίας στο myCAR. Πληρώνετε τέλη μόνο για τους μήνες που θα κυκλοφορεί και χρειάζεστε ενεργή ασφάλεια."] },
      { h: "Τι δεν δηλώνεται ως ακινησία", p: ["Η κλοπή και η απόσυρση. Για αυτές κάνετε αίτημα στη ΔΟΥ ή στο ΚΕΦΟΔΕ από «Τα αιτήματά μου» στο myAADE."] },
    ],
    sources: [AADE_GUIDE, AADE_MYCAR],
  },
  {
    slug: "me-to-mina",
    title: "Τέλη κυκλοφορίας με τον μήνα: πληρώνετε μόνο όσο οδηγείτε",
    desc: "Πώς πληρώνετε τέλη κυκλοφορίας μόνο για τους μήνες που κυκλοφορεί το όχημα: ακινησία, άρση στο myCAR και 1/12 του ετήσιου ποσού τον μήνα.",
    lead: "Αν θα οδηγήσετε το όχημα λίγους μήνες, δεν χρειάζεται να πληρώσετε όλο τον χρόνο. Πληρώνετε μόνο τους μήνες που κυκλοφορεί.",
    sections: [
      { h: "Πώς λειτουργεί", steps: [`Δηλώστε ακινησία στο myCAR έως ${DL}.`, "Όταν χρειαστείτε το όχημα, κάντε άρση ακινησίας στο myCAR.", "Πληρώστε τα τέλη για τους μήνες που θα κυκλοφορεί και έχετε ενεργή ασφάλεια."] },
      { h: "Πόσο κοστίζει", p: [`Κάθε μήνας κοστίζει το 1/12 των ετήσιων τελών. Παράδειγμα: με ετήσια τέλη ${eur(ex)}, ο μήνας κοστίζει ${eur(ex / 12)} και οι 4 μήνες ${eur((ex / 12) * 4)}. Γλιτώνετε ${eur(ex - (ex / 12) * 4)}.`] },
      { h: "Από πότε", p: ["Πέρσι η πληρωμή με τον μήνα άνοιξε από 1 Απριλίου. Ελέγξτε το myCAR για τη φετινή ημερομηνία."] },
    ],
    sources: [AADE_MYCAR, AADE_GUIDE],
  },
  {
    slug: "prostima",
    title: `Πρόστιμα για τα τέλη κυκλοφορίας ${y}: πόσο ανεβαίνει το ποσό αν αργήσετε`,
    desc: `Τα τέλη κυκλοφορίας ${y} πληρώνονται έως ${DL}. Μετά: +25% τον Ιανουάριο, +50% τον Φεβρουάριο, +100% από 1 Μαρτίου, με ελάχιστη προσαύξηση ${g.minFine} €.`,
    lead: `Τα τέλη του ${y} πληρώνονται έως ${DL}. Μετά την προθεσμία το ποσό ανεβαίνει κάθε μήνα.`,
    sections: [
      { h: "Οι προσαυξήσεις", table: [[`Έως ${DL}`, "Χωρίς προσαύξηση"], [`Ιανουάριος ${y}`, "+25%"], [`Φεβρουάριος ${y}`, "+50%"], [`Από 1 Μαρτίου ${y}`, "+100% (διπλάσιο)"]], p: [`Η προσαύξηση δεν μπορεί να είναι κάτω από ${g.minFine} €.`] },
      { h: "Παράδειγμα", table: [[`Τέλη ${eur(ex)}`, `${eur(withFine(g, ex, 0.25))} τον Ιανουάριο · ${eur(withFine(g, ex, 0.5))} τον Φεβρουάριο · ${eur(withFine(g, ex, 1))} από 1 Μαρτίου`], [`Τέλη ${eur(small)}`, `${eur(withFine(g, small, 0.25))} τον Ιανουάριο · ${eur(withFine(g, small, 0.5))} τον Φεβρουάριο · ${eur(withFine(g, small, 1))} από 1 Μαρτίου`]], p: [`Στα μικρά ποσά μετράει το ελάχιστο των ${g.minFine} €: ακόμα και τον Ιανουάριο πληρώνετε ${g.minFine} € παραπάνω.`] },
      { h: "Πώς το αποφεύγετε", list: [`Πληρώστε έως ${DL}.`, `Αν δεν θα οδηγήσετε το όχημα, δηλώστε ακινησία έως ${DL}.`, "Βάλτε υπενθύμιση στο ημερολόγιο από τον υπολογισμό μας."] },
    ],
    sources: [{ label: "Powergame: Χωρίς παράταση, οι προσαυξήσεις", url: "https://www.powergame.gr/forologia/1245704/teli-kykloforias-2026-ti-ischyei-me-tin-paratasi/" }, AADE_MYCAR],
  },
  {
    slug: "ilektrika-ybridika",
    title: `Τέλη κυκλοφορίας για ηλεκτρικά και υβριδικά αυτοκίνητα (${y})`,
    desc: "Πόσα τέλη κυκλοφορίας πληρώνουν τα ηλεκτρικά και τα υβριδικά: τα ηλεκτρικά δεν πληρώνουν, τα υβριδικά πληρώνουν με βάση τους ρύπους CO₂ ή, αν είναι παλιά, τα κυβικά.",
    lead: "Τα ηλεκτρικά δεν πληρώνουν τέλη κυκλοφορίας. Τα υβριδικά πληρώνουν όπως τα υπόλοιπα, με βάση τους ρύπους ή τα κυβικά, συχνά λιγότερα.",
    sections: [
      { h: "Ηλεκτρικά", p: ["Τα αμιγώς ηλεκτρικά αυτοκίνητα δεν πληρώνουν τέλη κυκλοφορίας, γιατί δεν έχουν ρύπους CO₂. Το ίδιο ισχύει για τις ηλεκτρικές μοτοσικλέτες."] },
      { h: "Υβριδικά από 1/11/2010", p: [`Πληρώνουν με βάση τους ρύπους CO₂ (πεδίο V.7 της άδειας), όπως όλα τα αυτοκίνητα. Με ταξινόμηση από 2021 (WLTP) δεν πληρώνουν έως ${g.co2.wltp[0][1]} g/km· με ταξινόμηση 1/11/2010 έως 2020 (NEDC) δεν πληρώνουν έως ${g.co2.nedc[0][1]} g/km.`] },
      { h: "Υβριδικά έως 31/10/2010", p: [`Έως ${g.hybridExemptMaxCc.toLocaleString("el-GR")} cc απαλλάσσονται. Πάνω από αυτό πληρώνουν το ${Math.round(g.hybridShare * 100)}% των τελών με βάση τα κυβικά.`] },
    ],
    sources: [LAW],
  },
  {
    slug: "amea",
    title: "Απαλλαγή ΑμεΑ από τα τέλη κυκλοφορίας: ποιοι δικαιούνται και πώς",
    desc: "Ποια άτομα με αναπηρία απαλλάσσονται από τα τέλη κυκλοφορίας, για ποιο αυτοκίνητο, ποια είναι τα όρια κυβικών και πώς κάνετε την αίτηση στην ΑΑΔΕ.",
    lead: "Ορισμένες κατηγορίες αναπηρίας δικαιούνται απαλλαγή από τα τέλη κυκλοφορίας για ένα επιβατικό αυτοκίνητο ιδιωτικής χρήσης.",
    sections: [
      { h: "Προϋποθέσεις", list: ["Το αυτοκίνητο ανήκει 100% στο άτομο με αναπηρία, ή στον γονέα ή κηδεμόνα ανήλικου με αναπηρία.", "Ισχύει για ένα αυτοκίνητο μόνο.", "Έως 1.650 cc.", "Με πλήρη παραπληγία ή ακρωτηριασμό και των δύο κάτω άκρων: έως 2.650 cc με ποσοστό από 80% και έως 3.650 cc με 100%.", "Η απαλλαγή αφορά ορισμένες κατηγορίες αναπηρίας. Η πλήρης λίστα είναι στον οδηγό της ΑΑΔΕ."] },
      { h: "Τι χρειάζεστε", list: ["Αίτηση και την άδεια κυκλοφορίας.", "Υπεύθυνη δήλωση ότι δεν έχετε άλλο όχημα με την ίδια απαλλαγή.", "Τη γνωμάτευση του ΚΕΠΑ (ή της ΑΣΥΕ) και υπεύθυνη δήλωση ότι δεν έχετε προσφύγει σε δευτεροβάθμια επιτροπή."] },
      { h: "Πού κάνετε την αίτηση", p: ["Στη ΔΟΥ σας ή ψηφιακά από «Τα αιτήματά μου» στο myAADE. Την απαλλαγή την εγκρίνει ο προϊστάμενος της ΔΟΥ."] },
    ],
    sources: [{ label: "ΑΑΔΕ: Τέλη κυκλοφορίας για ΑμεΑ", url: "https://www.aade.gr/exypiretisi-enimerosi/hristikoi-odigoi/hristikos-odigos-gia-ta-basika-forologika-dikaiomata-ton-amea/teli-kykloforias" }],
  },
];

const CSS = `:root{--fg:#0b1220;--muted:#5b6676;--brand:#0f6b3a;--brandbg:#e9f9ef;--line:#e3e7ee}*{box-sizing:border-box}body{margin:0;font-family:"Inter Variable",Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--fg);background:#f6f7f9;line-height:1.6;font-size:17px}main{max-width:44rem;margin:0 auto;padding:1.25rem 1rem 3rem}a{color:var(--brand)}header{border-bottom:1px solid var(--line);background:#fff}header div{max-width:44rem;margin:0 auto;padding:.75rem 1rem;display:flex;gap:1rem;align-items:center;justify-content:space-between}header a{font-weight:700;text-decoration:none;color:var(--fg)}h1{font-size:1.75rem;line-height:1.15;margin:1rem 0 .5rem}h2{font-size:1.2rem;margin:1.75rem 0 .5rem}.lead{font-size:1.1rem;color:var(--muted)}.cta{display:block;margin:1.5rem 0;padding:1rem 1.25rem;border-radius:14px;background:#3ee38a;color:#04140b;font-weight:700;text-decoration:none;text-align:center;font-size:1.05rem}table{border-collapse:collapse;width:100%;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden}td{padding:.6rem .8rem;border-top:1px solid var(--line);vertical-align:top}tr:first-child td{border-top:0}td:first-child{font-weight:600;white-space:nowrap}ol,ul{padding-left:1.25rem}li{margin:.35rem 0}.box{background:#fff;border:1px solid var(--line);border-radius:14px;padding:1rem 1.25rem}.small{font-size:.9rem;color:var(--muted)}nav.more a{display:inline-block;margin:.25rem .75rem .25rem 0;font-weight:600}footer.foot div{max-width:44rem;margin:0 auto;padding:1rem 1rem 2.5rem;display:grid;justify-items:center;text-align:center}.credit{display:inline-flex;align-items:center;gap:.35rem;min-height:2.5rem;font-size:.85rem;color:var(--muted);text-decoration:none}.heart{width:1rem;height:1rem;fill:#e5484d;transition:transform .3s}.credit:hover .heart{transform:scale(1.25)}.pv{display:inline-flex;align-items:center;min-height:2.5rem;font-size:.85rem;color:var(--muted)}.pv:hover{color:var(--brand)}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.plate{display:inline-flex;margin-left:.25rem;height:1.75rem;border:2px solid var(--fg);border-radius:5px;overflow:hidden;background:#fff;box-shadow:0 1px 2px rgba(16,24,40,.08);transition:transform .2s,box-shadow .2s}.plate .eu{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;width:1rem;background:#039;color:#fff;font-size:7px;font-weight:700}.plate .txt{display:flex;align-items:center;padding:0 .5rem;color:var(--fg);font-family:"Roboto Condensed","Arial Narrow","Helvetica Neue",Arial,sans-serif;font-stretch:condensed;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase}.credit:hover .plate{transform:translateY(-2px);box-shadow:0 4px 10px rgba(16,24,40,.12)}@media (prefers-reduced-motion:reduce){.plate,.heart{transition:none}.credit:hover .plate,.credit:hover .heart{transform:none}}`;

export function guideHtml(gd: Guide, site: string) {
  const url = `${site}/odigos/${gd.slug}/`;
  const body = gd.sections.map((s) => [
    `<h2>${esc(s.h)}</h2>`,
    ...(s.p ?? []).map((x) => `<p>${esc(x)}</p>`),
    s.list ? `<ul>${s.list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "",
    s.steps ? `<ol>${s.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>` : "",
    s.table ? `<table>${s.table.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</table>` : "",
  ].join("")).join("\n");
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: gd.title, description: gd.desc, inLanguage: "el", dateModified: "2026-11-05", mainEntityOfPage: url, publisher: { "@type": "Organization", name: `Τέλη Κυκλοφορίας ${y}` } };
  return `<!doctype html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(gd.title)}</title>
<meta name="description" content="${esc(gd.desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article"><meta property="og:locale" content="el_GR">
<meta property="og:title" content="${esc(gd.title)}"><meta property="og:description" content="${esc(gd.desc)}">
<meta property="og:image" content="${esc(site)}/og.png"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ffffff">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="goatcounter" content="__GC_CODE__">
<script src="/count-loader.js" defer></script>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>${CSS}</style>
</head>
<body>
<header><div><a href="/">ΤΕΛΗ • ${y}</a><a href="/" style="color:var(--brand)">Υπολογισμός τελών</a></div></header>
<main>
<h1>${esc(gd.title)}</h1>
<p class="lead">${esc(gd.lead)}</p>
<a class="cta" href="/">Υπολογίστε τα τέλη του δικού σας οχήματος →</a>
${body}
<a class="cta" href="/">Δείτε πόσα πληρώνετε εσείς →</a>
<div class="box"><strong>Πηγές:</strong> ${gd.sources.map((s) => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`).join(" · ")}<br><span class="small">Ενημερώθηκε 5/11/2026.</span></div>
<h2>Άλλοι οδηγοί</h2>
<nav class="more">${GUIDE_LINKS.filter((l) => l.slug !== gd.slug).map((l) => `<a href="/odigos/${l.slug}/">${esc(l.label)}</a>`).join("")}</nav>
</main>
<footer class="foot"><div>
<p class="small" style="margin:0 0 .5rem">Ανεξάρτητος οδηγός, όχι της ΑΑΔΕ. Το επίσημο ποσό είναι στο ειδοποιητήριο του myCAR (<a href="https://www.aade.gr" rel="noopener">aade.gr</a>).</p>
<a class="credit" href="${CREDIT.url}" rel="noopener">Φτιαγμένο με <svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.1c2-.2 3.9.8 5.4 2.6 1.5-1.8 3.4-2.8 5.4-2.6 3.7.4 5.7 4.3 4.2 7.7C19.5 16.4 12 21 12 21z"/></svg><span class="sr">αγάπη</span> από <span class="plate"><span class="eu" aria-hidden="true"><svg viewBox="0 0 20 20" width="10" height="10">${Array.from({ length: 12 }, (_, i) => { const r = (i / 12) * Math.PI * 2; return `<circle cx="${(10 + 7 * Math.cos(r)).toFixed(2)}" cy="${(10 + 7 * Math.sin(r)).toFixed(2)}" r="1.6" fill="#ffcc00"/>`; }).join("")}</svg>GR</span><span class="txt">${CREDIT.label}</span></span></a>
<a class="pv" href="/#privacy">Απόρρητο</a>
</div></footer>
</body>
</html>
`;
}
