import * as React from "react";
import { BellRing, CalendarClock, Check, Loader2, Mail, Newspaper, ParkingSquare, Smartphone, ThumbsUp, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EUR, InfoTip, SectionCard, fmtDate } from "@/components/bits";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { track } from "@/lib/track";
import { DEFAULT_PREFS, emailSupported, enablePush, loadSub, pushSupport, saveSub, subscribeEmail, unsubscribe, updateSubscription, type AlertPrefs, type Subscription } from "@/lib/alerts";
import type { Gov } from "@/lib/tax";

/* Smart alerts: the person picks what matters; alerts stop once they mark the tax as paid. */
export function AlertsCard({ gov, amount, paid }: { gov: Gov; amount: number | null; paid: boolean }) {
  const t = useT();
  const [sub, setSub] = React.useState<Subscription | null>(loadSub);
  const [prefs, setPrefs] = React.useState<AlertPrefs>(sub?.prefs ?? DEFAULT_PREFS);
  const [busy, setBusy] = React.useState<"push" | "email" | "save" | "off" | null>(null);
  const [msg, setMsg] = React.useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [email, setEmail] = React.useState("");
  const support = React.useMemo(pushSupport, []);
  const deadline = fmtDate(gov.deadline, { day: "numeric", month: "numeric", year: "numeric" });
  const payload = { prefs, taxYear: gov.taxYear, amount: prefs.showAmount && amount ? amount : undefined, paid };

  // keep the server in step when the person marks the tax as paid (alerts about paying then stop)
  const lastPaid = React.useRef(paid);
  React.useEffect(() => {
    if (!sub || lastPaid.current === paid) return; lastPaid.current = paid;
    updateSubscription(sub, { paid, taxYear: gov.taxYear }).catch(() => {});
  }, [paid, sub, gov.taxYear]);

  const rows: { key: keyof AlertPrefs; icon: React.ReactNode; title: string; sub: string }[] = [
    { key: "deadline", icon: <CalendarClock className="size-5" />, title: t.alerts.deadline, sub: t.alerts.deadlineSub(deadline) },
    { key: "surcharge", icon: <TrendingUp className="size-5" />, title: t.alerts.surcharge, sub: t.alerts.surchargeSub },
    { key: "news", icon: <Newspaper className="size-5" />, title: t.alerts.news, sub: t.alerts.newsSub },
    { key: "immobilise", icon: <ParkingSquare className="size-5" />, title: t.alerts.immobilise, sub: t.alerts.immobiliseSub(deadline) },
  ];

  const turnOnPush = async () => {
    setBusy("push"); setMsg(null);
    try { const s = await enablePush(payload); saveSub(s); setSub(s); track("alerts_on", { channel: "push" }); setMsg({ tone: "ok", text: t.alerts.msgPushOk }); }
    catch (e) { setMsg({ tone: "err", text: (e as Error).message === "denied" ? t.alerts.msgDenied : t.alerts.msgFail }); }
    finally { setBusy(null); }
  };
  const turnOnEmail = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMsg({ tone: "err", text: t.alerts.msgBadEmail }); return; }
    setBusy("email"); setMsg(null);
    try { const s = await subscribeEmail(email.trim(), payload); saveSub(s); setSub(s); track("alerts_on", { channel: "email" }); setMsg({ tone: "ok", text: t.alerts.msgEmailOk }); }
    catch { setMsg({ tone: "err", text: t.alerts.msgEmailFail }); }
    finally { setBusy(null); }
  };
  const savePrefs = async () => {
    if (!sub) return; setBusy("save");
    try { await updateSubscription(sub, payload); const s = { ...sub, prefs }; saveSub(s); setSub(s); setMsg({ tone: "ok", text: t.alerts.msgSaved }); }
    catch { setMsg({ tone: "err", text: t.alerts.msgSaveFail }); }
    finally { setBusy(null); }
  };
  const turnOff = async () => {
    if (!sub) return; setBusy("off");
    try { await unsubscribe(sub); } catch { /* remove locally anyway */ }
    saveSub(null); setSub(null); setBusy(null); setMsg({ tone: "ok", text: t.alerts.msgOff });
  };

  const live = support !== "not-configured";
  if (!live) return <ComingSoon rows={rows} />;
  return (
    <SectionCard id="alerts" title={t.alerts.title} eyebrow={t.alerts.eyebrow}>
      <p>{t.alerts.intro[0]} <strong>{t.alerts.intro[1]}</strong>.</p>

      <fieldset className="m-0 grid gap-2 border-0 p-0" disabled={!live}>
        <legend className="sr-only">{t.alerts.choose}</legend>
        {rows.map((r) => (
          <div key={r.key} className={cn("flex items-center gap-3 rounded-xl border px-4 py-3", prefs[r.key] && live && "border-brand/40 bg-brand-soft/50")}>
            <span className="text-brand" aria-hidden="true">{r.icon}</span>
            <Label htmlFor={`pref-${r.key}`} className="grid min-w-0 flex-1 cursor-pointer gap-0.5 text-base font-semibold">
              {r.title}<span className="text-sm font-normal text-muted-foreground">{r.sub}</span>
            </Label>
            <Switch id={`pref-${r.key}`} checked={prefs[r.key]} onCheckedChange={(c) => setPrefs((p) => ({ ...p, [r.key]: c }))} />
          </div>
        ))}
        <div className="flex items-center gap-3 px-1 py-1">
          <Label htmlFor="pref-amount" className="min-w-0 flex-1 cursor-pointer text-sm font-medium text-muted-foreground">{t.alerts.showAmount}{amount ? ` (${EUR.format(amount)})` : ""}</Label>
          <Switch id="pref-amount" checked={prefs.showAmount} onCheckedChange={(c) => setPrefs((p) => ({ ...p, showAmount: c }))} />
        </div>
      </fieldset>

      <p className="text-xs text-muted-foreground">{t.alerts.privacy}</p>

      {live && !sub && (
        <div className="grid gap-3">
          {support === "ok" && <Button type="button" size="lg" onClick={turnOnPush} disabled={busy !== null}>{busy === "push" ? <Loader2 className="animate-spin" /> : <Smartphone />} {t.alerts.pushBtn}</Button>}
          {support === "ios-install" && (
            <p className="rounded-xl bg-secondary px-4 py-3 text-sm"><strong>{t.alerts.ios[0]}</strong> {t.alerts.ios[1]} <em>{t.alerts.ios[2]}</em> → <em>{t.alerts.ios[3]}</em>. {t.alerts.ios[4]}</p>
          )}
          {support === "unsupported" && <p className="text-sm text-muted-foreground">{t.alerts.unsupported}</p>}
          {emailSupported() && (
            <form className="grid gap-2" onSubmit={turnOnEmail} noValidate>
              <Label htmlFor="alert-email" className="text-sm font-semibold">{support === "ok" ? t.alerts.orEmail : t.alerts.withEmail}</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input id="alert-email" type="email" inputMode="email" autoComplete="email" placeholder={t.alerts.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} className="text-left text-base font-medium" />
                <Button type="submit" variant="outline" className="h-11 shrink-0" disabled={busy !== null}>{busy === "email" ? <Loader2 className="animate-spin" /> : <Mail />} {t.alerts.subscribe}</Button>
              </div>
              <p className="text-xs text-muted-foreground">{t.alerts.emailNote}</p>
            </form>
          )}
        </div>
      )}

      {live && sub && (
        <div className="grid gap-3 rounded-xl bg-brand-soft px-4 py-3">
          <span className="flex items-center gap-2 font-semibold text-brand"><BellRing className="size-5" aria-hidden="true" />{sub.channel === "push" ? t.alerts.activePush : sub.confirmed ? t.alerts.activeEmail : t.alerts.pendingEmail}</span>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={savePrefs} disabled={busy !== null}>{busy === "save" ? <Loader2 className="animate-spin" /> : <Check />} {t.alerts.save}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={turnOff} disabled={busy !== null}>{t.alerts.off}</Button>
          </div>
        </div>
      )}

      {msg && <p role="status" className={cn("rounded-lg px-3 py-2 text-sm font-semibold", msg.tone === "ok" ? "bg-brand-soft text-brand" : "bg-danger-soft text-danger")}>{msg.text}</p>}
    </SectionCard>
  );
}

/* Before the alerts backend is switched on: show what is coming and ask if people want it (anonymous count, no data kept). */
const VOTE_KEY = "teli.alerts.vote";
type Vote = "no" | "yes" | "push" | "email";
const voteListeners = new Set<() => void>();
const readVote = (): Vote | null => { try { const v = localStorage.getItem(VOTE_KEY); return v === "no" || v === "yes" || v === "push" || v === "email" ? v : null; } catch { return null; } };
/* One answer per person, shared by the quick vote in the answer card and the full card below. */
export function useAlertVote() {
  const [vote, setVote] = React.useState<Vote | null>(readVote);
  React.useEffect(() => { const f = () => setVote(readVote()); voteListeners.add(f); return () => { voteListeners.delete(f); }; }, []);
  const pick = React.useCallback((v: Vote, where: string) => {
    try { localStorage.setItem(VOTE_KEY, v); } catch { /* ignore */ }
    voteListeners.forEach((f) => f());
    track(v === "push" || v === "email" ? "alerts_channel" : "alerts_interest", { answer: v, where });
  }, []);
  return { vote, pick };
}

/* Minimal vote inside the answer: "Smart alerts are coming. Want them?" Yes / No. */
export function AlertVote() {
  const t = useT();
  const { vote, pick } = useAlertVote();
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t pt-3" aria-live="polite">
      {vote === null ? (
        <>
          <span className="inline-flex items-center text-sm font-semibold">{t.alerts.voteQ}<InfoTip><span className="grid gap-1.5"><Badge variant="warn" className="justify-self-start">{t.alerts.soon}</Badge><span>{t.alerts.soonText}</span></span></InfoTip></span>
          <span className="ml-auto flex gap-2">
            <Button type="button" size="sm" variant="outline" className="min-w-14" onClick={() => pick("yes", "answer")}><ThumbsUp /> {t.alerts.yesShort}</Button>
            <Button type="button" size="sm" variant="outline" className="min-w-14" onClick={() => pick("no", "answer")}>{t.alerts.noShort}</Button>
          </span>
        </>
      ) : (
        <span className="flex items-center gap-1.5 text-sm text-brand"><Check className="size-4" aria-hidden="true" />{vote === "no" ? t.alerts.thanksNo : t.alerts.thanksYes}</span>
      )}
    </div>
  );
}

function ComingSoon({ rows }: { rows: { key: string; icon: React.ReactNode; title: string; sub: string }[] }) {
  const t = useT();
  const { vote, pick: pickVote } = useAlertVote();
  const pick = (v: Vote) => pickVote(v, "card");
  return (
    <SectionCard id="alerts" title={t.alerts.title} eyebrow={t.alerts.eyebrow}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warn">{t.alerts.soon}</Badge>
        <span className="text-sm text-muted-foreground">{t.alerts.soonText}</span>
      </div>
      <ul className="m-0 grid list-none gap-2 p-0">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-3 rounded-xl border px-4 py-3">
            <span className="text-brand" aria-hidden="true">{r.icon}</span>
            <span className="grid min-w-0 gap-0.5 text-base font-semibold">{r.title}<span className="text-sm font-normal text-muted-foreground">{r.sub}</span></span>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 rounded-xl bg-secondary px-4 py-4" aria-live="polite">
        {vote === null && (
          <>
            <p className="m-0 text-base font-semibold">{t.alerts.ask}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => pick("yes")}><ThumbsUp /> {t.alerts.yes}</Button>
              <Button type="button" variant="outline" onClick={() => pick("no")}>{t.alerts.no}</Button>
            </div>
          </>
        )}
        {vote === "yes" && (
          <>
            <p className="m-0 text-base font-semibold">{t.alerts.how}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => pick("push")}><Smartphone /> {t.alerts.phone}</Button>
              <Button type="button" variant="outline" onClick={() => pick("email")}><Mail /> {t.alerts.email}</Button>
            </div>
          </>
        )}
        {(vote === "push" || vote === "email" || vote === "no") && (
          <p className="m-0 text-sm">
            <strong>{vote === "no" ? t.alerts.thanksNo : t.alerts.thanksYes}</strong>{" "}
            {t.alerts.meanwhile}
          </p>
        )}
        <p className="m-0 text-xs text-muted-foreground">{t.alerts.countOnly}</p>
      </div>
    </SectionCard>
  );
}
