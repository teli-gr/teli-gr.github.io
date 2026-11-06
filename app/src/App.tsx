import * as React from "react";
import { ArrowDown, ArrowUpRight, BellRing, Share2, ShieldAlert, ShieldCheck, HelpCircle, CalendarDays, CarFront, Check, ChevronDown, ChevronUp, CircleCheck, CircleDashed, Copy, Fuel, Globe, Info, ParkingSquare, Pencil, Plus, RefreshCw, TriangleAlert, Undo2, X, Zap } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioTile } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AADE, EV, FAQ_URLS } from "@/content/faq";
import { GUIDE_LINKS } from "@/content/guideLinks";
import { CREDIT } from "@/content/credit";
import { contactEmail } from "@/lib/consent";
import { HINTS, LANGS, suggestedLang, useI18n, useT, type Lang } from "@/i18n";
import type { Dict } from "@/i18n/el";
import { cn } from "@/lib/utils";
import { BandTable, EUR, EUR0, InfoTip, MotoIcon, N, PlateMark, Question, RATE, SectionCard, StepNumber, Stepper, fmtDate, monthName } from "@/components/bits";
import { CcChart, Co2Chart } from "@/components/TaxChart";
import { useGov } from "@/lib/gov";
import { track } from "@/lib/track";
import { AlertsCard, AlertVote } from "@/components/AlertsCard";
import { CookieBanner, PrivacyDialog } from "@/components/Privacy";
import { pushSupport } from "@/lib/alerts";
import {
  CO2_NAMES, athensToday, calc, co2Band, co2Tax, daysLeft, deadlineMs, isCo2Period, periodFor, round2, stageFor, stagePct, withFine,
  type Gov, type Kind, type Power, type Result,
} from "@/lib/tax";

/* ---------- state ---------- */
type Vehicle = { id: string; kind: Kind | null; year: string; fromNov: boolean | null; power: Power | null; co2: string; cc: string; name?: string; paidYear?: number };
type State = { vehicles: Vehicle[]; active: string; months: number; newCo2: string; text: "md" | "lg" | "xl"; touched: boolean };
const newId = () => Math.random().toString(36).slice(2, 9);
/* Nothing is pre-selected: the person answers every question themselves. */
const blankVehicle = (id = newId(), kind: Kind | null = null): Vehicle => ({ id, kind, year: "", fromNov: null, power: null, co2: "", cc: "" });
const START: State = { vehicles: [blankVehicle("v1")], active: "v1", months: 4, newCo2: "", text: "md", touched: false };
const KEY = "teli.v3";
function load(): State {
  // saved answers come back; an untouched old example does not
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.touched && Array.isArray(s.vehicles) && s.vehicles.length) return { ...START, ...s }; } catch { /* storage unavailable */ }
  return START;
}

/* ---------- derived per vehicle ---------- */
function evaluate(gov: Gov, v: Vehicle) {
  const yearNum = /^\d{4}$/.test(v.year) ? +v.year : null;
  const yearInvalid = v.year.length === 4 && (yearNum! < 1950 || yearNum! > gov.taxYear - 1);
  const needsMonth = v.kind === "car" && yearNum === 2010;
  const yearDone = !!yearNum && !yearInvalid && !(needsMonth && v.fromNov === null);
  const period = !v.kind || yearInvalid ? null : periodFor(v.kind, yearNum, needsMonth ? v.fromNov : null, gov.taxYear);
  const co2Mode = v.kind === "car" && isCo2Period(period);
  const needsValue = v.power !== "ev";
  const raw = co2Mode ? v.co2 : v.cc;
  const valueOk = !needsValue || (raw !== "" && (co2Mode ? +raw <= 600 : +raw >= 40 && +raw <= 9000));
  const result: Result | null = v.kind && period && v.power && valueOk ? calc(gov, v.kind, period, v.power, +raw || 0) : null;
  return { yearNum, yearInvalid, yearDone, needsMonth, period, co2Mode, needsValue, valueOk, result };
}
const vehicleName = (t: Dict, v: Vehicle, i: number) => v.name?.trim() ? v.name.trim() : t.vehicles.name(v.kind, /^\d{4}$/.test(v.year) ? v.year : null, i);
/* Official text arrives in Greek; show a translation when we have one, otherwise mark it as Greek. */
const govText = (t: Dict, lang: Lang, text: string) => ({ text: t.gov[text] ?? text, greek: lang !== "el" && !t.gov[text] });

/* ---------- reminders (no personal data in links) ---------- */
function reminderLinks(gov: Gov, t: Dict) {
  const shift = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const remindIso = shift(gov.deadline, -10), nextIso = shift(gov.deadline, -9); // all-day event 10 days before the deadline
  const ymd = (d: Date | string) => (typeof d === "string" ? d : d.toISOString().slice(0, 10)).replace(/-/g, "");
  const remind = remindIso, next = nextIso;
  const title = t.reminder.title(gov.taxYear);
  const body = t.reminder.body(fmtDate(gov.deadline, { day: "numeric", month: "numeric", year: "numeric" }));
  return {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${ymd(remind)}/${ymd(next)}&details=${encodeURIComponent(body)}`,
    outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${remindIso}&enddt=${nextIso}&allday=true&body=${encodeURIComponent(body)}`,
    ics: `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//teli-kykloforias//EL\r\nBEGIN:VEVENT\r\nUID:${gov.taxYear}-teli@teli\r\nDTSTAMP:${ymd(new Date())}T000000Z\r\nDTSTART;VALUE=DATE:${ymd(remind)}\r\nDTEND;VALUE=DATE:${ymd(next)}\r\nSUMMARY:${title}\r\nDESCRIPTION:${body}\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:PT9H\r\nDESCRIPTION:${title}\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`,
  };
}
const inClaude = () => typeof (window as unknown as { claude?: unknown }).claude !== "undefined";

/* ---------- app ---------- */
export default function App() {
  const { t, lang } = useI18n();
  const [privacyOpen, setPrivacyOpen] = React.useState(false);
  const [knowOpen, setKnowOpen] = React.useState(() => (typeof location !== "undefined" && location.hash === "#updates" ? "updates" : ""));
  /* «Απόρρητο» links from the guide pages land on /#privacy and open the notice. */
  React.useEffect(() => {
    const f = () => { if (location.hash === "#privacy") setPrivacyOpen(true); };
    f(); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f);
  }, []);
  const togglePrivacy = (o: boolean) => { setPrivacyOpen(o); if (!o && location.hash === "#privacy") history.replaceState(null, "", location.pathname + location.search); };
  const { gov, source } = useGov();
  const [s, setS] = React.useState<State>(load);
  const update = (patch: Partial<State>) => setS((p) => ({ ...p, touched: true, ...patch }));
  const patchV = (patch: Partial<Vehicle>) => setS((p) => ({ ...p, touched: true, vehicles: p.vehicles.map((v) => (v.id === p.active ? { ...v, ...patch } : v)) }));
  React.useEffect(() => { if (!s.touched) return; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }, [s]); // nothing is saved until the visitor types something
  React.useEffect(() => { document.documentElement.dataset.text = s.text; }, [s.text]);
  React.useEffect(() => { document.querySelectorAll(".plate-year").forEach((n) => (n.textContent = String(gov.taxYear))); document.title = t.meta.docTitle(gov.taxYear); }, [gov.taxYear, t]);

  const now = React.useMemo(() => new Date(), []);
  const stage = stageFor(gov, now);
  const days = daysLeft(gov, now);
  const deadlineLong = fmtDate(gov.deadline, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const deadlineShort = fmtDate(gov.deadline, { day: "numeric", month: "numeric", year: "numeric" });

  const vIndex = Math.max(0, s.vehicles.findIndex((v) => v.id === s.active));
  const v = s.vehicles[vIndex];
  const e = evaluate(gov, v);
  const { result } = e;
  const all = s.vehicles.map((x) => ({ v: x, e: evaluate(gov, x) }));
  const household = all.reduce((sum, x) => sum + (x.e.result?.tax ?? 0), 0);
  const householdReady = all.every((x) => x.e.result);

  const missing: { label: string; href: string }[] = [];
  if (!v.kind) missing.push({ label: t.missing.kind, href: "#q-kind" });
  if (!e.yearDone) missing.push({ label: e.needsMonth && v.fromNov === null ? t.missing.month2010 : t.missing.year, href: "#q-year" });
  if (!v.power) missing.push({ label: t.missing.power, href: "#q-power" });
  if (e.period && e.needsValue && !e.valueOk) missing.push({ label: e.co2Mode ? t.missing.co2 : t.missing.cc, href: "#q-value" });
  // a question turns into a green check once it is answered
  const done = { kind: !!v.kind, year: e.yearDone, power: !!v.power, value: e.needsValue && e.valueOk };
  const allExempt = all.length > 0 && all.every((x) => x.e.result?.exempt);

  const docBase = { year: v.year, cc: v.cc, co2: v.co2, power: v.power };
  const powerWord = v.power ? t.power[v.power] : "";
  const valueSummary = result?.basis === "co2" ? `${N.format(result.value)} ${t.units.gkm} CO₂` : result?.basis === "cc" ? `${N.format(result.value)} ${t.units.cc}` : "";
  const summary = result ? `${vehicleName(t, v, vIndex)} · ${powerWord}${valueSummary ? ` · ${valueSummary}` : ""}` : "";
  const payToday = result ? withFine(gov, result.tax, stagePct(gov, stage)) : 0;
  React.useEffect(() => { if (result && s.touched) track("result_shown", { basis: result.basis }, true); }, [result, s.touched]);

  // mobile sticky bar
  const answerRef = React.useRef<HTMLElement>(null);
  const [answerVisible, setAnswerVisible] = React.useState(true);
  React.useEffect(() => {
    const el = answerRef.current; if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([en]) => setAnswerVisible(en.isIntersecting), { threshold: 0.1 });
    io.observe(el); return () => io.disconnect();
  }, []);

  // phone bottom sheet
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const dragY = React.useRef<number | null>(null);

  // add / remove vehicles, with undo
  const [removed, setRemoved] = React.useState<{ vehicle: Vehicle; index: number } | null>(null);
  React.useEffect(() => { if (!removed) return; const t = setTimeout(() => setRemoved(null), 7000); return () => clearTimeout(t); }, [removed]);
  const addVehicle = (kind: Kind) => {
    const id = newId();
    update({ vehicles: [...s.vehicles, blankVehicle(id, kind)], active: id });
    setTimeout(() => document.getElementById("q-year")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const removeVehicle = (id: string) => {
    const index = s.vehicles.findIndex((x) => x.id === id); if (index < 0) return;
    setRemoved({ vehicle: s.vehicles[index], index });
    setS((p) => {
      const rest = p.vehicles.filter((x) => x.id !== id);
      if (!rest.length) { const fresh = blankVehicle(); return { ...p, touched: true, vehicles: [fresh], active: fresh.id }; }
      return { ...p, touched: true, vehicles: rest, active: p.active === id ? rest[Math.max(0, index - 1)].id : p.active };
    });
  };
  const undoRemove = () => {
    if (!removed) return;
    setS((p) => { const keep = p.vehicles.filter((x) => x.kind || x.power || x.year || x.co2 || x.cc); const list = [...keep]; list.splice(Math.min(removed.index, list.length), 0, removed.vehicle); return { ...p, vehicles: list, active: removed.vehicle.id }; });
    setRemoved(null);
  };

  const chip = "inline-flex min-h-8 items-center rounded-full border bg-card px-3 text-xs font-medium text-muted-foreground shadow-[0_1px_0_rgba(16,24,40,0.04)] transition-colors hover:border-brand hover:text-brand";
  const pad = { paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))", paddingRight: "max(1rem, env(safe-area-inset-right, 0px))" };
  const latest = [...gov.notices].sort((a, b) => b.date.localeCompare(a.date))[0];
  const latestText = latest ? govText(t, lang, latest.title) : null;

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      {/* header */}
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 py-3" style={pad}>
          <PlateMark />
          <span className="hidden text-base font-semibold text-muted-foreground lg:block">{t.header.tagline}</span>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <LangSelect />
            <span id="textsize-label" className="hidden text-sm font-medium text-muted-foreground xl:inline">{t.header.textSize}</span>
            <ToggleGroup className="hidden sm:inline-flex" type="single" value={s.text} onValueChange={(val) => val && setS((p) => ({ ...p, text: val as State["text"] }))} aria-label={t.header.textSize}>
              <ToggleGroupItem value="md" aria-label={t.header.textNormal} title={t.header.textNormalShort} className="text-sm">{t.header.glyph}</ToggleGroupItem>
              <ToggleGroupItem value="lg" aria-label={t.header.textLarger} title={t.header.textLargerShort} className="text-base">{t.header.glyph}+</ToggleGroupItem>
              <ToggleGroupItem value="xl" aria-label={t.header.textLargest} title={t.header.textLargestShort} className="text-lg">{t.header.glyph}++</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </header>
      <LangHint />

      <main className="mx-auto grid max-w-6xl gap-6 py-8" style={pad}>
        {/* intro */}
        <section className="grid gap-4">
          <h1 className="max-w-[22ch] text-[1.75rem] font-extrabold leading-[1.1] tracking-tight text-balance sm:text-4xl">{t.intro.h1(gov.taxYear)}</h1>
          {/* freshness stamp under the title: when the data was last checked against AADE, and that we are not AADE */}
          <p className="-mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            <span>{t.intro.trust(fmtDate(gov.checkedAt, { day: "numeric", month: "short", year: "numeric" }))}</span>
          </p>
          <p className="max-w-[62ch] text-base text-muted-foreground sm:text-lg">{t.intro.lead(e.needsValue ? 4 : 3)}</p>
          <div className={cn("grid gap-2 rounded-2xl border-2 px-4 py-3", stage === 0 ? "border-[hsl(146_45%_80%)] bg-brand-soft" : "border-[hsl(4_70%_85%)] bg-danger-soft")}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <CalendarDays className={cn("size-5 shrink-0", stage === 0 ? "text-brand" : "text-danger")} aria-hidden="true" />
              {stage === 0 ? (
                <>
                  <span><strong className="font-bold">{t.intro.deadline}</strong> {deadlineLong}</span>
                  <Badge variant="solid" className="num">{t.intro.daysLeft(days)}</Badge>
                </>
              ) : (
                <span><strong className="font-bold">{t.intro.expired(deadlineShort, Math.round(stagePct(gov, stage) * 100))[0]}</strong> {t.intro.expired(deadlineShort, Math.round(stagePct(gov, stage) * 100))[1]}</span>
              )}
            </div>
            {latest && latestText && (
              <a href="#updates" onClick={() => setKnowOpen("updates")} className="flex flex-wrap items-baseline gap-x-2 text-sm text-foreground/85 underline-offset-4 hover:underline">
                <span className="inline-flex items-center gap-1.5 font-semibold"><span className={cn("size-2 rounded-full", source === "live" ? "bg-brand" : "bg-muted-foreground")} aria-hidden="true" />{t.intro.latest(fmtDate(latest.date, { day: "numeric", month: "short" }))}</span>
                <span lang={latestText.greek ? "el" : undefined}>{latestText.text}{latestText.greek && <span className="ml-1 text-muted-foreground">({t.inGreekTag})</span>}</span>
              </a>
            )}
          </div>
          {lang !== "el" && (
            <Accordion type="single" collapsible className="rounded-2xl border bg-card px-4">
              <AccordionItem value="guide" className="border-0">
                <AccordionTrigger level={2} className="gap-3"><span className="flex items-center gap-2"><Info className="size-5 shrink-0 text-brand" aria-hidden="true" />{t.guide.title}</span></AccordionTrigger>
                <AccordionContent>
                  <ul className="m-0 grid list-none gap-2.5 p-0">
                    {t.guide.items(gov.taxYear, deadlineShort).map((g, i) => <li key={i} className="flex gap-3"><StepNumber n={i + 1} done={false} /><span className="pt-1">{g}</span></li>)}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-x-8">
          {/* questions */}
          <div className="order-1 grid min-w-0 gap-4 lg:order-none lg:col-start-1 lg:row-start-1">

            {/* household: one chip per vehicle, each with its own remove button; quick add for car or motorbike */}
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2" role="group" aria-labelledby="vehicles-label">
              <span id="vehicles-label" className="text-sm font-semibold text-muted-foreground">{t.vehicles.label}</span>
              <div className="flex flex-wrap items-center gap-2">
                {all.map(({ v: x, e: xe }, i) => (
                  <VehicleChip key={x.id} kind={x.kind} name={vehicleName(t, x, i)} custom={x.name ?? ""} auto={vehicleName(t, { ...x, name: undefined }, i)}
                    amount={xe.result ? EUR.format(xe.result.tax) : null} on={x.id === v.id}
                    canRemove={s.vehicles.length > 1 || !!(x.kind || x.power || x.year || x.co2 || x.cc)}
                    onSelect={() => setS((p) => ({ ...p, active: x.id }))} onRemove={() => removeVehicle(x.id)}
                    onRename={(name) => setS((p) => ({ ...p, touched: true, vehicles: p.vehicles.map((y) => (y.id === x.id ? { ...y, name: name || undefined } : y)) }))} />
                ))}
                {s.vehicles.length < 6 && (
                  <>
                    <Button type="button" variant="outline" size="sm" className="h-11 rounded-full" onClick={() => addVehicle("car")}><Plus /><CarFront aria-hidden="true" /> {t.vehicles.car}</Button>
                    <Button type="button" variant="outline" size="sm" className="h-11 rounded-full" onClick={() => addVehicle("moto")}><Plus /><MotoIcon className="size-4" /> {t.vehicles.moto}</Button>
                  </>
                )}
              </div>
            </div>

            <Question id="q-kind" n={1} title={t.q.kind.title} help={t.q.kind.help} tip={t.q.kind.tip} done={done.kind}>
              <RadioGroup value={v.kind ?? ""} onValueChange={(val) => patchV({ kind: val as Kind })} aria-label={t.q.kind.aria} className="sm:grid-cols-2">
                <RadioTile value="car"><CarFront className="size-6" aria-hidden="true" /><span className="text-base font-semibold">{t.vehicles.car}</span></RadioTile>
                <RadioTile value="moto"><MotoIcon className="size-6" /><span className="text-base font-semibold">{t.vehicles.moto}</span></RadioTile>
              </RadioGroup>
            </Question>

            <Question id="q-year" n={2} title={t.q.year.title} help={t.q.year.help} tip={t.q.year.tip} done={done.year} docProps={{ ...docBase, highlight: "B" }}>
              <Stepper id="year" label={t.q.year.label} value={v.year} onChange={(val) => patchV({ year: val.slice(0, 4), fromNov: null })} min={1950} max={gov.taxYear - 1} start={2015} placeholder={t.q.year.placeholder} invalid={e.yearInvalid} describedBy="year-note" maxLen={4} />
              <p id="year-note" className={cn("text-base", e.yearInvalid ? "font-semibold text-danger" : "text-muted-foreground")} aria-live="polite">
                {e.yearInvalid ? t.q.year.invalid(gov.taxYear - 1)
                  : e.period ? (e.co2Mode ? t.q.year.byCo2 : t.q.year.byCc)
                  : e.needsMonth ? t.q.year.need2010 : t.q.year.type4}
              </p>
              {e.needsMonth && (
                <RadioGroup value={v.fromNov === null ? "" : v.fromNov ? "after" : "before"} onValueChange={(val) => patchV({ fromNov: val === "after" })} aria-label={t.q.year.when2010} className="sm:grid-cols-2">
                  <RadioTile value="before"><span className="grid"><span className="font-semibold">{t.q.year.before}</span><span className="text-sm text-muted-foreground">{t.q.year.beforeSub}</span></span></RadioTile>
                  <RadioTile value="after"><span className="grid"><span className="font-semibold">{t.q.year.after}</span><span className="text-sm text-muted-foreground">{t.q.year.afterSub}</span></span></RadioTile>
                </RadioGroup>
              )}
            </Question>

            <Question id="q-power" n={3} title={t.q.power.title} help={t.q.power.help} done={done.power} docProps={{ ...docBase, highlight: "P.3" }}>
              <RadioGroup value={v.power ?? ""} onValueChange={(val) => patchV({ power: val as Power })} aria-label={t.q.power.aria}>
                <RadioTile value="ice"><Fuel className="size-6" aria-hidden="true" /><span className="grid"><span className="font-semibold">{t.q.power.ice}</span><span className="text-sm text-muted-foreground">{t.q.power.iceSub}</span></span></RadioTile>
                <RadioTile value="hybrid"><span className="relative size-6" aria-hidden="true"><Fuel className="size-6" /><Zap className="absolute -bottom-1 -right-1 size-4 rounded-full bg-card text-brand" /></span><span className="grid"><span className="font-semibold">{t.q.power.hybrid}</span><span className="text-sm text-muted-foreground">{t.q.power.hybridSub}</span></span></RadioTile>
                <RadioTile value="ev"><Zap className="size-6" aria-hidden="true" /><span className="grid"><span className="font-semibold">{t.q.power.ev}</span><span className="text-sm text-muted-foreground">{t.q.power.evSub}</span></span></RadioTile>
              </RadioGroup>
            </Question>

            {e.needsValue && e.period && (
              <Question id="q-value" n={4} done={done.value}
                title={e.co2Mode ? t.q.value.co2Title : t.q.value.ccTitle}
                help={e.co2Mode ? t.q.value.co2Help : t.q.value.ccHelp}
                docProps={{ ...docBase, highlight: e.co2Mode ? "V.7" : "P.1" }}>
                {e.co2Mode
                  ? <Stepper id="co2" label={t.q.value.co2Label} value={v.co2} onChange={(val) => patchV({ co2: val.slice(0, 3) })} min={0} max={600} start={130} unit={t.units.gkm} placeholder={t.q.value.co2Placeholder} maxLen={3} />
                  : <Stepper id="cc" label={t.q.value.ccLabel} value={v.cc} onChange={(val) => patchV({ cc: val.slice(0, 4) })} min={50} max={9000} step={50} start={1400} unit={t.units.cc} placeholder={t.q.value.ccPlaceholder} maxLen={4} />}
              </Question>
            )}
          </div>

          {/* answer */}
          <aside ref={answerRef} id="answer" className="order-2 min-w-0 scroll-mt-4 lg:order-none lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start" aria-live="polite" aria-label={t.answer.region}>
            <AnswerCard gov={gov} result={result} summary={summary} name={vehicleName(t, v, vIndex)} stage={stage} days={days} deadlineShort={deadlineShort}
              payToday={payToday} missing={missing} household={householdReady && s.vehicles.length > 1 ? { total: household, count: s.vehicles.length } : null}
              paid={v.paidYear === gov.taxYear} setPaid={(p) => patchV({ paidYear: p ? gov.taxYear : undefined })} isMoto={v.kind === "moto"} onAdd={s.vehicles.length < 6 ? addVehicle : undefined} />
          </aside>

          {/* everything that helps after the answer */}
          <div className="order-3 grid min-w-0 gap-4 lg:order-none lg:col-start-1 lg:row-start-2">
            {result && result.basis !== "none" && <WhyCard gov={gov} result={result} textScale={s.text} />}
            {!allExempt && <AlertsCard gov={gov} amount={result && !result.exempt ? result.tax : null} paid={v.paidYear === gov.taxYear} />}
            {result && !result.exempt && <SaverCard gov={gov} tax={result.tax} months={s.months} setMonths={(m) => update({ months: m })} />}
            <NewCarCard gov={gov} value={s.newCo2} setValue={(val) => update({ newCo2: val })} current={result} textScale={s.text} />

            <Card id="help" className="scroll-mt-4">
              <CardContent className="grid gap-1 pb-2 sm:pb-3">
                <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight"><HelpCircle className="size-5 text-brand" aria-hidden="true" />{t.help.title}</h2>
                <Accordion type="single" collapsible>
                  {t.faq.map((f, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger>{f.q}</AccordionTrigger>
                      <AccordionContent className="grid gap-2">
                        {f.a.split("\n").map((line, j) => <p key={j} className="m-0">{line}</p>)}
                        <a className="text-sm font-semibold text-brand underline underline-offset-4" href={FAQ_URLS[f.src]} target="_blank" rel="noopener">{t.help.source(t.faqSources[f.src])}</a>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="grid gap-1 pb-2 sm:pb-3">
                <h2 className="text-xl font-bold tracking-tight">{t.know.title}</h2>
                <Accordion type="single" collapsible value={knowOpen} onValueChange={setKnowOpen}>
                  <AccordionItem value="scam">
                    <AccordionTrigger><span className="flex items-center gap-2"><ShieldAlert className="size-5 shrink-0 text-danger" aria-hidden="true" />{t.know.scamTitle}</span></AccordionTrigger>
                    <AccordionContent className="grid gap-3">
                      <ul className="m-0 grid list-none gap-2 p-0">
                        {t.know.scam.map((x, i) => <li key={i} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" /><span>{x}</span></li>)}
                      </ul>
                      <a className="text-sm font-semibold text-brand underline underline-offset-4" href={FAQ_URLS.aadeScam} target="_blank" rel="noopener">{t.help.source(t.know.scamSource)}</a>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="late">
                    <AccordionTrigger>{t.know.late}</AccordionTrigger>
                    <AccordionContent><LateTable gov={gov} tax={result?.tax ?? null} stage={stage} /></AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="how">
                    <AccordionTrigger>{t.know.how}</AccordionTrigger>
                    <AccordionContent>
                      <ol className="m-0 grid list-none gap-4 p-0">
                        {t.know.steps.map((step, i) => (<li key={i} className="flex gap-3"><StepNumber n={i + 1} done={false} /><span className="pt-1">{step}</span></li>))}
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="updates" id="updates" className="scroll-mt-4">
                    <AccordionTrigger>{t.know.updates}</AccordionTrigger>
                    <AccordionContent className="grid gap-3">
                      <ul className="m-0 grid list-none gap-3 p-0">
                        {[...gov.notices].sort((a, b) => b.date.localeCompare(a.date)).map((n, i) => { const nt = govText(t, lang, n.title); return (
                          <li key={i} className="grid gap-0.5 rounded-xl border px-4 py-3">
                            <span className="text-sm font-semibold text-muted-foreground">{fmtDate(n.date)}</span>
                            <span lang={nt.greek ? "el" : undefined}>{nt.text}{nt.greek && <span className="ml-1 text-sm text-muted-foreground">({t.inGreekTag})</span>}</span>
                            {n.url && <a className="text-sm font-semibold text-brand underline underline-offset-4" href={n.url} target="_blank" rel="noopener">{t.know.source(n.source)}{lang !== "el" ? ` (${t.inGreekTag})` : ""}</a>}
                          </li>
                        ); })}
                      </ul>
                      <FreshnessNote gov={gov} source={source} />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="sure">
                    <AccordionTrigger>{t.know.sure}</AccordionTrigger>
                    <AccordionContent className="grid gap-3">
                      <p>{t.know.sureText}</p>
                      <ul className="m-0 grid list-none gap-1 p-0 text-sm">
                        {gov.sources.map((src) => (<li key={src.url}><a className="font-semibold text-brand underline underline-offset-4" href={src.url} target="_blank" rel="noopener">{govText(t, lang, src.label).text}</a></li>))}
                      </ul>
                      <FreshnessNote gov={gov} source={source} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="mx-auto mt-10 grid max-w-3xl justify-items-center gap-5 pb-10 text-center" style={pad}>
        <nav aria-label={t.footer.guides} className="flex flex-wrap items-center justify-center gap-2">
          {!inClaude() && lang !== "el" && <span className="text-xs text-muted-foreground">{t.footer.guides}:</span>}
          {!inClaude() && GUIDE_LINKS.map((g) => <a key={g.slug} href={`/odigos/${g.slug}/`} lang="el" className={chip}>{g.label}</a>)}
          <button type="button" onClick={() => setPrivacyOpen(true)} className={chip}>{t.footer.privacy}</button>
          {contactEmail() && <a href={`mailto:${contactEmail()}?subject=${encodeURIComponent(t.meta.appName(gov.taxYear))}`} onClick={() => track("feedback_click")} className={chip}>{t.footer.feedback}</a>}
        </nav>
        {/* Signature: "made with love by" + the credit as a mini Greek number plate, like the logo */}
        <a href={CREDIT.url} target="_blank" rel="noopener" onClick={() => track("credit_click")} className="group inline-flex min-h-10 items-center gap-1 rounded-md text-sm text-muted-foreground">
          {t.footer.madeBy.split(/(\{heart\}|\{site\})/).map((part, i) =>
            part === "{heart}" ? (
              <span key={i} className="inline-flex">
                <svg viewBox="0 0 24 24" className="size-4 fill-[#e5484d] transition-transform duration-300 group-hover:scale-125 motion-reduce:transition-none motion-reduce:group-hover:scale-100" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.1c2-.2 3.9.8 5.4 2.6 1.5-1.8 3.4-2.8 5.4-2.6 3.7.4 5.7 4.3 4.2 7.7C19.5 16.4 12 21 12 21z" /></svg>
                <span className="sr-only">{t.footer.heart}</span>
              </span>
            ) : part === "{site}" ? (
              <span key={i} className="ml-1 inline-flex h-7 items-stretch overflow-hidden rounded-[5px] border-2 border-foreground bg-white shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
                <span className="flex w-4 flex-col items-center justify-center gap-px bg-eu" aria-hidden="true">
                  <svg viewBox="0 0 20 20" className="size-2.5">{Array.from({ length: 12 }).map((_, k) => { const r = (k / 12) * Math.PI * 2; return <circle key={k} cx={10 + 7 * Math.cos(r)} cy={10 + 7 * Math.sin(r)} r="1.6" fill="#ffcc00" />; })}</svg>
                  <span className="font-plate text-[7px] font-bold leading-none text-white">GR</span>
                </span>
                <span className="flex items-center px-2 font-plate text-[13px] font-bold uppercase tracking-wider text-foreground">{CREDIT.label}</span>
              </span>
            ) : part ? <span key={i}>{part}</span> : null,
          )}
        </a>
      </footer>
      <PrivacyDialog open={privacyOpen} onOpenChange={togglePrivacy} />
      <CookieBanner onMore={() => setPrivacyOpen(true)} />

      {/* undo after removing a vehicle */}
      {removed && (
        <div role="status" className="fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 lg:bottom-6">
          <div className="flex items-center gap-3 rounded-xl bg-foreground px-4 py-2.5 text-sm text-white shadow-lg">
            <span>{t.vehicles.removed(vehicleName(t, removed.vehicle, removed.index))}</span>
            <button type="button" onClick={undoRemove} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 font-semibold text-primary hover:bg-white/10"><Undo2 className="size-4" aria-hidden="true" />{t.vehicles.undo}</button>
          </div>
        </div>
      )}

      {/* phone: a peek bar you swipe up (or tap) to open the full answer as a bottom sheet */}
      {result && (
        <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
          <div hidden={answerVisible && !sheetOpen} className="fixed inset-x-0 bottom-0 z-20 rounded-t-2xl border-t bg-card shadow-[0_-8px_24px_rgba(16,24,40,0.08)] lg:hidden" style={{ ...pad, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            onPointerDown={(ev) => { dragY.current = ev.clientY; }}
            onPointerMove={(ev) => { if (dragY.current !== null && dragY.current - ev.clientY > 24) { dragY.current = null; setSheetOpen(true); } }}
            onPointerUp={() => { dragY.current = null; }}>
            <DrawerTrigger asChild>
              <button type="button" className="mx-auto grid w-full max-w-6xl gap-2 pb-3 pt-2 text-left" aria-label={t.answer.peekAria(EUR.format(result.tax))}>
                <span className="mx-auto h-1.5 w-12 rounded-full bg-input" aria-hidden="true" />
                <span className="flex items-center gap-3">
                  <span className="grid min-w-0">
                    <span className="text-sm text-muted-foreground">{result.exempt ? t.answer.peekExempt : t.answer.peekPay(deadlineShort)}</span>
                    <span className={cn("num text-2xl font-extrabold leading-tight", result.exempt && "text-brand")}>{EUR.format(result.tax)}</span>
                  </span>
                  <span className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary px-4 font-semibold text-primary-foreground"><ChevronUp className="size-5" aria-hidden="true" />{t.answer.details}</span>
                </span>
              </button>
            </DrawerTrigger>
          </div>
          <DrawerContent>
            <DrawerHeader className="sr-only"><DrawerTitle>{t.answer.title}</DrawerTitle><DrawerDescription>{t.answer.sheetDesc}</DrawerDescription></DrawerHeader>
            <div className="overflow-y-auto px-3 pb-4 pt-3">
              <AnswerCard gov={gov} result={result} summary={summary} name={vehicleName(t, v, vIndex)} stage={stage} days={days} deadlineShort={deadlineShort}
                payToday={payToday} missing={missing} household={householdReady && s.vehicles.length > 1 ? { total: household, count: s.vehicles.length } : null}
              paid={v.paidYear === gov.taxYear} setPaid={(p) => patchV({ paidYear: p ? gov.taxYear : undefined })} isMoto={v.kind === "moto"} onAdd={s.vehicles.length < 6 ? (k) => { setSheetOpen(false); addVehicle(k); } : undefined} />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

/* ---------- language ---------- */
function LangSelect() {
  const { lang, setLang, t } = useI18n();
  return (
    <label className="relative inline-flex h-11 items-center">
      <span className="sr-only">{t.header.language}</span>
      <Globe className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden="true" />
      <select value={lang} onChange={(ev) => { track("language", { to: ev.target.value }); setLang(ev.target.value as Lang); }}
        style={{ fontFamily: "system-ui, sans-serif" }} className="h-11 cursor-pointer appearance-none rounded-lg border bg-card pl-9 pr-9 text-sm font-semibold text-foreground hover:border-input focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-soft focus-visible:border-ring">
        {LANGS.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.native}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-muted-foreground" aria-hidden="true" />
    </label>
  );
}

/* One-time hint when the browser speaks a language we have a page for. */
function LangHint() {
  const { lang, setLang, hasPref, dismissHint } = useI18n();
  const [sug] = React.useState(() => suggestedLang(lang));
  if (hasPref || !sug) return null;
  const d = { langHint: HINTS[sug] };
  return (
    <div className="border-b bg-brand-soft" lang={sug}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <Globe className="size-5 shrink-0 text-brand" aria-hidden="true" />
        <span className="font-semibold">{d.langHint.text}</span>
        <span className="flex gap-2">
          <Button type="button" size="sm" onClick={() => { track("language", { to: sug, via: "hint" }); setLang(sug); }}>{d.langHint.yes}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={dismissHint}>{d.langHint.no}</Button>
        </span>
      </div>
    </div>
  );
}

/* ---------- a vehicle chip: select, rename in place, remove ---------- */
function VehicleChip({ kind, name, custom, auto, amount, on, canRemove, onSelect, onRemove, onRename }: {
  kind: Kind | null; name: string; custom: string; auto: string; amount: string | null; on: boolean; canRemove: boolean;
  onSelect: () => void; onRemove: () => void; onRename: (name: string) => void;
}) {
  const t = useT();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const input = React.useRef<HTMLInputElement>(null);
  const cancelled = React.useRef(false);
  React.useEffect(() => { if (editing) { input.current?.focus(); input.current?.select(); } }, [editing]);
  const start = () => { cancelled.current = false; setDraft(custom || auto); setEditing(true); };
  const commit = () => { if (cancelled.current) return; const n = draft.trim(); onRename(n === auto ? "" : n); setEditing(false); };
  const icon = kind === "car" ? <CarFront className="size-4 shrink-0" aria-hidden="true" /> : kind === "moto" ? <MotoIcon className="size-4 shrink-0" /> : <CircleDashed className="size-4 shrink-0" aria-hidden="true" />;
  const quiet = on ? "text-white/80 hover:bg-white/15 hover:text-white" : "text-muted-foreground hover:bg-secondary hover:text-foreground";
  return (
    <div className={cn("inline-flex h-11 min-w-0 max-w-full items-center rounded-full border pl-1 transition-colors", on ? "border-foreground bg-foreground text-white" : "bg-card hover:border-input")}>
      {editing ? (
        <form className="inline-flex min-w-0 items-center gap-1.5 pl-2.5" onSubmit={(ev) => { ev.preventDefault(); commit(); }}>
          {icon}
          <input ref={input} value={draft} maxLength={24} size={Math.min(24, Math.max(8, draft.length + 1))} aria-label={t.vehicles.nameLabel} placeholder={t.vehicles.namePlaceholder}
            onChange={(ev) => setDraft(ev.target.value)} onBlur={commit}
            onKeyDown={(ev) => { if (ev.key === "Escape") { cancelled.current = true; setEditing(false); } }}
            className="h-8 min-w-0 rounded-md bg-white px-2 text-sm font-semibold text-foreground outline-none ring-2 ring-primary" />
          <button type="submit" onMouseDown={(ev) => ev.preventDefault()} aria-label={t.vehicles.renameSave} title={t.vehicles.renameSave} className={cn("mr-1 grid size-9 place-items-center rounded-full", quiet)}><Check className="size-4" aria-hidden="true" /></button>
        </form>
      ) : (
        <>
          <button type="button" aria-pressed={on} onClick={on ? start : onSelect} title={on ? t.vehicles.renameShort : undefined} className="inline-flex h-9 min-w-0 items-center gap-2 rounded-full px-3 text-sm font-semibold">
            {icon}<span className="truncate">{name}</span>
            {amount && <span className={cn("num shrink-0", on ? "text-white/80" : "text-muted-foreground")}>· {amount}</span>}
          </button>
          {on && <button type="button" onClick={start} aria-label={t.vehicles.rename(name)} title={t.vehicles.renameShort} className={cn("grid size-9 shrink-0 place-items-center rounded-full", quiet)}><Pencil className="size-4" aria-hidden="true" /></button>}
          {canRemove && (
            <button type="button" aria-label={t.vehicles.remove(name)} title={t.vehicles.removeShort} onClick={onRemove}
              className={cn("mr-1 grid size-9 shrink-0 place-items-center rounded-full transition-colors", on ? "text-white/80 hover:bg-white/15 hover:text-white" : "text-muted-foreground hover:bg-danger-soft hover:text-danger")}>
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- answer ---------- */
function AnswerCard({ gov, result, summary, name, stage, days, deadlineShort, payToday, missing, household, paid, setPaid, isMoto, onAdd }: {
  gov: Gov; result: Result | null; summary: string; name: string; stage: number; days: number; deadlineShort: string; payToday: number;
  missing: { label: string; href: string }[]; household: { total: number; count: number } | null;
  paid: boolean; setPaid: (p: boolean) => void; isMoto: boolean; onAdd?: (k: Kind) => void;
}) {
  const t = useT();
  const [copied, setCopied] = React.useState<"idle" | "ok" | "manual">("idle");
  const links = React.useMemo(() => reminderLinks(gov, t), [gov, t]);
  const pageUrl = typeof location !== "undefined" ? location.origin + location.pathname : "";
  const shareText = result ? t.answer.familyText(gov.taxYear, EUR.format(result.tax), summary, deadlineShort, pageUrl) : "";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function" && !inClaude();
  const share = async () => { track("share_family"); try { await navigator.share({ text: shareText }); } catch { /* closed */ } };
  const copy = async () => { track("share_copy"); try { await navigator.clipboard.writeText(shareText); setCopied("ok"); setTimeout(() => setCopied("idle"), 2500); } catch { setCopied("manual"); } };
  const saveIcs = () => { track("reminder_ics"); const blob = new Blob([links.ics], { type: "text/calendar" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `teli-kykloforias-${gov.taxYear}.ics`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  const stagesAll = [{ label: t.answer.until(deadlineShort), pct: 0 }, ...gov.stages.map((st, i) => ({ label: i === gov.stages.length - 1 ? t.answer.from(fmtDate(st.from, { day: "numeric", month: "long" })) : monthName(st.from), pct: st.pct }))];
  const vals = result ? stagesAll.map((st) => withFine(gov, result.tax, st.pct)) : [];
  const max = Math.max(1, ...vals);
  const bigMoto = isMoto && result?.basis === "cc" && result.value > 1357;
  const reason = result?.reason ? (result.reason === "hybridSmall" ? t.reasons.hybridSmall(N.format(gov.hybridExemptMaxCc)) : t.reasons[result.reason]) : "";
  return (
    <Card className="overflow-hidden border-2 border-foreground/90">
      <div className="flex items-center justify-between gap-3 border-b bg-foreground px-5 py-3 text-white">
        <span className="min-w-0 truncate font-bold">{result ? name : t.answer.title}</span>
        <span className="shrink-0 text-sm font-semibold text-white/80">{t.answer.forYear(gov.taxYear)}</span>
      </div>
      <CardContent className="grid gap-5">
        {!result ? (
          <div className="grid gap-3">
            <p className="text-lg font-semibold">{missing.length >= 3 ? t.answer.start : t.answer.almost}</p>
            <ul className="m-0 grid list-none gap-2 p-0">
              {missing.map((m) => (<li key={m.label}><a href={m.href} className="flex min-h-12 items-center gap-3 rounded-xl border-2 border-dashed border-input px-4 font-semibold hover:border-brand"><ArrowDown className="size-5 text-muted-foreground" aria-hidden="true" />{m.label}</a></li>))}
            </ul>
          </div>
        ) : (
          <>
            <div className="grid gap-1.5">
              <span className="font-semibold text-muted-foreground">{result.exempt ? t.answer.exemptLead : paid ? t.answer.paidLead : t.answer.payLead}</span>
              <span className={cn("num text-[2.75rem] font-extrabold leading-none tracking-tight", result.exempt && "text-brand")}>{EUR.format(result.tax)}</span>
              <span className="text-muted-foreground">{summary.startsWith(`${name} · `) ? summary.slice(name.length + 3) : summary}</span>
              {!result.exempt && <span className="text-sm text-muted-foreground">{t.answer.estimate}</span>}
              {bigMoto && <p className="mt-1 flex gap-2 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{t.answer.bigMoto}</span></p>}
            </div>

            {/* nothing to pay: say so clearly, explain why, and what to check */}
            {result.exempt && (
              <div className="grid gap-3 rounded-xl border border-[hsl(146_50%_78%)] bg-brand-soft px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="animate-pop grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white" aria-hidden="true"><Check className="size-6" strokeWidth={3} /></span>
                  <div className="grid gap-1">
                    <p className="m-0 flex items-center text-lg font-bold">{t.answer.nothingTitle}<InfoTip className="ml-0.5">{t.answer.nothingCheck}</InfoTip></p>
                    <p className="m-0">{reason} {t.answer.nothingText(gov.taxYear)}</p>
                  </div>
                </div>
              </div>
            )}
            {result.exempt && onAdd && (
              <div className="grid gap-2">
                <span className="text-sm font-semibold text-muted-foreground">{t.answer.another}</span>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => onAdd("car")}><Plus /><CarFront aria-hidden="true" /> {t.vehicles.car}</Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => onAdd("moto")}><Plus /><MotoIcon className="size-4" /> {t.vehicles.moto}</Button>
                </div>
              </div>
            )}

            {!result.exempt && paid && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-soft px-4 py-3">
                <span className="flex items-center gap-2 font-semibold text-brand"><CircleCheck className="size-5" aria-hidden="true" />{t.answer.markedPaid}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPaid(false)}>{t.answer.undo}</Button>
              </div>
            )}

            {!result.exempt && !paid && (
              <>
                <div className={cn("grid gap-0.5 rounded-xl px-4 py-3", stage === 0 ? "bg-secondary" : "bg-danger-soft")}>
                  {stage === 0 ? (<><strong>{t.answer.payBy(deadlineShort)}</strong><span className="text-sm text-muted-foreground num">{t.answer.surchargeIn(days)}</span></>)
                    : (<><strong className="text-danger num">{t.answer.today(EUR.format(payToday))}</strong><span className="text-sm">{t.answer.lateNote}</span></>)}
                </div>
                <div className="grid gap-2">
                  <Button asChild size="lg" className="w-full"><a href={AADE.mycar} target="_blank" rel="noopener" onClick={() => track("pay_click")}>{t.answer.pay} <ArrowUpRight /></a></Button>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-brand" aria-hidden="true" />{t.answer.official}<InfoTip className="-ml-1">{t.answer.officialTip}</InfoTip></span>
                    <span className="inline-flex items-center"><a href={AADE.noCodes} target="_blank" rel="noopener" onClick={() => track("pay_nocodes_click")} className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand underline underline-offset-4">{t.answer.noCodes}<ArrowUpRight className="size-4 shrink-0" aria-hidden="true" /></a><InfoTip>{t.answer.noCodesTip}</InfoTip></span>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="justify-self-center" onClick={() => { setPaid(true); track("marked_paid"); }}><Check /> {t.answer.iPaid}</Button>
                </div>

                {stage === 0 && (
                  <div className="grid gap-2 rounded-xl border px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-semibold"><BellRing className="size-4 text-brand" aria-hidden="true" />{t.answer.reminder}<InfoTip className="-ml-1.5">{t.answer.reminderTip}</InfoTip></span>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm"><a href={links.google} target="_blank" rel="noopener" onClick={() => track("reminder_google")}>Google Calendar</a></Button>
                      <Button asChild variant="outline" size="sm"><a href={links.outlook} target="_blank" rel="noopener" onClick={() => track("reminder_outlook")}>Outlook</a></Button>
                      {!inClaude() && <Button type="button" variant="outline" size="sm" onClick={saveIcs}>iPhone / Mac (.ics)</Button>}
                    </div>
                    {pushSupport() === "not-configured" ? <AlertVote /> : <a href="#alerts" className="text-sm font-semibold text-brand underline underline-offset-4">{t.answer.alertsOn}</a>}
                  </div>
                )}

                <div className="grid gap-2">
                  <span className="text-sm font-semibold text-muted-foreground">{t.answer.ifLate}</span>
                  {stagesAll.map((st, i) => (
                    <div key={st.label} className={cn("grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1.5", i === stage && "bg-secondary")}>
                      <span className="text-sm leading-tight">{st.label}{st.pct > 0 && <span className="block text-xs text-muted-foreground">+{Math.round(st.pct * 100)}%</span>}</span>
                      <span className="h-2.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true"><span className={cn("block h-full rounded-full", i === 0 ? "bg-brand" : i === stagesAll.length - 1 ? "bg-danger" : "bg-warn")} style={{ width: `${Math.max(4, (vals[i] / max) * 100)}%` }} /></span>
                      <span className="num text-right font-semibold">{EUR.format(vals[i])}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {canShare ? (
              <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={share}><Share2 /> {t.answer.family}</Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={copy}>
                {copied === "ok" ? <><Check /> {t.answer.copied}</> : <><Copy /> {t.answer.family}</>}
              </Button>
            )}
            {copied === "manual" && <textarea readOnly className="w-full rounded-lg border p-2 text-sm" rows={3} value={shareText} onFocus={(ev) => ev.currentTarget.select()} aria-label={t.answer.copyArea} />}

            {household && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-soft px-4 py-3">
                <span className="font-semibold">{t.answer.all(household.count)}</span>
                <span className="num text-lg font-extrabold">{EUR.format(household.total)}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- why this amount ---------- */
function WhyCard({ gov, result, textScale }: { gov: Gov; result: Extract<Result, { basis: "co2" | "cc" }>; textScale: string }) {
  const t = useT();
  const [showTable, setShowTable] = React.useState(false);
  if (result.basis === "co2") {
    const bands = gov.co2[result.table];
    const next = bands[result.band.i + 1];
    const nextTax = next ? co2Tax(gov, result.table, next[0]) : null;
    const toNext = next ? next[0] - result.value : null;
    const prevSave = result.value === result.band.lo && result.band.i > 0 ? round2(result.tax - co2Tax(gov, result.table, result.value - 1)) : 0;
    return (
      <SectionCard title={t.why.title} eyebrow={t.why.eyebrow}>
        <p>{t.why.co2Intro} <strong className="num">{N.format(result.value)} × {RATE.format(result.band.rate)} € = {EUR.format(result.tax)}</strong>. {t.why.co2Jump}</p>
        <Co2Chart gov={gov} table={result.table} textScale={textScale} axisLabel={`${t.units.gkm} CO₂`} markers={[{ value: result.value, label: t.why.you, tone: "you" }]} ariaLabel={t.why.co2Aria(CO2_NAMES[result.table], result.value, EUR.format(result.tax))} />
        {next && nextTax !== null && toNext !== null && (
          <p className={cn("flex gap-3 rounded-xl px-4 py-3", toNext <= 10 ? "bg-warn-soft text-warn" : "bg-secondary")}>
            {toNext <= 10 ? <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> : <Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" />}
            <span>{toNext <= 10 ? t.why.nearNext(N.format(toNext), N.format(next[0]), EUR.format(nextTax), EUR.format(round2(nextTax - result.tax))) : t.why.nextBand(N.format(next[0]), EUR.format(nextTax))}{prevSave > 0 ? t.why.oneLess(EUR.format(round2(result.tax - prevSave))) : ""}</span>
          </p>
        )}
        <Button type="button" variant="outline" size="sm" className="justify-self-start" aria-expanded={showTable} onClick={() => setShowTable((o) => !o)}>{showTable ? t.why.hideTable : t.why.allBands}</Button>
        {showTable && <BandTable head={t.why.co2Head} active={result.band.i} rows={bands.map(([a, b, r]) => [`${N.format(a)}${b === null ? ` ${t.why.andUp}` : `–${N.format(b)}`}`, r === 0 ? t.why.free : `${RATE.format(r)} €`])} />}
      </SectionCard>
    );
  }
  const rows = gov.cc[result.table];
  let lo = 0;
  const printable = rows.map(([hi, eur]) => { const r = [hi === null ? `${N.format(lo)} ${t.why.andUp}` : `${N.format(lo)}–${N.format(hi)}`, EUR.format(eur)]; lo = (hi ?? 0) + 1; return r; });
  const next = rows[result.band.i + 1];
  return (
    <SectionCard title={t.why.title} eyebrow={t.why.eyebrow}>
      <p>{t.why.ccIntro(t.ccNames[result.table], N.format(result.value), printable[result.band.i][0])}{result.hybrid60 ? t.why.hybridShare(Math.round(gov.hybridShare * 100)) : ""}</p>
      <CcChart gov={gov} table={result.table} activeIndex={result.band.i} share={result.hybrid60 ? gov.hybridShare : 1} textScale={textScale} axisLabel={t.why.ccAxis} ariaLabel={t.why.ccAria(result.value, EUR.format(result.tax))} />
      {next && <p className="flex gap-3 rounded-xl bg-secondary px-4 py-3"><Info className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><span>{t.why.ccNext(printable[result.band.i + 1][0], EUR.format(result.hybrid60 ? round2(next[1] * gov.hybridShare) : next[1]))}</span></p>}
      <Button type="button" variant="outline" size="sm" className="justify-self-start" aria-expanded={showTable} onClick={() => setShowTable((o) => !o)}>{showTable ? t.why.hideTable : t.why.allCcBands}</Button>
      {showTable && <BandTable head={t.why.ccHead} active={result.band.i} rows={printable} />}
    </SectionCard>
  );
}

/* ---------- save money: immobilisation + by-the-month ---------- */
function SaverCard({ gov, tax, months, setMonths }: { gov: Gov; tax: number; months: number; setMonths: (m: number) => void }) {
  const { t, lang } = useI18n();
  const cost = round2((tax / 12) * months);
  const deadlineShort = fmtDate(gov.deadline, { day: "numeric", month: "numeric", year: "numeric" });
  const note = govText(t, lang, gov.monthly.note);
  return (
    <SectionCard title={t.saver.title} eyebrow={t.saver.eyebrow}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid content-start gap-2 rounded-xl border border-[hsl(146_50%_78%)] bg-brand-soft/60 p-4">
          <span className="flex items-center gap-2 font-semibold"><ParkingSquare className="size-5 shrink-0 text-brand" aria-hidden="true" />{t.saver.offTitle}<InfoTip className="-ml-1">{t.saver.offText(deadlineShort)}</InfoTip></span>
          <p className="m-0 text-sm">{t.saver.offWarn}</p>
          <span className="grid"><span className="text-sm font-semibold text-muted-foreground">{t.saver.save}</span><span className="num text-2xl font-extrabold text-brand">{EUR.format(tax)}</span></span>
          <a href={AADE.mycar} target="_blank" rel="noopener" onClick={() => track("immobilise_click")} className="inline-flex min-h-10 items-center gap-1 justify-self-start text-sm font-semibold text-brand underline underline-offset-4">{t.saver.offCta(deadlineShort)}<ArrowUpRight className="size-4 shrink-0" aria-hidden="true" /></a>
        </div>
        <div className="grid content-start gap-3 rounded-xl border p-4">
          <span className="flex items-center gap-2 font-semibold"><CalendarDays className="size-5 shrink-0 text-brand" aria-hidden="true" />{t.saver.monthsTitle}<InfoTip className="-ml-1"><span className="grid gap-2"><span>{t.saver.monthsHow(deadlineShort)} {t.saver.twelfth}</span><span className="text-muted-foreground" lang={note.greek ? "el" : undefined}>{note.text}</span></span></InfoTip></span>
          <Stepper id="months" label={t.saver.monthsLabel} value={String(months)} onChange={(val) => setMonths(Math.min(12, Math.max(1, +val || 1)))} min={1} max={12} unit={t.saver.monthsUnit} maxLen={2} />
          <div className="grid gap-1.5" aria-hidden="true">
            <div className="flex items-center gap-2 text-sm"><span className="w-28 shrink-0">{t.saver.fullYear}</span><span className="h-2.5 flex-1 rounded-full bg-input" /><span className="num w-20 text-right font-semibold">{EUR.format(tax)}</span></div>
            <div className="flex items-center gap-2 text-sm"><span className="w-28 shrink-0">{t.saver.months(months)}</span><span className="h-2.5 flex-1 rounded-full bg-secondary"><span className="block h-full rounded-full bg-brand" style={{ width: `${(months / 12) * 100}%` }} /></span><span className="num w-20 text-right font-semibold">{EUR.format(cost)}</span></div>
          </div>
          <p className="m-0 grid gap-0.5 text-sm">
            <strong className="num">{t.saver.payInstead(EUR.format(cost), EUR.format(tax))}</strong>
            {months < 12 && <span className="num font-semibold text-brand">{t.saver.saveMonths(EUR.format(round2(tax - cost)))}</span>}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

/* ---------- thinking of a new car ---------- */
function NewCarCard({ gov, value, setValue, current, textScale }: { gov: Gov; value: string; setValue: (v: string) => void; current: Result | null; textScale: string }) {
  const t = useT();
  const [where, setWhere] = React.useState(false);
  const g = value === "" ? null : Math.min(600, +value);
  const tax = g === null ? null : co2Tax(gov, "wltp", g);
  const band = g === null ? null : co2Band(gov, "wltp", g);
  const nextBand = band ? gov.co2.wltp[band.i + 1] : undefined;
  const diff = tax !== null && current ? round2(tax - current.tax) : null;
  return (
    <SectionCard title={t.newCar.title} eyebrow={t.newCar.eyebrow}>
      <p>{t.newCar.intro}</p>
      <div className="grid gap-3">
        <Button type="button" variant="outline" size="sm" className="justify-self-start" aria-expanded={where} onClick={() => setWhere((o) => !o)}><Info /> {where ? t.q.close : t.q.where}</Button>
        {where && (
          <ul className="m-0 grid list-none gap-2 rounded-xl bg-secondary p-4 text-sm">
            {t.newCar.where.map((w, i) => <li key={i} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" /><span>{w}</span></li>)}
          </ul>
        )}
      </div>
      <div className="max-w-md"><Stepper id="newco2" label={t.newCar.label} value={value} onChange={(val) => setValue(val.slice(0, 3))} min={0} max={600} start={120} unit={t.units.gkm} placeholder={t.newCar.placeholder} maxLen={3} /></div>
      {tax !== null && band && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-secondary px-4 py-3"><span className="block text-sm text-muted-foreground">{t.newCar.perYear}</span><span className="num text-2xl font-extrabold">{EUR.format(tax)}</span></div>
            <div className="rounded-xl bg-secondary px-4 py-3"><span className="block text-sm text-muted-foreground">{t.newCar.fiveYears}</span><span className="num text-2xl font-extrabold">{EUR.format(round2(tax * 5))}</span></div>
            <div className="rounded-xl bg-secondary px-4 py-3"><span className="block text-sm text-muted-foreground">{t.newCar.vsNow}</span><span className={cn("num text-2xl font-extrabold", diff !== null && diff < 0 && "text-brand", diff !== null && diff > 0 && "text-danger")}>{diff === null ? "—" : `${diff > 0 ? "+" : ""}${EUR.format(diff)}`}</span></div>
          </div>
          <Co2Chart gov={gov} table="wltp" textScale={textScale} axisLabel={`${t.units.gkm} CO₂`} markers={[{ value: g!, label: t.newCar.marker, tone: "you" }]} ariaLabel={t.newCar.aria(g!, EUR.format(tax))} />
          {nextBand && nextBand[0] - g! <= 8 && <p className="flex gap-3 rounded-xl bg-warn-soft px-4 py-3 text-warn"><TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><span>{t.newCar.nearNext(N.format(nextBand[0]), EUR.format(co2Tax(gov, "wltp", nextBand[0])))}</span></p>}
          {g! <= gov.co2.wltp[0][1]! && <p className="flex gap-3 rounded-xl bg-brand-soft px-4 py-3 text-brand"><CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><span>{t.newCar.free(gov.co2.wltp[0][1]!)}</span></p>}
        </>
      )}
      <EvBox />
    </SectionCard>
  );
}

/* Electric cars: no road tax, the state grant (hidden after its deadline) and the official charger map. */
function EvBox() {
  const e = useT().newCar.ev;
  const grantOpen = athensToday() <= EV.grantUntil;
  const link = "inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand underline underline-offset-4";
  return (
    <div className="grid gap-2 rounded-xl border p-4">
      <span className="flex items-center gap-2 font-semibold"><Zap className="size-5 shrink-0 text-brand" aria-hidden="true" />{e.title}</span>
      <p className="m-0">{e.tax}</p>
      {grantOpen && <p className="m-0">{e.grant(EUR0.format(EV.grant), fmtDate(EV.grantUntil, { day: "numeric", month: "numeric", year: "numeric" }))} <InfoTip className="-my-1.5">{e.tip}</InfoTip></p>}
      <p className="m-0">{e.charge(N.format(EV.points))}</p>
      <div className="flex flex-wrap gap-x-5">
        {grantOpen && <a href={EV.grantUrl} target="_blank" rel="noopener" onClick={() => track("ev_grant_click")} className={link}>{e.grantLink}<ArrowUpRight className="size-4 shrink-0" aria-hidden="true" /></a>}
        <a href={EV.mapUrl} target="_blank" rel="noopener" onClick={() => track("ev_map_click")} className={link}>{e.mapLink}<ArrowUpRight className="size-4 shrink-0" aria-hidden="true" /></a>
      </div>
    </div>
  );
}

function LateTable({ gov, tax, stage }: { gov: Gov; tax: number | null; stage: number }) {
  const t = useT();
  const rows = [{ label: t.answer.until(fmtDate(gov.deadline)), extra: t.know.noFine, pct: 0 }, ...gov.stages.map((st, i) => ({ label: i === gov.stages.length - 1 ? t.answer.from(fmtDate(st.from)) : t.know.monthYear(monthName(st.from), st.from.slice(0, 4)), extra: `+${Math.round(st.pct * 100)}%`, pct: st.pct }))];
  return (
    <div className="grid gap-3">
      <p>{t.know.lateText(gov.minFine)}</p>
      <div className="overflow-hidden rounded-xl border">
        {rows.map((r, i) => (
          <div key={r.label} className={cn("flex items-center justify-between gap-3 border-t px-4 py-3 first:border-t-0", i === stage && (i === 0 ? "bg-brand-soft" : "bg-danger-soft"))}>
            <span className="grid"><span className="font-semibold">{r.label}</span><span className="text-sm text-muted-foreground">{r.extra}</span></span>
            <span className="flex items-center gap-2">{i === stage && <Badge variant={i === 0 ? "default" : "danger"}>{t.know.today}</Badge>}<span className="num text-lg font-bold">{tax === null ? "—" : EUR.format(withFine(gov, tax, r.pct))}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FreshnessNote({ gov, source }: { gov: Gov; source: "builtin" | "live" }) {
  const t = useT();
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <RefreshCw className="size-4" aria-hidden="true" />
      {source === "live" ? t.know.live(fmtDate(gov.checkedAt)) : t.know.builtin(fmtDate(gov.checkedAt))}
    </p>
  );
}
