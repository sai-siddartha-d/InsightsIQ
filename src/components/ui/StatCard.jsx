// src/components/ui/StatCard.jsx
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords]   = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const show = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 6, left: r.left });
    }
    setVisible(true);
  };

  return (
    <span
      ref={ref}
      className="inline-flex items-center flex-shrink-0 cursor-default"
      onMouseEnter={show}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="text-primary-300 hover:text-primary-500 transition-colors text-[11px] leading-none select-none">
        ⓘ
      </span>
      {visible && createPortal(
        <div
          style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }}
          className="w-64 bg-primary-800 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2.5 shadow-float pointer-events-none animate-fade-in"
        >
          <div className="absolute bottom-full left-3 border-[5px] border-transparent border-b-primary-800" />
          {text}
        </div>,
        document.body,
      )}
    </span>
  );
}

export default function StatCard({ label, value, change, trend, hint, icon, tooltip, comparisons }) {
  const trendStyles = {
    up:   { color: 'text-success-700', bg: 'bg-success-50',  border: 'border-success-500/20', arrow: '↑' },
    down: { color: 'text-danger-700',  bg: 'bg-danger-50',   border: 'border-danger-500/20',  arrow: '↓' },
    flat: { color: 'text-neutral-600', bg: 'bg-neutral-100', border: 'border-neutral-200',    arrow: '→' },
  };
  const t = trend ? trendStyles[trend] : null;

  return (
    <div className="group relative bg-white rounded-xl border border-neutral-200 shadow-card hover:shadow-pop hover:border-primary-200 transition-all duration-200 p-5 overflow-hidden">
      {/* Teal accent stripe on left edge */}
      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-primary-500 opacity-70 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <p className="text-[10.5px] font-semibold text-primary-500 uppercase tracking-widest">{label}</p>
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        {icon && <span className="text-primary-300">{icon}</span>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-bold text-neutral-900 tracking-tight tabular-nums leading-none">{value}</p>
        {t && (
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded border ${t.color} ${t.bg} ${t.border}`}>
            <span>{t.arrow}</span>{change}
          </span>
        )}
      </div>
      {hint && <p className="mt-2 text-[11px] text-neutral-400">{hint}</p>}

      {comparisons && comparisons.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-neutral-100 flex-wrap">
          {comparisons.map((c, i) => {
            const ts = trendStyles[c.trend] || trendStyles.flat;
            return (
              <span key={i} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9.5px] font-semibold rounded border ${ts.color} ${ts.bg} ${ts.border}`}>
                {ts.arrow} {c.change}
                <span className="text-[8.5px] opacity-60 ml-0.5">{c.label}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
