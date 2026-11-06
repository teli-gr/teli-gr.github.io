/* Build-time SEO for each language page (/, /en/, /zh/, /ru/): real HTML for search engines and link previews
   (React replaces it on load), hreflang links between the languages, FAQ structured data and share image.
   Uses relative imports only, because vite.config.js loads this file directly. */
import { DEFAULT_GOV } from "../lib/gov";
import { el } from "../i18n/el";
import { en } from "../i18n/en";
import { zh } from "../i18n/zh";
import { ru } from "../i18n/ru";
import { sq } from "../i18n/sq";
import { FAQ_URLS } from "./faq";
import { GUIDE_LINKS } from "./guideLinks";
import { CREDIT } from "./credit";

export type SeoLang = "el" | "en" | "sq" | "zh" | "ru";
const D = { el, en, sq, zh, ru };
export const PAGES: Record<SeoLang, { path: string; og: string; locale: string }> = {
  el: { path: "/", og: "el_GR", locale: "el-GR" },
  en: { path: "/en/", og: "en_GB", locale: "en-GB" },
  sq: { path: "/sq/", og: "sq_AL", locale: "sq-AL" },
  zh: { path: "/zh/", og: "zh_CN", locale: "zh-CN" },
  ru: { path: "/ru/", og: "ru_RU", locale: "ru-RU" },
};
const LANG_LIST = Object.keys(PAGES) as SeoLang[];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const g = DEFAULT_GOV;

export function seoHead(siteUrl: string, lang: SeoLang = "el") {
  const t = D[lang]; const page = PAGES[lang];
  const date = new Intl.DateTimeFormat(page.locale, { day: "numeric", month: "numeric", year: "numeric", timeZone: "Europe/Athens" }).format(new Date(`${g.deadline}T12:00:00+02:00`));
  const title = t.seo.title(g.taxYear);
  const desc = t.seo.desc(g.taxYear, date);
  const url = siteUrl ? `${siteUrl}${page.path}` : "";
  const ld = [
    { "@context": "https://schema.org", "@type": "WebApplication", name: t.meta.appName(g.taxYear), applicationCategory: "FinanceApplication", operatingSystem: "Any", inLanguage: lang, offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" }, url: url || undefined },
    { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: lang, mainEntity: t.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a.replace(/\n/g, " ") } })) },
  ];
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="${page.og}">`,
    ...LANG_LIST.filter((l) => l !== lang).map((l) => `<meta property="og:locale:alternate" content="${PAGES[l].og}">`),
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:image" content="${esc(`${siteUrl}/og.png`)}">`,
    `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`,
    url ? `<meta property="og:url" content="${esc(url)}">` : "",
    `<meta name="twitter:card" content="summary_large_image">`,
    url ? `<link rel="canonical" href="${esc(url)}">` : "",
    ...(siteUrl ? [...LANG_LIST.map((l) => `<link rel="alternate" hreflang="${l}" href="${esc(siteUrl + PAGES[l].path)}">`), `<link rel="alternate" hreflang="x-default" href="${esc(siteUrl)}/">`] : []),
    `<meta name="theme-color" content="#ffffff">`,
    `<link rel="manifest" href="/manifest.webmanifest">`,
    `<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
    `<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="${esc(t.seo.shortName(g.taxYear))}">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ].filter(Boolean).join("\n");
}

export function seoBody(lang: SeoLang = "el") {
  const t = D[lang]; const loc = PAGES[lang].locale;
  const eur = (n: number) => new Intl.NumberFormat(loc, { style: "currency", currency: "EUR" }).format(n);
  const date = new Intl.DateTimeFormat(loc, { day: "numeric", month: "numeric", year: "numeric", timeZone: "Europe/Athens" }).format(new Date(`${g.deadline}T12:00:00+02:00`));
  const co2Rows = (k: "wltp" | "nedc") => g.co2[k].map(([a, b, r]) => `<tr><td>${a}${b === null ? "+" : `–${b}`} g/km</td><td>${r === 0 ? eur(0) : `${eur(r)} ${esc(t.seo.perGram)}`}</td></tr>`).join("");
  let lo = 0;
  const ccRows = g.cc.y2010.map(([hi, e]) => { const r = `<tr><td>${lo}${hi === null ? "+" : `–${hi}`} cc</td><td>${eur(e)}</td></tr>`; lo = (hi ?? 0) + 1; return r; }).join("");
  const [dlStrong, dlRest] = t.seo.deadline(date, g.minFine);
  return `<main style="max-width:44rem;margin:0 auto;padding:2rem 1rem;font-family:system-ui,sans-serif;line-height:1.5;color:#0b1220">
<h1>${esc(t.intro.h1(g.taxYear))}</h1>
<p>${esc(t.seo.lead(g.taxYear))}</p>
<p><strong>${esc(dlStrong)}</strong> ${esc(dlRest)}</p>
<h2>${esc(t.seo.wltp)}</h2><table>${co2Rows("wltp")}</table>
<h2>${esc(t.seo.nedc)}</h2><table>${co2Rows("nedc")}</table>
<p>${esc(t.seo.example)}</p>
<h2>${esc(t.seo.cc)}</h2><table>${ccRows}</table>
<h2>${esc(t.help.title)}</h2>
${t.faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a).replace(/\n/g, "<br>")} <a href="${FAQ_URLS[f.src]}">${esc(t.faqSources[f.src])}</a></p>`).join("\n")}
${lang === "el" ? `<p>Οδηγοί: ${GUIDE_LINKS.map((gl) => `<a href="/odigos/${gl.slug}/">${gl.label}</a>`).join(" · ")}</p>` : ""}
<p>${LANG_LIST.map((l) => `<a href="${PAGES[l].path}" hreflang="${l}">${{ el: "Ελληνικά", en: "English", sq: "Shqip", zh: "中文", ru: "Русский" }[l]}</a>`).join(" · ")}</p>
<p><small>${esc(t.seo.footer)}</small></p>
<p><small>${esc(t.footer.madeBy).replace("{heart}", "♥").replace("{site}", `<a href="${CREDIT.url}">${CREDIT.label}</a>`)}</small></p>
</main>`;
}
