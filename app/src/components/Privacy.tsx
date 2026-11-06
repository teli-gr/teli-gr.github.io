import * as React from "react";
import { BarChart3, Cookie, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n";
import { CREDIT } from "@/content/credit";
import { browserSaysNo, contactEmail, eraseLocal, gaId, getConsent, goatCode, hasStats, onConsentChange, setConsent, type Consent } from "@/lib/consent";

const GITHUB_PRIVACY = "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement";
const link = "font-semibold text-brand underline underline-offset-2";
/* The Claude-hosted preview isn't on GitHub Pages, so it doesn't show the hosting paragraph. */
const onClaude = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_TARGET === "artifact";

function useConsent() {
  const [c, setC] = React.useState<Consent | null>(getConsent);
  React.useEffect(() => onConsentChange(() => setC(getConsent())), []);
  return c;
}

/* Small, non-blocking card, shown only when a visitor counter is set up and the visitor hasn't chosen yet.
   «Αποδοχή» and «Απόρριψη» look the same, so saying no is as easy as saying yes. Nothing is counted before «Αποδοχή». */
export function CookieBanner({ onMore }: { onMore: () => void }) {
  const t = useT();
  const consent = useConsent();
  if (!hasStats() || consent) return null;
  const ga = !!gaId();
  const Icon = ga ? Cookie : BarChart3;
  return (
    <section aria-label={t.privacy.title} className="fixed inset-x-3 bottom-[6.75rem] z-40 rounded-2xl border bg-card p-4 shadow-lg sm:inset-x-auto sm:left-4 sm:max-w-sm lg:bottom-4">
      <p className="m-0 flex gap-2 text-sm">
        <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
        <span>{ga ? t.privacy.cookies : t.privacy.ask}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" className="min-w-24" onClick={() => setConsent("granted")}>{t.privacy.accept}</Button>
        <Button type="button" size="sm" variant="outline" className="min-w-24" onClick={() => setConsent("denied")}>{t.privacy.reject}</Button>
        <button type="button" onClick={onMore} className="ml-auto min-h-10 px-1 text-sm font-semibold text-brand underline underline-offset-2">{t.privacy.more}</button>
      </div>
    </section>
  );
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return <p className="m-0"><strong>{title}</strong> {children}</p>;
}

/* The privacy notice (GDPR art. 13): who, what, where, why, for how long, your rights. Plus the controls. */
export function PrivacyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT(); const p = t.privacy;
  const consent = useConsent();
  const ga = !!gaId(), gc = !!goatCode(), stats = ga || gc, gpc = browserSaysNo();
  const email = contactEmail();
  const [sure, setSure] = React.useState(false);
  React.useEffect(() => { if (!open) setSure(false); }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={p.close}>
        <DialogTitle>{p.title}</DialogTitle>
        <DialogDescription>{p.lead}</DialogDescription>
        <div className="grid gap-3 text-sm leading-relaxed">
          <Item title={p.whoT}>{p.who(CREDIT.owner, CREDIT.label)}{email && <> {p.contact} <a className={link} href={`mailto:${email}`}>{email}</a>.</>}</Item>
          <Item title={p.vehiclesT}>{p.vehicles}</Item>
          {!onClaude && <Item title={p.hostT}>{p.host} <a className={link} href={GITHUB_PRIVACY} target="_blank" rel="noopener">{p.hostLink}</a>.</Item>}
          {gc && <Item title={p.countT}>{p.count}</Item>}
          {ga && <Item title={p.gaT}>{p.ga}</Item>}
          {gc && <Item title={p.voteT}>{p.vote}</Item>}
          <Item title={p.rightsT}>{p.rights} {p.dpa} (<a className={link} href="https://www.dpa.gr" target="_blank" rel="noopener">dpa.gr</a>).</Item>
        </div>
        <div className="grid gap-3 rounded-xl bg-secondary p-4">
          {stats && (gpc ? <p className="m-0 text-sm">{p.gpc}</p> : (
            <div className="grid gap-2">
              <p className="m-0 text-sm font-semibold">{p.statsState(consent === "granted" ? "on" : consent === "denied" ? "off" : "none")}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={consent === "granted" ? "default" : "outline"} aria-pressed={consent === "granted"} onClick={() => setConsent("granted")}>{p.accept}</Button>
                <Button type="button" size="sm" variant={consent === "denied" ? "default" : "outline"} aria-pressed={consent === "denied"} onClick={() => setConsent("denied")}>{p.reject}</Button>
              </div>
            </div>
          ))}
          <div className={stats ? "grid gap-2 border-t pt-3" : "grid gap-2"}>
            {!sure ? (
              <Button type="button" size="sm" variant="outline" className="justify-self-start" onClick={() => setSure(true)}><Trash2 /> {p.erase}</Button>
            ) : (
              <div role="group" aria-label={p.erase} className="grid gap-2">
                <p className="m-0 text-sm font-semibold">{p.eraseSure}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" autoFocus onClick={() => setSure(false)}>{p.cancel}</Button>
                  <Button type="button" size="sm" className="bg-[#b42318] text-white hover:bg-[#912018]" onClick={eraseLocal}><Trash2 /> {p.eraseYes}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="m-0 text-xs text-muted-foreground">{p.updated}</p>
      </DialogContent>
    </Dialog>
  );
}
