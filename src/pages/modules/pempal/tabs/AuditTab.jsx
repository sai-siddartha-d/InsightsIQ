// src/pages/modules/pempal/tabs/AuditTab.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import { pempalApi } from '../../../../services/api';
import { useWebSocket } from '../../../../hooks/useWebSocket';
import { InfoTooltip } from '../../../../components/ui/StatCard';

// `formula` powers the ⓘ tooltip on each category — it explains exactly how the
// flag is computed, including the effective-price / depth formulas it relies on.
const CATEGORY_META = {
  'Required': {
    description: 'Products with no standard-period offer in any channel.',
    severity: 'warning',
    formula: 'Flagged when a product has zero submitted entries across every channel (STR, ONL, ONO) for all Standard periods — i.e. no (product, channel, standard-period) combination exists in the working plan. Advisory (non-blocking).',
  },
  'Invalid': {
    description: 'Entries with invalid offer values.',
    severity: 'danger',
    formula: 'PCT_OFF: flagged when the % is not between 1 and 90, or non-numeric. PRICE_PT: flagged when the price is ≤ 0, or ≥ the product ticket (a price point must mark the item down). Blocking — submission is at risk until resolved.',
  },
  'TOD Not Deeper': {
    description: 'TOD offers that are not deeper than the standard offer.',
    severity: 'danger',
    formula: 'For each product + channel, a TOD offer is flagged when its discount depth ≤ the deepest Standard-period depth. Depth: PCT_OFF = % off; PRICE_PT = (1 − price ÷ ticket) × 100; BOGO Free = 50; BOGO 50 = 25; MUPP = 20. Blocking.',
  },
  'Should be at Reg': {
    description: 'Fast-selling products being discounted.',
    severity: 'warning',
    formula: 'Flagged when a product carrying a promotional offer has Weeks-on-Hand (WOH) < 2.0 — it will sell through at full price, so a markdown erodes margin needlessly. Advisory (non-blocking).',
  },
  'Below PCF': {
    description: 'Offers whose gross margin is under the 52.5% PCF floor.',
    severity: 'warning',
    formula: 'Effective GM% = (effective price − AUC) ÷ effective price × 100; flagged when GM% < 52.5% (the PCF margin floor). Effective price: PCT_OFF = ticket × (1 − %/100); PRICE_PT = price; BOGO Free = ticket × 0.5; BOGO 50 = ticket × 0.75; MUPP = ticket × 0.80; TICKET = ticket. Advisory (non-blocking).',
  },
};

export default function AuditTab({ onNavigateToProduct }) {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'Manager';

  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleReset = async () => {
    if (!confirm('Reset all data? This will delete all periods and their promo entries. Products and plan vintages will be kept. This cannot be undone.')) return;
    await pempalApi.resetAll();
    load();
  };

  const load = useCallback(() => {
    setLoading(true);
    pempalApi.getAudit()
      .then(setFlags)
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useWebSocket({
  entries_changed: () => load(),
});

  const totalIssues = flags.reduce((sum, f) => sum + f.count, 0);
  const blocking = flags.filter(f => ['Invalid', 'TOD Not Deeper'].includes(f.category))
                        .reduce((sum, f) => sum + f.count, 0);

  return (
    <div className="space-y-4">
      <Card
        title="Pre-Submission Audit"
        subtitle="Compliance and validation checks across the current working plan."
        fullscreen
        action={
  <div className="flex gap-2">
    {!isReadOnly && <Button variant="ghost" onClick={handleReset}>Reset All</Button>}
    <Button variant="secondary" onClick={load} loading={loading}>Refresh</Button>
  </div>
}
      >
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="px-4 py-3 rounded-lg bg-surface-subtle border border-surface-border">
            <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Total Issues</p>
            <p className="text-2xl font-bold text-primary-800 mt-1">{totalIssues}</p>
          </div>
          <div className={`px-4 py-3 rounded-lg border ${blocking > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Blocking Issues</p>
            <p className={`text-2xl font-bold mt-1 ${blocking > 0 ? 'text-danger' : 'text-success'}`}>
              {blocking}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {flags.map((flag) => {
            const meta = CATEGORY_META[flag.category];
            const hasIssues = flag.count > 0;
            return (
              <div
                key={flag.category}
                className={
                  'border rounded-lg p-4 transition-colors ' +
                  (hasIssues ? 'border-surface-border bg-white' : 'border-surface-border bg-surface-subtle/50')
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-primary-800">{flag.category}</h4>
                      {meta?.formula && <InfoTooltip text={meta.formula} />}
                      {hasIssues ? (
                        <Badge variant={meta?.severity || 'warning'}>{flag.count}</Badge>
                      ) : (
                        <Badge variant="success">Clean</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{meta?.description}</p>
                    {hasIssues && flag.items.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {flag.items.slice(0, 8).map((item, i) => (
                          <button
                            key={i}
                            onClick={() => onNavigateToProduct?.(item)}
                            title={`Go to ${item.product_id}${item.channel ? ` · ${item.channel}` : ''} in Promo Details`}
                            className="text-xs font-mono px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded hover:bg-primary-100 hover:text-primary-700 hover:ring-1 hover:ring-primary-300 transition-all cursor-pointer"
                          >
                            {item.product_id}{item.channel ? ` · ${item.channel}` : ''}
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" className="inline ml-1 opacity-50">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                              <path d="M15 3h6v6M10 14 21 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        ))}
                        {flag.items.length > 8 && (
                          <span className="text-xs text-gray-500">+ {flag.items.length - 8} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {blocking > 0 && (
          <div className="mt-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-danger">
              <strong>Submission blocked.</strong> Resolve all Invalid and TOD Not Deeper issues before submitting.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}