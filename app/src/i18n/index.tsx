import * as React from "react";
import type { Dict } from "./el";
import { setFormatLocale } from "@/lib/format";

export type Lang = "el" | "en" | "sq" | "zh" | "ru";
export type LangInfo = { code: Lang; native: string; locale: string; path: string; og: string };
/* Language names are shown in their own language (not flags: a flag is a country, not a language). */
export const LANGS: LangInfo[] = [
  { code: "el", native: "Ελληνικά", locale: "el-GR", path: "/", og: "el_GR" },
  { code: "en", native: "English", locale: "en-GB", path: "/en/", og: "en_GB" },
  { code: "sq", native: "Shqip", locale: "sq-AL", path: "/sq/", og: "sq_AL" },
  { code: "zh", native: "中文", locale: "zh-CN", path: "/zh/", og: "zh_CN" },
  { code: "ru", native: "Русский", locale: "ru-RU", path: "/ru/", og: "ru_RU" },
];
/* Each page downloads only its own language (smaller, faster). */
const LOADERS: Record<Lang, () => Promise<Dict>> = {
  el: () => import("./el").then((m) => m.el),
  en: () => import("./en").then((m) => m.en),
  sq: () => import("./sq").then((m) => m.sq),
  zh: () => import("./zh").then((m) => m.zh),
  ru: () => import("./ru").then((m) => m.ru),
};
const LOADED: Partial<Record<Lang, Dict>> = {};
export const loadLang = async (l: Lang) => (LOADED[l] ??= await LOADERS[l]());
/* The one-time "read this in …?" hint, kept here so other languages don't have to be downloaded for it. */
export const HINTS: Record<Lang, { text: string; yes: string; no: string }> = {
  el: { text: "Θέλετε τη σελίδα στα ελληνικά;", yes: "Ναι, στα ελληνικά", no: "Όχι" },
  en: { text: "Would you like this page in English?", yes: "Yes, in English", no: "No" },
  sq: { text: "Dëshironi faqen në shqip?", yes: "Po, në shqip", no: "Jo" },
  zh: { text: "需要中文版页面吗？", yes: "是，切换到中文", no: "不用" },
  ru: { text: "Открыть страницу на русском?", yes: "Да, на русском", no: "Нет" },
};
const isLang = (x: unknown): x is Lang => x === "el" || x === "en" || x === "sq" || x === "zh" || x === "ru";
export const langInfo = (l: Lang) => LANGS.find((x) => x.code === l)!;

const env = ((import.meta as unknown as { env?: Record<string, string> }).env ?? {}) as Record<string, string>;
/* The website has one page per language (/, /en/, /zh/, /ru/) so search engines can find each one.
   The Claude-hosted page is a single file, so there the language switches in place. */
const SINGLE_PAGE = env.VITE_TARGET === "artifact";
const PREF = "teli.lang";
const readPref = (): Lang | null => { try { const v = localStorage.getItem(PREF); return isLang(v) ? v : null; } catch { return null; } };
const writePref = (l: Lang) => { try { localStorage.setItem(PREF, l); } catch { /* ignore */ } };

export function initialLang(): Lang {
  if (typeof document === "undefined") return "el";
  if (SINGLE_PAGE) return readPref() ?? "el";
  const l = document.documentElement.lang.slice(0, 2);
  return isLang(l) ? l : "el";
}

type Ctx = { lang: Lang; t: Dict; locale: string; setLang: (l: Lang) => void; hasPref: boolean; dismissHint: () => void };
const I18n = React.createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>(initialLang);
  const [hasPref, setHasPref] = React.useState(() => readPref() !== null);
  const info = langInfo(lang);
  setFormatLocale(info.locale); // formatters follow the language (dates, € amounts, numbers)
  React.useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = React.useCallback((l: Lang) => {
    writePref(l); setHasPref(true);
    if (l === lang) return;
    if (SINGLE_PAGE) { loadLang(l).then(() => setLangState(l)); return; }
    location.href = langInfo(l).path + location.hash;
  }, [lang]);
  const dismissHint = React.useCallback(() => { writePref(lang); setHasPref(true); }, [lang]);
  const value = React.useMemo(() => ({ lang, t: LOADED[lang]!, locale: info.locale, setLang, hasPref, dismissHint }), [lang, info.locale, setLang, hasPref, dismissHint]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export function useI18n() {
  const c = React.useContext(I18n);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}
export const useT = () => useI18n().t;

/* A browser language we have a page for, if it differs from the current page (used for a one-time hint). */
export function suggestedLang(current: Lang): Lang | null {
  if (typeof navigator === "undefined") return null;
  for (const l of navigator.languages ?? [navigator.language]) {
    const c = l.slice(0, 2).toLowerCase();
    if (c === current) return null;
    if (isLang(c)) return c;
  }
  return null;
}
