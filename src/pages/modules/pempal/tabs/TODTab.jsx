// src/pages/modules/pempal/tabs/TODTab.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../../../hooks/useAuth';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import StatCard from '../../../../components/ui/StatCard';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { pempalApi } from '../../../../services/api';
import PeriodManager from '../tabs/PeriodManager';
import { useWebSocket } from '../../../../hooks/useWebSocket';
import { effectivePx, FeedbackBanner } from '../utils/tabHelpers';


const ENTRY_TYPES = [
  { value: '',          label: '—' },
  { value: 'PCT_OFF',   label: '% OFF' },
  { value: 'PRICE_PT',  label: 'Price Pt' },
  { value: 'BOGO_FREE', label: 'BOGO Free' },
  { value: 'BOGO_50',   label: 'BOGO 50' },
  { value: 'MUPP',      label: 'MUPP' },
];

const TYPE_COLOR = {
  PCT_OFF:   'bg-primary-50   text-primary-700  border-primary-200',
  PRICE_PT:  'bg-accent-50    text-accent-700   border-accent-200',
  BOGO_FREE: 'bg-success-50   text-success-700  border-success-500/20',
  BOGO_50:   'bg-success-50   text-success-700  border-success-500/20',
  MUPP:      'bg-warning-50   text-warning-700  border-warning-500/20',
};

const CHIP_VARIANTS = {
  blue:    'bg-blue-50    text-blue-700    border-blue-200',
  green:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber:   'bg-amber-50   text-amber-700   border-amber-200',
  red:     'bg-red-50     text-red-700     border-red-200',
  purple:  'bg-violet-50  text-violet-700  border-violet-200',
  neutral: 'bg-neutral-100 text-neutral-600 border-neutral-200',
};


function depthOf(entryType, offerValue, ticket) {
  if (!entryType) return 0;
  if (entryType === 'TICKET')    return 0;
  if (entryType === 'PCT_OFF') {
    const v = parseFloat(offerValue || '0');
    return isNaN(v) ? 0 : v;
  }
  if (entryType === 'PRICE_PT') {
    const v = parseFloat(offerValue || '0');
    if (isNaN(v) || v <= 0 || !ticket) return 0;
    return Math.max(0, 100 * (1 - v / ticket));
  }
  if (entryType === 'BOGO_FREE') return 50;
  if (entryType === 'BOGO_50')   return 25;
  if (entryType === 'MUPP')      return 20;
  return 0;
}


export default function TODTab() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'Manager';

  const [products,   setProducts]   = useState([]);
  const [periods,    setPeriods]    = useState([]);
  const [channels,   setChannels]   = useState([]);
  const [entries,    setEntries]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback,   setFeedback]   = useState(null);
  const [activeChannel, setActiveChannel] = useState('STR');

  // Filters
  const [search,      setSearch]      = useState('');
  const [filterDept,  setFilterDept]  = useState('all');
  const [filterFill,  setFilterFill]  = useState('all');
  const [sortBy,  setSortBy]  = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // Metrics expand
  const [showAllMetrics,  setShowAllMetrics]  = useState(false);
  const [expandedMetrics, setExpandedMetrics] = useState(new Set());
  const toggleRowMetrics = useCallback((productId) => {
    setExpandedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId); else next.add(productId);
      return next;
    });
  }, []);
  const isMetricsVisible = (productId) => showAllMetrics || expandedMetrics.has(productId);

  // ── Undo / redo ──────────────────────────────────────────────────────
  const entriesRef = useRef({});
  const histRef    = useRef({ stack: [{}], idx: 0 });
  const [, setHistoryTick] = useState(0);

  useEffect(() => { entriesRef.current = entries; }, [entries]);

  const pushHistory = useCallback((snapshot) => {
    const h = histRef.current;
    h.stack = h.stack.slice(0, h.idx + 1).concat([snapshot]);
    h.idx   = h.stack.length - 1;
    setHistoryTick(t => t + 1);
  }, []);

  const resetHistory = useCallback((snapshot) => {
    entriesRef.current = snapshot;
    histRef.current    = { stack: [snapshot], idx: 0 };
    setHistoryTick(t => t + 1);
  }, []);

  const undo = useCallback(() => {
    const h = histRef.current;
    if (h.idx <= 0) return;
    h.idx--;
    entriesRef.current = h.stack[h.idx];
    setEntries(h.stack[h.idx]);
    setHistoryTick(t => t + 1);
  }, []);

  const redo = useCallback(() => {
    const h = histRef.current;
    if (h.idx >= h.stack.length - 1) return;
    h.idx++;
    entriesRef.current = h.stack[h.idx];
    setEntries(h.stack[h.idx]);
    setHistoryTick(t => t + 1);
  }, []);

  const canUndo = histRef.current.idx > 0;
  const canRedo = histRef.current.idx < histRef.current.stack.length - 1;

  useEffect(() => {
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (e.key === 'y') { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo]);
  // ────────────────────────────────────────────────────────────────────

  useEffect(() => { reload(false); }, []);

  useWebSocket({
    entries_changed: () => reload(true),
    periods_changed: () => reload(true),
  });

  const reload = (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    Promise.all([
      pempalApi.getProducts(),
      pempalApi.getPeriods(),
      pempalApi.getChannels(),
      pempalApi.getEntries(),
    ])
      .then(([prods, pers, chans, existing]) => {
        setProducts(prods);
        setPeriods(pers);
        setChannels(chans);
        const map = {};
        existing.forEach(e => {
          map[`${e.product_id}:${e.channel}:${e.period_id}`] = {
            entry_type: e.entry_type,
            offer_value: e.offer_value || '',
            quantity: e.quantity || 1,
            reason: e.reason || '',
          };
        });
        setEntries(map);
        resetHistory(map);
      })
      .catch(err => setFeedback({ type: 'error', message: err.message }))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  const updateEntry = (productId, periodId, field, value) => {
    const key  = `${productId}:${activeChannel}:${periodId}`;
    const prev = entriesRef.current;
    const next = { ...prev, [key]: { ...prev[key], [field]: value } };
    entriesRef.current = next;
    setEntries(next);
    pushHistory(next);
  };

  const copyToAllChannels = useCallback((productId) => {
    const prev = entriesRef.current;
    const next = { ...prev };
    for (const period of todPeriods) {
      const src = prev[`${productId}:${activeChannel}:${period.id}`];
      if (src?.entry_type) {
        for (const ch of channels) {
          if (ch.id !== activeChannel) {
            next[`${productId}:${ch.id}:${period.id}`] = { ...src };
          }
        }
      }
    }
    entriesRef.current = next;
    setEntries(next);
    pushHistory(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, activeChannel, pushHistory]);

  const todPeriods = useMemo(() => periods.filter(p => p.type === 'TOD'), [periods]);
  const stdPeriods = useMemo(() => periods.filter(p => p.type === 'Standard'), [periods]);

  const stdDepth = useCallback((productId, channel, ticket) => {
    let maxDepth = 0;
    for (const sp of stdPeriods) {
      const e = entriesRef.current[`${productId}:${channel}:${sp.id}`];
      if (e?.entry_type) {
        const d = depthOf(e.entry_type, e.offer_value, ticket);
        if (d > maxDepth) maxDepth = d;
      }
    }
    return maxDepth;
  }, [stdPeriods]);

  const departments = useMemo(
    () => ['all', ...Array.from(new Set(products.map(p => p.department)))],
    [products],
  );

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (filterDept !== 'all' && p.department !== filterDept) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.id.toLowerCase().includes(q)) return false;
      }
      if (filterFill === 'filled') {
        const hasAny = todPeriods.some(tp => entriesRef.current[`${p.id}:${activeChannel}:${tp.id}`]?.entry_type);
        if (!hasAny) return false;
      }
      if (filterFill === 'empty') {
        const hasAny = todPeriods.some(tp => entriesRef.current[`${p.id}:${activeChannel}:${tp.id}`]?.entry_type);
        if (hasAny) return false;
      }
      return true;
    });
  }, [products, todPeriods, filterDept, filterFill, search, activeChannel, entries]);

  const sortedProducts = useMemo(() => {
    const arr = [...filteredProducts];
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'name')   arr.sort((a, b) => dir * a.name.localeCompare(b.name));
    if (sortBy === 'dept')   arr.sort((a, b) => dir * (a.department.localeCompare(b.department) || a.name.localeCompare(b.name)));
    if (sortBy === 'ticket') arr.sort((a, b) => dir * (a.ticket - b.ticket));
    if (sortBy === 'woh')    arr.sort((a, b) => dir * ((a.woh ?? 9999) - (b.woh ?? 9999)));
    if (sortBy === 'fill') {
      arr.sort((a, b) => {
        const fa = todPeriods.filter(p => entries[`${a.id}:${activeChannel}:${p.id}`]?.entry_type).length;
        const fb = todPeriods.filter(p => entries[`${b.id}:${activeChannel}:${p.id}`]?.entry_type).length;
        return dir * (fa - fb);
      });
    }
    return arr;
  }, [filteredProducts, sortBy, sortDir, todPeriods, entries, activeChannel]);

  // Channel fill stats for the selector
  const channelStats = useMemo(() => {
    return channels.map(c => {
      const filled = todPeriods.reduce((sum, tp) => {
        return sum + products.filter(p => entries[`${p.id}:${c.id}:${tp.id}`]?.entry_type).length;
      }, 0);
      return { ...c, filled };
    });
  }, [channels, entries, products, todPeriods]);

  const totalSlots = products.length * todPeriods.length;

  const exportToCSV = () => {
    const headers = ['Product ID', 'Product Name', 'Department', 'Ticket', 'Channel', 'Period ID', 'Period Label', 'Entry Type', 'Offer Value'];
    const rows = [];
    for (const product of products) {
      for (const ch of channels) {
        for (const period of todPeriods) {
          const entry = entries[`${product.id}:${ch.id}:${period.id}`];
          if (entry?.entry_type) {
            rows.push([
              product.id,
              `"${product.name.replace(/"/g, '""')}"`,
              `"${product.department.replace(/"/g, '""')}"`,
              product.ticket,
              ch.id, period.id,
              `"${period.label.replace(/"/g, '""')}"`,
              entry.entry_type,
              entry.offer_value || '',
            ].join(','));
          }
        }
      }
    }
    if (rows.length === 0) { setFeedback({ type: 'warning', message: 'No TOD entries to export.' }); return; }
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `tod-plan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setFeedback(null);

    const payload = Object.entries(entriesRef.current)
      .filter(([key, e]) => {
        const [, , periodId] = key.split(':');
        const period = periods.find(p => p.id === periodId);
        return period?.type === 'TOD' && e?.entry_type;
      })
      .map(([key, e]) => {
        const [productId, channel, periodId] = key.split(':');
        const product = products.find(p => p.id === productId);
        return {
          product_id: productId, product_name: product?.name || '',
          department: product?.department || '', channel,
          period_id: periodId, entry_type: e.entry_type,
          offer_value: e.offer_value || null,
          quantity: (e.quantity && e.quantity > 1) ? e.quantity : null,
          notes: null, reason: e.reason || null,
        };
      });

    if (payload.length === 0) {
      setFeedback({ type: 'warning', message: 'Add at least one TOD offer before submitting.' });
      setSubmitting(false);
      return;
    }

    try {
      const result = await pempalApi.submit(payload);
      const todViolations = result.flags?.find(f => f.category === 'TOD Not Deeper');
      if (todViolations?.count > 0) {
        setFeedback({
          type: 'warning',
          message: `${result.submitted} TOD entries saved. ${todViolations.count} violate the "TOD must be deeper" rule — see Audit tab.`,
        });
      } else {
        setFeedback({ type: 'success', message: `${result.submitted} TOD entries saved. All offers are legally deeper than standard.` });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <TODSkeleton />;

  return (
    <div className="space-y-5">
      {refreshing && (
        <div className="h-0.5 w-full overflow-hidden rounded bg-accent-100">
          <div className="h-full w-full animate-pulse bg-accent-400" />
        </div>
      )}

      {/* Period manager */}
      {!isReadOnly && <PeriodManager periods={periods} onChange={reload} />}

      {/* Channel selector with fill stats */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-card p-1.5 flex gap-1">
        {channelStats.map(c => {
          const isActive = c.id === activeChannel;
          const pct = totalSlots > 0 ? Math.round((c.filled / totalSlots) * 100) : 0;
          return (
            <button
              key={c.id}
              onClick={() => setActiveChannel(c.id)}
              className={
                'flex-1 px-4 py-3 rounded-lg transition-all text-left group ' +
                (isActive
                  ? 'bg-accent-50 border border-accent-200 shadow-xs'
                  : 'border border-transparent hover:bg-neutral-50')
              }
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded ${isActive ? 'bg-accent-600 text-white' : 'bg-neutral-200 text-neutral-700'}`}>
                    {c.id}
                  </span>
                  <span className={`text-[13px] font-semibold ${isActive ? 'text-accent-800' : 'text-neutral-900'}`}>
                    {c.name}
                  </span>
                </div>
                {c.filled > 0 && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums ${isActive ? 'bg-accent-200 text-accent-800' : 'bg-neutral-100 text-neutral-600'}`}>
                    {c.filled}
                  </span>
                )}
              </div>
              <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${isActive ? 'bg-accent-500' : 'bg-neutral-300'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="TOD Periods" value={todPeriods.length} hint="Today-Only-Deal event windows" />
        <StatCard label="Products" value={filteredProducts.length} hint={`${products.length} total`} />
        <StatCard label="TOD Filled" value={channelStats.find(c => c.id === activeChannel)?.filled ?? 0} hint={`on ${activeChannel} channel`} />
        <StatCard label="Coverage" value={`${totalSlots > 0 ? Math.round(((channelStats.find(c => c.id === activeChannel)?.filled ?? 0) / totalSlots) * 100) : 0}%`} hint={`${totalSlots} total slots`} />
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-accent-50 border border-accent-200/60 rounded-lg text-[12px] text-accent-700">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>
          <strong>Legal compliance:</strong> Each TOD offer must be strictly deeper than the standard period offer for the same product and channel.
          The <span className="font-semibold">Min Depth</span> badge shows the floor — your TOD offer must exceed it.
        </span>
      </div>

      {/* Filter / action bar */}
      {todPeriods.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-neutral-700">No TOD periods configured</p>
            <p className="text-xs text-neutral-500 mt-1">Add TOD-type periods in Period Manager above.</p>
          </div>
        </Card>
      ) : (
        <Card padding="none" fullscreen action={<>
          <div className="relative flex-1 min-w-[160px]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-7 pl-8 pr-3 text-xs bg-white/70 border border-primary-100 rounded-md placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-primary-300" />
          </div>
          <div className="flex items-center gap-1.5 border-l border-primary-100 pl-3">
            <label className="text-[10px] uppercase tracking-wider text-primary-500 font-semibold">Dept:</label>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="h-7 px-2 text-xs bg-white border border-primary-100 rounded-md focus:outline-none focus:border-primary-300">
              {departments.map(d => <option key={d} value={d}>{d === 'all' ? 'All' : d}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-primary-500 font-semibold">Show:</label>
            <div className="flex bg-white/70 border border-primary-100 rounded-md p-0.5">
              {[{ v: 'all', l: 'All' }, { v: 'filled', l: 'Filled' }, { v: 'empty', l: 'Empty' }].map(o => (
                <button key={o.v} onClick={() => setFilterFill(o.v)}
                  className={'h-6 px-2 text-[11px] font-medium rounded transition-all ' + (filterFill === o.v ? 'bg-primary-500 text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-900')}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 border-l border-primary-100 pl-3">
            <label className="text-[10px] uppercase tracking-wider text-primary-500 font-semibold">Sort:</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="h-7 px-2 text-xs bg-white border border-primary-100 rounded-md focus:outline-none focus:border-primary-300">
              <option value="name">Product</option>
              <option value="dept">Dept</option>
              <option value="ticket">Ticket $</option>
              <option value="woh">WOH</option>
              <option value="fill">Fill %</option>
            </select>
            <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="h-7 w-7 flex items-center justify-center rounded border border-primary-100 bg-white text-primary-500 hover:bg-primary-50 transition-all text-sm font-medium">
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => { setShowAllMetrics(v => !v); setExpandedMetrics(new Set()); }}
              title={showAllMetrics ? 'Hide product metrics' : 'Show product metrics'}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-semibold transition-all border ${
                showAllMetrics
                  ? 'bg-primary-600 border-primary-700 text-white shadow-sm'
                  : 'bg-white border-primary-200 text-primary-600 hover:bg-primary-50 hover:border-primary-300'
              }`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              Metrics
            </button>
            {!isReadOnly && (
              <div className="flex items-center gap-0.5 border-r border-primary-100 pr-2.5">
                <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
                  className="h-7 w-7 flex items-center justify-center rounded text-primary-400 hover:text-primary-700 hover:bg-primary-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                  </svg>
                </button>
                <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
                  className="h-7 w-7 flex items-center justify-center rounded text-primary-400 hover:text-primary-700 hover:bg-primary-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
                  </svg>
                </button>
              </div>
            )}
            <span className="text-[11px] text-primary-500">{filteredProducts.length} of {products.length}</span>
            <button onClick={exportToCSV} className="h-7 px-2.5 text-[11px] font-medium text-primary-600 bg-white border border-primary-200 rounded-md hover:bg-primary-50 transition-all">Export CSV</button>
            {!isReadOnly && <Button onClick={handleSubmit} loading={submitting} size="sm">Submit TOD entries</Button>}
          </div>
        </>}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-primary-50 border-b border-primary-100 sticky top-0 z-10">
                <tr>
                  <th className="sticky left-0 z-20 bg-primary-50 px-4 py-2.5 text-left text-[10px] font-semibold text-primary-600 uppercase tracking-wider min-w-[280px] border-r border-primary-100">
                    <div className="flex items-center justify-between gap-2">
                      <span>Product</span>
                      <button
                        onClick={() => { setShowAllMetrics(v => !v); setExpandedMetrics(new Set()); }}
                        title={showAllMetrics ? 'Hide metrics' : 'Show metrics for all products'}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider transition-all border ${
                          showAllMetrics
                            ? 'bg-primary-50 border-primary-200 text-primary-600'
                            : 'bg-white border-neutral-200 text-neutral-400 hover:text-neutral-600 hover:border-neutral-300'
                        }`}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                        </svg>
                        {showAllMetrics ? 'Hide' : 'Metrics'}
                      </button>
                    </div>
                  </th>
                  {todPeriods.map(p => (
                    <th key={p.id} className="px-3 py-2.5 text-left min-w-[220px] border-l border-primary-100">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="accent" size="xs">TOD</Badge>
                          <span className="text-[11px] font-semibold text-primary-700">{p.id}</span>
                        </div>
                        <span className="text-[10px] text-primary-500 font-normal normal-case">{p.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sortedProducts.map(product => (
                  <tr key={product.id} className="hover:bg-neutral-50/40 transition-colors group">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-neutral-50 px-4 py-2.5 border-r border-neutral-100 transition-colors">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[13px] font-medium text-neutral-900 leading-tight truncate">{product.name}</span>
                            <span className="text-[11px] font-bold font-mono tabular-nums text-neutral-800 shrink-0">${product.ticket.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-neutral-400 font-mono shrink-0">{product.id}</span>
                            <span className="text-[9px] text-neutral-300">·</span>
                            <span className="text-[10px] text-neutral-500 truncate">{product.department}</span>
                          </div>
                          {isMetricsVisible(product.id) && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {product.inventory_units != null && <MetricChip label="Inv" value={`${product.inventory_units}u`} variant="blue" />}
                              {product.last_week_sales != null && <MetricChip label="LW" value={`${product.last_week_sales}u`} variant="green" />}
                              {product.woh != null && (
                                <MetricChip label="WOH" value={product.woh.toFixed(1)} variant={product.woh < 2 ? 'red' : product.woh > 10 ? 'amber' : 'neutral'} />
                              )}
                              {product.auc != null && <MetricChip label="AUC" value={`$${product.auc.toFixed(0)}`} variant="purple" />}
                            </div>
                          )}
                        </div>
                        {/* Hover actions */}
                        <div className="opacity-0 group-hover:opacity-100 flex flex-col items-center gap-0.5 shrink-0 transition-all">
                          <button
                            onClick={() => toggleRowMetrics(product.id)}
                            title={isMetricsVisible(product.id) ? 'Hide metrics' : 'Show metrics'}
                            className={`h-5 w-5 flex items-center justify-center rounded text-[9px] transition-all ${
                              expandedMetrics.has(product.id) ? 'bg-primary-100 text-primary-600' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              {isMetricsVisible(product.id)
                                ? <path d="M5 12h14"/>
                                : <><path d="M12 5v14"/><path d="M5 12h14"/></>}
                            </svg>
                          </button>
                          <button
                            onClick={() => copyToAllChannels(product.id)}
                            title={`Copy ${activeChannel} TOD entries to all channels`}
                            className="h-5 w-5 flex items-center justify-center rounded text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                          >
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </td>

                    {todPeriods.map(period => {
                      const key   = `${product.id}:${activeChannel}:${period.id}`;
                      const entry = entries[key] || {};
                      const floor = stdDepth(product.id, activeChannel, product.ticket);
                      const currentDepth = depthOf(entry.entry_type, entry.offer_value, product.ticket);
                      const needsValue   = ['PCT_OFF', 'PRICE_PT'].includes(entry.entry_type);
                      const hasReason    = !!entry.reason;
                      const isViolation  = entry.entry_type && entry.entry_type !== 'TICKET' && currentDepth <= floor && floor > 0;

                      // Dynamic GM%
                      let dynGmPct = null;
                      if (entry.entry_type && product.auc != null && product.ticket) {
                        const eff = effectivePx(entry.entry_type, entry.offer_value, product.ticket);
                        if (eff > 0) dynGmPct = (eff - product.auc) / eff * 100;
                      }

                      return (
                        <td key={period.id} className={`px-2.5 py-2 border-l border-neutral-100 ${isViolation ? 'bg-danger-50/30' : ''}`}>
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-1">
                              <select
                                value={entry.entry_type || ''}
                                onChange={e => updateEntry(product.id, period.id, 'entry_type', e.target.value)}
                                disabled={isReadOnly}
                                className={
                                  'flex-1 min-w-0 h-7 px-1.5 text-[11px] border rounded-md ' +
                                  'focus:outline-none focus:shadow-glow-primary transition-all font-medium ' +
                                  (entry.entry_type
                                    ? `${TYPE_COLOR[entry.entry_type] || 'border-neutral-300'}`
                                    : 'bg-white border-neutral-200 text-neutral-400')
                                }
                              >
                                {ENTRY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                              </select>
                              <input
                                type="text"
                                value={entry.offer_value || ''}
                                onChange={e => updateEntry(product.id, period.id, 'offer_value', e.target.value)}
                                placeholder={needsValue ? 'val' : '—'}
                                disabled={isReadOnly || !needsValue}
                                className={
                                  'w-14 h-7 px-1.5 text-[11px] text-center font-mono tabular-nums bg-white border rounded-md ' +
                                  'focus:outline-none focus:border-primary-400 focus:shadow-glow-primary transition-all ' +
                                  'disabled:bg-neutral-50 disabled:text-neutral-300 disabled:border-neutral-100 ' +
                                  (entry.offer_value ? 'border-neutral-300 text-neutral-900' : 'border-neutral-200')
                                }
                              />
                            </div>
                            {/* Quantity */}
                            {entry.entry_type && (
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-neutral-400 font-medium uppercase tracking-wide">Qty</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={entry.quantity || 1}
                                  onChange={e => updateEntry(product.id, period.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                  disabled={isReadOnly}
                                  className={
                                    'w-12 h-5 px-1 text-[10px] text-center font-mono tabular-nums bg-white border rounded transition-all ' +
                                    'focus:outline-none focus:border-primary-400 ' +
                                    ((entry.quantity || 1) > 1
                                      ? 'border-warning-400 text-warning-700 bg-warning-50'
                                      : 'border-neutral-200 text-neutral-500') +
                                    (isReadOnly ? ' opacity-60 cursor-not-allowed' : '')
                                  }
                                />
                              </div>
                            )}

                            {/* Dynamic GM% */}
                            {dynGmPct !== null && (
                              <span className={`text-[9px] font-mono tabular-nums px-1 py-0.5 rounded self-start ${
                                dynGmPct >= 52 ? 'bg-emerald-50 text-emerald-700'
                                : dynGmPct >= 40 ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700'
                              }`}>
                                GM {dynGmPct.toFixed(1)}%
                              </span>
                            )}

                            {/* Min-depth hint */}
                            <div className="flex items-center gap-1">
                              {floor > 0 ? (
                                <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${isViolation ? 'bg-danger-100 text-danger-600' : 'bg-neutral-100 text-neutral-500'}`}>
                                  {isViolation ? '⚠ ' : ''}Min &gt; {floor.toFixed(0)}%
                                </span>
                              ) : (
                                <span className="text-[9px] text-neutral-300 font-mono">No std floor</span>
                              )}
                              {entry.entry_type && !isViolation && currentDepth > 0 && (
                                <span className="text-[9px] font-mono text-success-600 bg-success-50 px-1 py-0.5 rounded">
                                  ✓ {currentDepth.toFixed(0)}%
                                </span>
                              )}
                            </div>

                            {/* Reason field */}
                            {entry.entry_type && (
                              <input
                                type="text"
                                value={entry.reason || ''}
                                onChange={e => updateEntry(product.id, period.id, 'reason', e.target.value)}
                                placeholder="Why? (optional)"
                                disabled={isReadOnly}
                                className={
                                  'w-full h-6 px-1.5 text-[10px] border rounded-md transition-all ' +
                                  'focus:outline-none focus:border-primary-300 ' +
                                  (hasReason
                                    ? 'bg-amber-50 border-amber-200 text-amber-800 placeholder:text-amber-400'
                                    : 'bg-neutral-50 border-neutral-200 text-neutral-500 placeholder:text-neutral-300')
                                }
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
    </div>
  );
}


function MetricChip({ label, value, variant = 'neutral' }) {
  const cls = CHIP_VARIANTS[variant] || CHIP_VARIANTS.neutral;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border font-medium ${cls}`}>
      <span className="opacity-50 font-normal">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}


function TODSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-14 w-full" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
