import * as React from "react";
import { athensToday, rollGov, type Gov } from "./tax.ts";
import { AADE_DATA } from "../content/aade-data.ts";

/* Built-in official data (amounts checked 4 Nov 2026). News and the check date come from content/aade-data.ts,
   which the scheduled AADE check updates. A hosted page with a live data URL can replace all of it at run time. */
export const DEFAULT_GOV: Gov = {
  schema: 1,
  taxYear: 2027,
  deadline: "2026-12-31",
  stages: [{ from: "2027-01-01", pct: 0.25 }, { from: "2027-02-01", pct: 0.5 }, { from: "2027-03-01", pct: 1 }],
  minFine: 30,
  cc: {
    y2000: [[300, 22], [785, 55], [1071, 120], [1357, 135], [1548, 225], [1738, 250], [1928, 280], [2357, 615], [3000, 820], [4000, 1025], [null, 1230]],
    y2005: [[300, 22], [785, 55], [1071, 120], [1357, 135], [1548, 240], [1738, 265], [1928, 300], [2357, 630], [3000, 840], [4000, 1050], [null, 1260]],
    y2010: [[300, 22], [785, 55], [1071, 120], [1357, 135], [1548, 255], [1738, 280], [1928, 320], [2357, 690], [3000, 920], [4000, 1150], [null, 1380]],
  },
  co2: {
    nedc: [[0, 90, 0], [91, 100, 0.9], [101, 120, 0.98], [121, 140, 1.2], [141, 160, 1.85], [161, 180, 2.45], [181, 200, 2.78], [201, 250, 3.05], [251, null, 3.72]],
    wltp: [[0, 122, 0], [123, 139, 0.64], [140, 166, 0.7], [167, 208, 0.85], [209, 224, 1.87], [225, 240, 2.2], [241, 260, 2.5], [261, 280, 2.7], [281, null, 2.85]],
  },
  hybridShare: 0.6,
  hybridExemptMaxCc: 1548,
  monthly: { fromLabel: "1 Απριλίου", note: "Πέρσι η άρση ακινησίας με τον μήνα άνοιξε από 1 Απριλίου. Ελέγξτε το myCAR για φέτος." },
  notices: AADE_DATA.notices,
  sources: [
    { label: "ν. 5177/2025, άρθρο 55 (ποσά)", url: "https://www.taxheaven.gr/law/5177/2025/arthro/55" },
    { label: "ΑΑΔΕ", url: "https://www.aade.gr" },
  ],
  checkedAt: AADE_DATA.checkedAt,
};

/* Accept a stored document only if it has the full, sane shape; otherwise keep the built-in data. */
export function parseGov(raw: unknown): Gov | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, any>;
  const isDate = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const okCc = (rows: unknown) => Array.isArray(rows) && rows.length >= 3 && rows.every((r) => Array.isArray(r) && (r[0] === null || typeof r[0] === "number") && typeof r[1] === "number" && r[1] >= 0 && r[1] < 10000);
  const okCo2 = (rows: unknown) => Array.isArray(rows) && rows.length >= 3 && rows.every((r) => Array.isArray(r) && typeof r[0] === "number" && (r[1] === null || typeof r[1] === "number") && typeof r[2] === "number" && r[2] >= 0 && r[2] < 20);
  try {
    if (g.schema !== 1 || typeof g.taxYear !== "number" || g.taxYear < 2026 || g.taxYear > 2100) return null;
    if (!isDate(g.deadline) || !Array.isArray(g.stages) || !g.stages.every((s: any) => isDate(s?.from) && typeof s?.pct === "number")) return null;
    if (!g.cc || !okCc(g.cc.y2000) || !okCc(g.cc.y2005) || !okCc(g.cc.y2010)) return null;
    if (!g.co2 || !okCo2(g.co2.nedc) || !okCo2(g.co2.wltp)) return null;
    return {
      ...DEFAULT_GOV,
      ...g,
      monthly: { ...DEFAULT_GOV.monthly, ...(g.monthly || {}) },
      notices: Array.isArray(g.notices) ? g.notices.filter((n: any) => isDate(n?.date) && typeof n?.title === "string").slice(0, 30) : DEFAULT_GOV.notices,
      sources: Array.isArray(g.sources) ? g.sources.filter((s: any) => typeof s?.label === "string" && typeof s?.url === "string" && /^https:\/\//.test(s.url)) : DEFAULT_GOV.sources,
      checkedAt: typeof g.checkedAt === "string" ? g.checkedAt : DEFAULT_GOV.checkedAt,
    } as Gov;
  } catch { return null; }
}

export type GovState = { gov: Gov; source: "builtin" | "live"; note?: string };

/* Subscribe once to gov/current. Renders with built-in data first; lights up when the store answers. */
export function useGov(): GovState {
  const [state, setState] = React.useState<GovState>(() => ({ gov: rollGov(DEFAULT_GOV, athensToday()), source: "builtin" }));
  React.useEffect(() => {
    let unsub: (() => void) | undefined; let dead = false;
    const w = window as unknown as { claude?: { use: (n: string) => Promise<any> } };
    // Deployed outside Claude (Netlify / Firebase): read the same document from a public JSON URL.
    const url = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOV_URL;
    if (!w.claude?.use) {
      if (!url) return;
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
      fetch(url, { signal: ctl.signal, cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).then((j) => {
        const g = parseGov(j && typeof j === "object" && "fields" in j ? null : j);
        if (g && !dead) setState({ gov: rollGov(g, athensToday()), source: "live" });
      }).catch(() => {}).finally(() => clearTimeout(t));
      return () => { dead = true; ctl.abort(); };
    }
    w.claude.use("db").then((db) => {
      if (!db || dead) return;
      unsub = db.doc("gov/current").onSnapshot(
        (snap: any) => { const g = snap.exists ? parseGov(snap.data()) : null; if (g) setState({ gov: rollGov(g, athensToday()), source: "live" }); },
        () => { /* keep built-in data */ },
      );
    }).catch(() => {});
    return () => { dead = true; unsub?.(); };
  }, []);
  return state;
}
