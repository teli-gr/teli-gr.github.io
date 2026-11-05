/* Greek road tax (τέλη κυκλοφορίας) — private-use cars and motorcycles.
   Every rate, date and notice comes from a `Gov` object, so the page can take
   fresh official data at run time (see gov.ts) without a rebuild. */

export type Kind = "car" | "moto";
export type Power = "ice" | "hybrid" | "ev";
export type CcKey = "y2000" | "y2005" | "y2010";
export type Co2Key = "nedc" | "wltp";
export type Period = CcKey | Co2Key;

export type Gov = {
  schema: 1;
  taxYear: number;                               // the year the tax is for (2027)
  deadline: string;                              // last day to pay without surcharge, YYYY-MM-DD (Athens)
  stages: { from: string; pct: number }[];       // surcharge steps after the deadline
  minFine: number;                               // minimum surcharge in €
  cc: Record<CcKey, [maxCc: number | null, euro: number][]>;        // null = "and above"
  co2: Record<Co2Key, [from: number, to: number | null, eurPerGram: number][]>;
  hybridShare: number;                           // pre-Nov-2010 hybrids above the exempt size pay this share
  hybridExemptMaxCc: number;
  monthly: { fromLabel: string; note: string };  // pay-by-the-month option
  notices: { date: string; title: string; url?: string; source?: string }[];
  sources: { label: string; url: string }[];
  checkedAt: string;                             // ISO time of the last official check
};

export const CO2_NAMES: Record<Co2Key, string> = { nedc: "NEDC", wltp: "WLTP" };

export const round2 = (x: number) => Math.round(x * 100) / 100;

/* Every 1 November the next year's road tax opens: deadline 31/12, surcharges from 1 Jan / 1 Feb / 1 Mar (law 5113/2024).
   Rates stay as they are; only a change in the law changes them. Old notices are dropped. */
export function rollGov(gov: Gov, today: string): Gov {
  let g = gov;
  while (today >= `${g.taxYear}-11-01`) {
    const y = g.taxYear + 1;
    g = { ...g, taxYear: y, deadline: `${y - 1}-12-31`, stages: [{ from: `${y}-01-01`, pct: 0.25 }, { from: `${y}-02-01`, pct: 0.5 }, { from: `${y}-03-01`, pct: 1 }], notices: g.notices.filter((n) => n.date >= `${y - 1}-11-01`) };
  }
  return g;
}
export const athensToday = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

export function periodFor(kind: Kind, year: number | null, fromNov2010: boolean | null, taxYear: number): Period | null {
  if (!year || year < 1950 || year > taxYear - 1) return null;
  if (year <= 2000) return "y2000";
  if (year <= 2005) return "y2005";
  if (kind === "moto") return "y2010";
  if (year <= 2009) return "y2010";
  if (year === 2010) return fromNov2010 === null ? null : fromNov2010 ? "nedc" : "y2010";
  if (year <= 2020) return "nedc";
  return "wltp";
}
export const isCo2Period = (p: Period | null): p is Co2Key => p === "nedc" || p === "wltp";

export function ccBand(gov: Gov, table: CcKey, cc: number) {
  const rows = gov.cc[table];
  let lo = 0;
  for (let i = 0; i < rows.length; i++) {
    const hi = rows[i][0] ?? Infinity;
    if (cc <= hi) return { i, lo, hi, amount: rows[i][1] };
    lo = hi + 1;
  }
  const i = rows.length - 1;
  return { i, lo, hi: Infinity, amount: rows[i][1] };
}
/* The WHOLE emission figure is multiplied by its band's rate (flat per band, not progressive). */
export function co2Band(gov: Gov, table: Co2Key, g: number) {
  const b = gov.co2[table];
  for (let i = 0; i < b.length; i++) { const to = b[i][1] ?? Infinity; if (g <= to) return { i, lo: b[i][0], hi: to, rate: b[i][2] }; }
  const i = b.length - 1;
  return { i, lo: b[i][0], hi: Infinity, rate: b[i][2] };
}
export const co2Tax = (gov: Gov, table: Co2Key, g: number) => round2(g * co2Band(gov, table, g).rate);

export type Result =
  | { tax: number; basis: "co2"; table: Co2Key; value: number; band: ReturnType<typeof co2Band>; exempt: boolean; reason?: Reason }
  | { tax: number; basis: "cc"; table: CcKey; value: number; band: ReturnType<typeof ccBand>; exempt: boolean; reason?: Reason; hybrid60?: boolean; full?: number }
  | { tax: 0; basis: "none"; exempt: true; reason: Reason };
/* Why a vehicle pays nothing. The page shows the sentence in the visitor's language. */
export type Reason = "evCo2" | "evMoto" | "evOld" | "lowCo2" | "hybridSmall";

export function calc(gov: Gov, kind: Kind, period: Period, power: Power, rawValue: number): Result {
  const v = Math.max(0, Math.round(rawValue || 0));
  const co2 = kind === "car" && isCo2Period(period);
  if (power === "ev") {
    if (co2) return { tax: 0, basis: "none", exempt: true, reason: "evCo2" };
    return { tax: 0, basis: "none", exempt: true, reason: kind === "moto" ? "evMoto" : "evOld" };
  }
  if (co2) {
    const table = period as Co2Key;
    const band = co2Band(gov, table, v);
    const tax = round2(v * band.rate);
    return { tax, basis: "co2", table, value: v, band, exempt: tax === 0, reason: tax === 0 ? "lowCo2" : undefined };
  }
  const table = period as CcKey;
  const band = ccBand(gov, table, v);
  if (power === "hybrid") {
    if (v <= gov.hybridExemptMaxCc) return { tax: 0, basis: "cc", table, value: v, band, exempt: true, reason: "hybridSmall" };
    return { tax: round2(band.amount * gov.hybridShare), basis: "cc", table, value: v, band, exempt: false, hybrid60: true, full: band.amount };
  }
  return { tax: band.amount, basis: "cc", table, value: v, band, exempt: false };
}

const athens = (d: string, end = false) => Date.parse(`${d}T${end ? "23:59:59" : "00:00:00"}+02:00`);
export const deadlineMs = (gov: Gov) => athens(gov.deadline, true);

/* 0 = on time; 1..n = the nth surcharge stage */
export function stageFor(gov: Gov, now: Date) {
  const t = now.getTime();
  let s = 0;
  gov.stages.forEach((st, i) => { if (t >= athens(st.from)) s = i + 1; });
  return s;
}
export const stagePct = (gov: Gov, s: number) => (s === 0 ? 0 : gov.stages[s - 1].pct);
export function withFine(gov: Gov, tax: number, pct: number) {
  if (tax <= 0 || pct === 0) return round2(tax);
  return round2(tax + Math.max(gov.minFine, tax * pct));
}
export const daysLeft = (gov: Gov, now: Date) => Math.max(0, Math.ceil((deadlineMs(gov) - now.getTime()) / 864e5));
