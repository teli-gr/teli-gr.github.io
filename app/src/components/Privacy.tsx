import * as React from "react";
import { BarChart3, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
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

/* Dark floating card, centred at the bottom; shown only when a visitor counter is set up and the visitor hasn't chosen yet.
   Built for older visitors on phones: big text, 56 px buttons, a 48 px ✕.
   «Ναι» and «Όχι» look exactly the same (Greek DPA: saying no as easy as saying yes). Nothing is counted before «Ναι».
   ✕ means "not now": the card closes, nothing is counted, and it asks again on the next visit. */
const LATER = "teli.consent.later";
const askedLater = () => { try { return sessionStorage.getItem(LATER) === "1"; } catch { return false; } };

export function CookieBanner({ onMore }: { onMore: () => void }) {
  const t = useT(); const p = t.privacy;
  const consent = useConsent();
  const [later, setLater] = React.useState(askedLater);
  const ref = React.useRef<HTMLElement>(null);
  const show = hasStats() && !consent && !later;
  // Keep the end of the page (footer, links) reachable above the card.
  React.useEffect(() => {
    const el = ref.current;
    if (!show || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => { document.body.style.paddingBottom = `${el.offsetHeight + 24}px`; });
    ro.observe(el);
    return () => { ro.disconnect(); document.body.style.paddingBottom = ""; };
  }, [show]);
  if (!show) return null;
  const notNow = () => { try { sessionStorage.setItem(LATER, "1"); } catch { /* ignore */ } setLater(true); };
  const ring = "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white";
  const choice = cn("h-14 min-w-28 flex-1 rounded-full bg-white px-6 text-lg font-bold text-foreground shadow-sm transition-colors hover:bg-white/90 sm:h-12 sm:flex-none sm:text-base", ring);
  return (
    <section ref={ref} aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-[38rem] rounded-[22px] bg-foreground p-4 text-white shadow-[0_18px_50px_rgba(11,18,32,0.35)] sm:bottom-6 sm:p-5"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <button type="button" onClick={notNow} aria-label={p.later} title={p.later} className={cn("absolute right-3 top-3 grid size-12 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20", ring)}>
        <X className="size-6" aria-hidden="true" />
      </button>
      <div className="flex items-start gap-3.5 pr-14">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary" aria-hidden="true"><BarChart3 className="size-6 text-primary-foreground" /></span>
        <div className="grid gap-1">
          <p id="consent-title" className="m-0 text-lg font-bold leading-snug">{p.askTitle}</p>
          <p className="m-0 text-base leading-relaxed text-white/75">{gaId() ? p.cookies : p.ask}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 sm:pl-[3.875rem]">
        <button type="button" className={choice} onClick={() => setConsent("granted")}>{p.accept}</button>
        <button type="button" className={choice} onClick={() => setConsent("denied")}>{p.reject}</button>
        <button type="button" onClick={onMore} className={cn("inline-flex min-h-11 w-full items-center justify-center rounded px-2 text-base font-bold text-primary underline underline-offset-2 sm:ml-auto sm:w-auto", ring)}>{p.more}</button>
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
