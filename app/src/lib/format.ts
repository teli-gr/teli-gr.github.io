/* Number, € and date formatting that follows the page language. The i18n provider sets the locale. */
let LOC = "el-GR";
/* Some browsers ship without data for smaller languages (e.g. Albanian). Then numbers use a locale with the same
   conventions (decimal comma, € after the amount) and dates are spelled out by hand below. */
const has = (l: string) => { try { return Intl.DateTimeFormat.supportedLocalesOf([l]).length > 0 && Intl.NumberFormat.supportedLocalesOf([l]).length > 0; } catch { return false; } };
const numLocale = (l: string) => (has(l) ? l : l.startsWith("sq") ? "el-GR" : "en-GB");
const make = (l: string) => {
  const n = numLocale(l);
  return {
    eur: new Intl.NumberFormat(n, { style: "currency", currency: "EUR" }),
    eur0: new Intl.NumberFormat(n, { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    n: new Intl.NumberFormat(n),
    rate: new Intl.NumberFormat(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  };
};
let F = make(LOC);
export function setFormatLocale(l: string) { if (l !== LOC) { LOC = l; F = make(l); } }
export const currentLocale = () => LOC;

export const EUR = { format: (x: number) => F.eur.format(x) };
export const EUR0 = { format: (x: number) => F.eur0.format(x) };
export const N = { format: (x: number) => F.n.format(x) };
export const RATE = { format: (x: number) => F.rate.format(x) };

const at = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00+02:00` : iso);
const SQ_MONTHS = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];
const SQ_DAYS = ["e diel", "e hënë", "e martë", "e mërkurë", "e enjte", "e premte", "e shtunë"];
function sqDate(iso: string, o: Intl.DateTimeFormatOptions) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit" }).format(at(iso)).split("-").map(Number);
  if (o.month === "numeric") return `${d}.${String(m).padStart(2, "0")}.${y}`;
  const wd = o.weekday ? `${SQ_DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ` : "";
  const mon = o.month === "short" ? SQ_MONTHS[m - 1].slice(0, 3) : SQ_MONTHS[m - 1];
  return `${wd}${o.day ? `${d} ` : ""}${mon}${o.year ? ` ${y}` : ""}`;
}
export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  LOC.startsWith("sq") && !has(LOC) ? sqDate(iso, opts) : new Intl.DateTimeFormat(LOC, { timeZone: "Europe/Athens", ...opts }).format(at(iso));

/* Month name as a standalone word ("January", "январь", "一月"). Greek needs the nominative ("Ιανουάριος"), which Intl doesn't give. */
const EL_MONTHS = ["Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος", "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος"];
export const monthName = (iso: string) => {
  if (LOC.startsWith("el")) return EL_MONTHS[+iso.slice(5, 7) - 1] ?? "";
  if (LOC.startsWith("sq") && !has(LOC)) { const m = SQ_MONTHS[+iso.slice(5, 7) - 1] ?? ""; return m.charAt(0).toUpperCase() + m.slice(1); }
  const m = new Intl.DateTimeFormat(LOC, { month: "long", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 7)}-15T12:00:00Z`));
  return m.charAt(0).toLocaleUpperCase(LOC) + m.slice(1);
};
