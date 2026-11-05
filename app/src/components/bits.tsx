import * as React from "react";
import { Check, FileText, Info, Minus, Plus } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Power } from "@/lib/tax";
import { useT } from "@/i18n";

export { EUR, EUR0, N, RATE, fmtDate, monthName } from "@/lib/format";
import { N } from "@/lib/format";

export function PlateMark({ className }: { className?: string }) {
  const t = useT();
  return (
    <div className={cn("flex h-10 select-none items-stretch overflow-hidden rounded-[0.5rem] border-2 border-foreground bg-white", className)} aria-label={t.header.plate} role="img">
      <div className="flex w-7 flex-col items-center justify-between bg-eu py-1">
        <svg viewBox="0 0 20 20" className="size-3.5" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => { const a = (i / 12) * Math.PI * 2; return <circle key={i} cx={10 + 7 * Math.cos(a)} cy={10 + 7 * Math.sin(a)} r="1.25" fill="#ffcc00" />; })}
        </svg>
        <span className="font-plate text-[10px] font-bold leading-none text-white">GR</span>
      </div>
      <div className="flex items-center gap-2 px-2.5 font-plate text-[1.3rem] font-bold leading-none tracking-wide text-foreground">
        <span>ΤΕΛΗ</span><span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden="true" /><span className="plate-year">2027</span>
      </div>
    </div>
  );
}

export function MotoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="5" cy="16.5" r="3.5" /><circle cx="19" cy="16.5" r="3.5" /><path d="M5 16.5 9 10h5l3 6.5" /><path d="M12.5 10 11 6.5H8.5" /><path d="M16 6.5h2.5l.5 3" /><path d="M9 10l2.5 6.5H15" />
    </svg>
  );
}

/* ⓘ that opens a short explanation on tap or click (tooltips on hover don't work on phones). */
export function InfoTip({ children, className }: { children: React.ReactNode; className?: string }) {
  const t = useT();
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" aria-label={t.ui.info} className={cn("inline-grid size-8 shrink-0 place-items-center rounded-full align-middle text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-soft", className)}>
          <Info className="size-[18px]" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="top" align="center" sideOffset={4} collisionPadding={12} className="z-[60] max-w-[min(20rem,calc(100vw-2rem))] rounded-xl border bg-card p-3 text-sm leading-relaxed text-foreground shadow-lg focus:outline-none">
          {children}
          <Popover.Arrow className="fill-card" width={12} height={6} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function StepNumber({ n, done }: { n: number; done: boolean }) {
  return done ? (
    <span key="done" aria-hidden="true" className="animate-pop grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_0_0_4px_hsl(var(--brand-soft))]">
      <Check className="size-5" strokeWidth={3} />
    </span>
  ) : (
    <span key="n" aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-foreground bg-white font-plate text-base font-bold text-foreground">
      {n}
    </span>
  );
}

export type DocField = "B" | "P.1" | "P.3" | "V.7";
export function RegistrationDoc({ highlight, year, cc, co2, power }: { highlight: DocField; year: string; cc: string; co2: string; power: Power | null }) {
  const t = useT();
  const fuel = power === "ev" ? "ΗΛΕΚΤΡΙΣΜΟΣ" : power === "hybrid" ? "ΒΕΝΖΙΝΗ / ΗΛΕΚΤΡ." : "ΒΕΝΖΙΝΗ";
  const fields: { code: string; label: string; value: string; id?: DocField }[] = [
    { code: "A", label: t.doc.plate, value: "ΧΧΧ-0000" },
    { code: "B", label: t.doc.first, value: `15.03.${/^\d{4}$/.test(year) ? year : "2019"}`, id: "B" },
    { code: "D.1", label: t.doc.make, value: "—" },
    { code: "P.1", label: t.doc.cc, value: cc ? N.format(+cc) : "1.398", id: "P.1" },
    { code: "P.3", label: t.doc.fuel, value: fuel, id: "P.3" },
    { code: "V.7", label: t.doc.co2, value: co2 || "135", id: "V.7" },
  ];
  return (
    <figure className="m-0">
      <div className="doc-paper relative overflow-hidden rounded-xl border-2 border-[hsl(146_25%_80%)] p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-dashed border-[hsl(146_25%_75%)] pb-2">
          <span className="font-plate text-base font-bold tracking-[0.12em] text-[hsl(146_40%_22%)]">{t.doc.title}</span>
          <span className="text-sm font-semibold text-[hsl(146_30%_30%)]">{t.doc.part}</span>
        </div>
        <dl className="m-0 grid grid-cols-2 gap-2">
          {fields.map((f) => {
            const on = f.id === highlight;
            return (
              <div key={f.code} className={cn("relative rounded-lg border px-3 py-2 transition-all", on ? "border-brand bg-white shadow-[0_0_0_4px_hsl(147_75%_56%/0.45)]" : "border-transparent opacity-55")}>
                <dt className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-tight text-[hsl(146_25%_25%)]">
                  <span className="rounded bg-white/90 px-1.5 py-0.5 font-plate text-sm font-bold text-foreground ring-1 ring-[hsl(146_25%_80%)]">({f.code})</span>
                  <span className="min-w-0">{f.label}</span>
                </dt>
                <dd className="m-0 mt-1 font-mono text-base font-semibold tracking-wide text-foreground">{f.value}</dd>
                {on && <span className="absolute -top-3 right-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground shadow">{t.doc.here}</span>}
              </div>
            );
          })}
        </dl>
      </div>
      <figcaption className="mt-2 text-sm text-muted-foreground">{t.doc.caption}</figcaption>
    </figure>
  );
}

export function Question({ n, title, help, tip, done, children, docProps, id }: {
  n: number; title: string; help?: string; tip?: string; done: boolean; children: React.ReactNode; id: string;
  docProps?: React.ComponentProps<typeof RegistrationDoc>;
}) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const headingId = `${id}-title`;
  return (
    <Card id={id} aria-labelledby={headingId} role="group" className={cn("scroll-mt-4 transition-colors duration-300", done && "border-[hsl(146_50%_78%)] bg-[hsl(146_60%_99%)]")}>
      <CardContent className="grid gap-4">
        <div className="flex items-start gap-3">
          <StepNumber n={n} done={done} />
          <div className="grid min-w-0 gap-0.5 pt-0.5">
            <h2 id={headingId} className="text-xl font-bold leading-tight tracking-tight text-balance">{title}{done && <span className="sr-only"> ({t.q.answered})</span>}</h2>
            {help && <p className="-my-1 text-base text-muted-foreground">{help}{tip && <InfoTip className="ml-0.5">{tip}</InfoTip>}</p>}
          </div>
        </div>
        {children}
        {docProps && (
          <div className="grid gap-3">
            <Button type="button" variant="outline" size="sm" className="justify-self-start" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <FileText /> {open ? t.q.close : t.q.where}
            </Button>
            {open && <RegistrationDoc {...docProps} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Stepper({ value, onChange, min, max, step = 1, start, label, unit, placeholder, id, invalid, describedBy, maxLen = 5 }: {
  value: string; onChange: (v: string) => void; min: number; max: number; step?: number; start?: number; label: string; unit?: string; placeholder?: string; id: string; invalid?: boolean; describedBy?: string; maxLen?: number;
}) {
  const t = useT();
  const num = value === "" ? null : +value;
  const bump = (d: number) => { if (num === null) { onChange(String(start ?? min)); return; } onChange(String(Math.min(max, Math.max(min, num + d)))); };
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Button type="button" variant="outline" size="icon" aria-label={t.stepper.minus(label, step)} onClick={() => bump(-step)}><Minus /></Button>
      <div className="relative min-w-0 flex-1">
        <Label htmlFor={id} className="sr-only">{label}</Label>
        <Input id={id} inputMode="numeric" autoComplete="off" placeholder={placeholder} value={value} aria-invalid={invalid || undefined} aria-describedby={describedBy}
          className={cn("text-center", unit && "pr-16", invalid && "border-danger")}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, maxLen))} />
        {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">{unit}</span>}
      </div>
      <Button type="button" variant="outline" size="icon" aria-label={t.stepper.plus(label, step)} onClick={() => bump(step)}><Plus /></Button>
    </div>
  );
}

export function BandTable({ head, rows, active }: { head: [string, string]; rows: string[][]; active: number }) {
  const t = useT();
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-base num">
        <thead><tr className="bg-secondary text-left text-sm text-muted-foreground"><th className="px-4 py-2 font-semibold">{head[0]}</th><th className="px-4 py-2 text-right font-semibold">{head[1]}</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={cn("border-t", i === active && "bg-brand-soft font-bold")}>
              <td className="px-4 py-2">{r[0]} {i === active && <Badge className="ml-2 align-middle">{t.why.you}</Badge>}</td>
              <td className="px-4 py-2 text-right">{r[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SectionCard({ title, eyebrow, children, className, id }: { title: string; eyebrow?: string; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <Card id={id} className={cn("scroll-mt-4", className)}>
      <CardContent className="grid gap-4">
        <div className="grid gap-0.5">
          {eyebrow && <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{eyebrow}</span>}
          <h2 className="text-xl font-bold tracking-tight text-balance">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
