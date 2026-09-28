// src/pages/modules/pempal/utils/tabHelpers.jsx
// Shared helpers used by HierarchyTab, SeasonCodeTab, PromoDetailsTab, and TODTab.
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';


// ─── Pricing helpers (mirror backend _effective_price) ────────────────────────

export function effectivePx(entryType, offerValue, ticket) {
  if (!entryType || entryType === 'TICKET') return ticket;
  if (entryType === 'PCT_OFF') {
    const pct = parseFloat(offerValue ?? '0');
    return isNaN(pct) ? ticket : ticket * (1 - pct / 100);
  }
  if (entryType === 'PRICE_PT') {
    const price = parseFloat(offerValue ?? '0');
    return isNaN(price) || price <= 0 ? ticket : price;
  }
  if (entryType === 'BOGO_FREE') return ticket * 0.5;
  if (entryType === 'BOGO_50')   return ticket * 0.75;
  if (entryType === 'MUPP')      return ticket * 0.80;
  return ticket;
}

export function productGm(product, scenario) {
  const et = scenario ? scenario.entry_type  : product.entry_type;
  const ov = scenario ? scenario.offer_value : product.offer_value;
  if (!et || product.auc == null) return null;
  const eff = effectivePx(et, ov, product.ticket);
  if (!eff || eff <= 0) return null;
  return (eff - product.auc) / eff * 100;
}

export function rollupGm(products, scenarios) {
  const vals = products.flatMap(p => {
    const gm = productGm(p, scenarios[p.product_id] ?? null);
    return gm !== null ? [gm] : [];
  });
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}


// ─── Entry type lookups ───────────────────────────────────────────────────────

export const ENTRY_LABELS = {
  TICKET: 'TICK', PCT_OFF: 'PCT_OFF', PRICE_PT: 'PRICE_PT',
  BOGO_FREE: 'BOGO', BOGO_50: 'B50%', MUPP: 'MUPP',
};

export const ENTRY_COLORS = {
  TICKET:    'bg-neutral-100 text-neutral-600',
  PCT_OFF:   'bg-blue-100 text-blue-700',
  PRICE_PT:  'bg-violet-100 text-violet-700',
  BOGO_FREE: 'bg-teal-100 text-teal-700',
  BOGO_50:   'bg-cyan-100 text-cyan-700',
  MUPP:      'bg-orange-100 text-orange-700',
};

export const CHANNELS = [
  { id: 'STR', label: 'Stores' },
  { id: 'ONL', label: 'Online' },
  { id: 'ONO', label: 'Online Only' },
];


// ─── Small display components ─────────────────────────────────────────────────

export function VarianceBadge({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-neutral-300 text-[11px]">—</span>;
  }
  const neutral = Math.abs(value) <= 1;
  const cls = neutral
    ? 'bg-neutral-100 text-neutral-500'
    : value > 0
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums ${cls}`}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}
    </span>
  );
}

export function WohBadge({ woh }) {
  if (woh == null) return <span className="text-neutral-300 text-[11px]">—</span>;
  const cls = woh < 2
    ? 'bg-red-100 text-red-700'
    : woh > 10
    ? 'bg-amber-100 text-amber-700'
    : 'bg-neutral-100 text-neutral-500';
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium tabular-nums ${cls}`}>
      {woh.toFixed(1)}w
    </span>
  );
}

export function EntryBadge({ entryType, offerValue }) {
  if (!entryType) return <span className="text-neutral-300 text-[11px]">—</span>;
  const label = entryType === 'PCT_OFF'  ? `${offerValue}% off`
              : entryType === 'PRICE_PT' ? `$${offerValue}`
              : ENTRY_LABELS[entryType] || entryType;
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium ${ENTRY_COLORS[entryType] || 'bg-neutral-100 text-neutral-600'}`}>
      {label}
    </span>
  );
}

export function GmCell({ value, bold = false, muted = false }) {
  if (value == null) return <span className="text-neutral-300 text-[11px]">—</span>;
  const cls = bold
    ? 'text-[13px] font-semibold text-neutral-900 tabular-nums'
    : muted
    ? 'text-[12px] text-neutral-500 tabular-nums'
    : 'text-[12px] font-medium text-neutral-700 tabular-nums';
  return <span className={cls}>{value.toFixed(1)}%</span>;
}

export function ScenarioCell({ product, scenario, onSetScenario }) {
  const [draft, setDraft] = useState(scenario?.offer_value ?? '');

  useEffect(() => {
    setDraft(scenario?.offer_value ?? '');
  }, [scenario?.offer_value]);

  const scenGm    = scenario ? productGm(product, scenario) : null;
  const currentGm = productGm(product, null);

  const commit = (val) => {
    const v = val.trim();
    onSetScenario(v === '' ? null : { entry_type: 'PCT_OFF', offer_value: v });
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="relative flex items-center">
        <input
          type="number"
          min="0"
          max="90"
          step="1"
          value={draft}
          onChange={e => { setDraft(e.target.value); commit(e.target.value); }}
          placeholder="—"
          className="w-14 pr-5 pl-1.5 py-0.5 text-xs text-right bg-amber-50 border border-amber-200 rounded text-amber-800 placeholder-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400 tabular-nums"
        />
        <span className="absolute right-1.5 text-[9px] text-amber-400 pointer-events-none select-none">%</span>
      </div>
      {scenGm !== null && (
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold text-amber-700 tabular-nums">
            {scenGm.toFixed(1)}%
          </span>
          {currentGm !== null && (
            <span className={`text-[9px] font-medium tabular-nums ${scenGm >= currentGm ? 'text-emerald-600' : 'text-red-500'}`}>
              {scenGm >= currentGm ? '▲' : '▼'}{Math.abs(scenGm - currentGm).toFixed(1)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Dismissible, non-blocking toast shown at the top-centre of the screen.
// Auto-dismisses after a few seconds and can be closed manually — it must
// never take over the full page (that was the old behaviour and trapped users).
export function FeedbackBanner({ feedback, onDismiss }) {
  useEffect(() => {
    if (!feedback) return undefined;
    const ms = feedback.type === 'success' ? 4500 : 8000;
    const timer = setTimeout(() => onDismiss?.(), ms);
    return () => clearTimeout(timer);
  }, [feedback, onDismiss]);

  if (!feedback) return null;

  const palette = {
    success: { bg: '#f0fdf4', border: '#86efac', bar: '#22c55e', text: '#15803d', label: 'Saved successfully' },
    warning: { bg: '#fffbeb', border: '#fcd34d', bar: '#f59e0b', text: '#b45309', label: 'Attention required' },
    error:   { bg: '#fef2f2', border: '#fca5a5', bar: '#ef4444', text: '#b91c1c', label: 'Action failed' },
  };
  const s = palette[feedback.type] ?? palette.success;

  const ICONS = {
    success: <><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></>,
    warning: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    error:   <><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></>,
  };

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-in-down"
      style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 99999, width: 'min(440px, calc(100vw - 32px))',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        pointerEvents: 'auto',
      }}
    >
      <div style={{
        background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12,
        boxShadow: '0 12px 32px rgba(0,0,0,0.16)', overflow: 'hidden',
      }}>
        <div style={{ height: 4, background: s.bar }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px' }}>
          <svg
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke={s.bar} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            {ICONS[feedback.type] ?? ICONS.success}
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: s.text }}>
              {feedback.label ?? s.label}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: s.text, opacity: 0.85, lineHeight: 1.5 }}>
              {feedback.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss?.()}
            aria-label="Dismiss"
            style={{
              flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
              color: s.text, opacity: 0.55, padding: 2, lineHeight: 0, borderRadius: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
