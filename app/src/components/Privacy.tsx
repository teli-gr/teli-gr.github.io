import * as React from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n";
import { contactEmail, gaId, getConsent, onConsentChange, setConsent, type Consent } from "@/lib/consent";

function useConsent() {
  const [c, setC] = React.useState<Consent | null>(getConsent);
  React.useEffect(() => onConsentChange(() => setC(getConsent())), []);
  return c;
}

/* Small, non-blocking card. «Αποδοχή» and «Απόρριψη» look the same, so saying no is as easy as saying yes. */
export function CookieBanner({ onMore }: { onMore: () => void }) {
  const t = useT();
  const consent = useConsent();
  if (!gaId() || consent) return null;
  return (
    <section aria-label="Cookies" className="fixed inset-x-3 bottom-[6.75rem] z-40 rounded-2xl border bg-card p-4 shadow-lg sm:inset-x-auto sm:left-4 sm:max-w-sm lg:bottom-4">
      <p className="m-0 flex gap-2 text-sm">
        <Cookie className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
        <span>{t.privacy.cookies}</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" className="min-w-24" onClick={() => setConsent("granted")}>{t.privacy.accept}</Button>
        <Button type="button" size="sm" variant="outline" className="min-w-24" onClick={() => setConsent("denied")}>{t.privacy.reject}</Button>
        <button type="button" onClick={onMore} className="ml-auto min-h-10 px-1 text-sm font-semibold text-brand underline underline-offset-2">{t.privacy.more}</button>
      </div>
    </section>
  );
}

export function PrivacyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const consent = useConsent();
  const ga = !!gaId(); const email = contactEmail();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.privacy.close}>
        <DialogTitle>{t.privacy.title}</DialogTitle>
        <DialogDescription>{t.privacy.lead}</DialogDescription>
        <div className="grid gap-3 text-sm leading-relaxed">
          <p className="m-0"><strong>{t.privacy.vehiclesT}</strong> {t.privacy.vehicles}</p>
          <p className="m-0"><strong>{t.privacy.countT}</strong> {t.privacy.count}</p>
          {ga && <p className="m-0"><strong>{t.privacy.gaT}</strong> {t.privacy.ga}</p>}
          <p className="m-0"><strong>{t.privacy.rightsT}</strong> {t.privacy.rights}{email && <> {t.privacy.contact} <a className="font-semibold text-brand underline" href={`mailto:${email}`}>{email}</a>.</>} {t.privacy.dpa} (<a className="font-semibold text-brand underline" href="https://www.dpa.gr" target="_blank" rel="noopener">dpa.gr</a>).</p>
        </div>
        {ga && (
          <div className="grid gap-2 rounded-xl bg-secondary p-4">
            <p className="m-0 text-sm font-semibold">{t.privacy.gaState(consent === "granted" ? "on" : consent === "denied" ? "off" : "none")}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={consent === "granted" ? "default" : "outline"} aria-pressed={consent === "granted"} onClick={() => setConsent("granted")}>{t.privacy.accept}</Button>
              <Button type="button" size="sm" variant={consent === "denied" ? "default" : "outline"} aria-pressed={consent === "denied"} onClick={() => setConsent("denied")}>{t.privacy.reject}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
