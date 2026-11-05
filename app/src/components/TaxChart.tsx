import * as React from "react";
import { co2Tax, type Co2Key, type CcKey, type Gov } from "@/lib/tax";
import { EUR, N } from "@/components/bits";

function useWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [w, setW] = React.useState(640);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
const niceStep = (max: number) => { for (const s of [10, 25, 50, 100, 200, 250, 500, 1000]) if (max / s <= 5) return s; return 2000; };
const rootPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

type Marker = { value: number; label: string; tone: "you" | "other" };

/* Annual tax by g/km: a step line, because the whole figure is charged at the band's rate. */
export function Co2Chart({ gov, table, markers, textScale, ariaLabel , axisLabel = "g/km CO₂" }: { gov: Gov; table: Co2Key; markers: Marker[]; textScale: string; ariaLabel: string ; axisLabel?: string }) {
  const [ref, cw] = useWidth<HTMLDivElement>();
  const fs = React.useMemo(() => Math.round(rootPx() * 0.75), [textScale]);
  const W = Math.max(280, cw), H = W < 480 ? 230 : 260, L = fs * 4.4, R = 14, T = fs * 2, B = fs * 2.6, iw = W - L - R, ih = H - T - B;
  const vmax = Math.max(0, ...markers.map((m) => m.value));
  const xMax = Math.max(200, Math.ceil((vmax + 70) / 50) * 50);
  let yRaw = 0; for (let g = 0; g <= xMax; g++) yRaw = Math.max(yRaw, co2Tax(gov, table, g));
  const step = niceStep(yRaw), yMax = Math.max(step, Math.ceil(yRaw / step) * step);
  const x = (g: number) => L + (g / xMax) * iw, y = (t: number) => T + ih - (t / yMax) * ih;
  let d = `M${x(0)} ${y(0)}`; for (let g = 1; g <= xMax; g++) d += ` L${x(g).toFixed(1)} ${y(co2Tax(gov, table, g)).toFixed(1)}`;
  const area = `${d} L${x(xMax)} ${y(0)} Z`;
  const you = markers.find((m) => m.tone === "you");
  const band = you ? gov.co2[table].find((b) => you.value >= b[0] && you.value <= (b[1] ?? Infinity)) : undefined;
  const xStep = W < 480 ? 100 : 50;
  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={ariaLabel} className="block max-w-full" style={{ fontFamily: "'Inter Variable', Inter, sans-serif" }}>
        {band && <rect x={x(band[0])} y={T} width={Math.max(3, x(Math.min(band[1] ?? xMax, xMax)) - x(band[0]))} height={ih} fill="hsl(var(--brand-soft))" />}
        {Array.from({ length: yMax / step + 1 }).map((_, i) => (
          <g key={i}><line x1={L} x2={W - R} y1={y(i * step)} y2={y(i * step)} stroke="hsl(var(--border))" /><text x={L - 8} y={y(i * step) + fs * 0.35} textAnchor="end" fontSize={fs} fill="hsl(var(--muted-foreground))">{N.format(i * step)} €</text></g>
        ))}
        {Array.from({ length: Math.floor(xMax / xStep) + 1 }).map((_, i) => (
          <text key={i} x={x(i * xStep)} y={H - fs * 0.9} textAnchor="middle" fontSize={fs} fill="hsl(var(--muted-foreground))">{i * xStep}</text>
        ))}
        <text x={W - R} y={H - fs * 0.9 - fs * 1.2} textAnchor="end" fontSize={fs * 0.9} fill="hsl(var(--muted-foreground))">{axisLabel}</text>
        <path d={area} fill="hsl(var(--brand-soft))" opacity={0.6} />
        <path d={d} fill="none" stroke="hsl(var(--brand))" strokeWidth={2.25} strokeLinejoin="round" />
        {markers.map((m) => {
          const mx = x(Math.min(m.value, xMax)), t = co2Tax(gov, table, m.value), my = y(t);
          const col = m.tone === "you" ? "hsl(var(--brand))" : "hsl(var(--warn))";
          const lx = Math.min(Math.max(mx, L + 50), W - R - 50);
          return (
            <g key={m.label}>
              <line x1={mx} x2={mx} y1={my} y2={T + ih} stroke={col} strokeDasharray="3 3" opacity={0.7} />
              <circle cx={mx} cy={my} r={6.5} fill="white" stroke={col} strokeWidth={3} />
              <text x={lx} y={Math.max(my - 14, fs + 2)} textAnchor="middle" fontSize={fs * 1.05} fontWeight={700} fill="hsl(var(--foreground))" stroke="white" strokeWidth={4} paintOrder="stroke" strokeLinejoin="round">{m.label} {EUR.format(t)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* Annual tax per engine-size band. */
export function CcChart({ gov, table, activeIndex, share, textScale, ariaLabel, axisLabel }: { gov: Gov; table: CcKey; activeIndex: number; share: number; textScale: string; ariaLabel: string; axisLabel: string }) {
  const [ref, cw] = useWidth<HTMLDivElement>();
  const fs = React.useMemo(() => Math.round(rootPx() * 0.75), [textScale]);
  const rows = gov.cc[table];
  const W = Math.max(280, cw), H = W < 480 ? 230 : 260, L = fs * 4.6, R = 10, T = fs * 2.2, B = fs * 2.6, iw = W - L - R, ih = H - T - B;
  const yRaw = Math.max(...rows.map((r) => r[1])), step = niceStep(yRaw), yMax = Math.ceil(yRaw / step) * step;
  const slot = iw / rows.length, bw = slot * 0.64, y = (t: number) => T + ih - (t / yMax) * ih;
  const narrow = W < 520;
  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={ariaLabel} className="block max-w-full" style={{ fontFamily: "'Inter Variable', Inter, sans-serif" }}>
        {Array.from({ length: yMax / step + 1 }).map((_, i) => (
          <g key={i}><line x1={L} x2={W - R} y1={y(i * step)} y2={y(i * step)} stroke="hsl(var(--border))" /><text x={L - 8} y={y(i * step) + fs * 0.35} textAnchor="end" fontSize={fs} fill="hsl(var(--muted-foreground))">{N.format(i * step)} €</text></g>
        ))}
        {rows.map((r, i) => {
          const cx = L + slot * i + slot / 2, amt = r[1], h = (amt / yMax) * ih, on = i === activeIndex;
          return (
            <g key={i}>
              <rect x={cx - bw / 2} y={T + ih - h} width={bw} height={Math.max(h, 1)} rx={3} fill={on ? "hsl(var(--brand))" : "hsl(214 24% 86%)"} />
              {(!narrow || i % 2 === 0 || on) && <text x={cx} y={H - fs * 0.9} textAnchor="middle" fontSize={fs * 0.92} fill={on ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"} fontWeight={on ? 700 : 400}>{r[0] === null ? `${N.format((rows[i - 1]?.[0] ?? 0) + 1)}+` : N.format(r[0])}</text>}
              {on && <text x={Math.min(Math.max(cx, L + 40), W - R - 40)} y={T + ih - h - 10} textAnchor="middle" fontSize={fs * 1.05} fontWeight={700} fill="hsl(var(--foreground))">{EUR.format(Math.round(amt * share * 100) / 100)}</text>}
            </g>
          );
        })}
        <text x={W - R} y={T - fs * 0.8} textAnchor="end" fontSize={fs * 0.9} fill="hsl(var(--muted-foreground))">{axisLabel}</text>
      </svg>
    </div>
  );
}
