// src/pages/modules/pempal/tabs/MarketedRollupTab.jsx
// Pivot view: discount depth buckets × periods, matching Excel "Marketed Rollup" tab structure.
import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import Card from '../../../../components/ui/Card';
import Badge from '../../../../components/ui/Badge';
import StatCard from '../../../../components/ui/StatCard';
import EmptyState from '../../../../components/ui/EmptyState';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { pempalApi } from '../../../../services/api';
import { useWebSocket } from '../../../../hooks/useWebSocket';


const CHANNEL_LABELS = { STR: 'Stores', ONL: 'Online', ONO: 'Online Only' };

// Color per depth level — warmer as discount deepens
const LEVEL_COLORS = {
  70: { bg: 'bg-red-100',    text: 'text-red-800',    cumBg: 'bg-red-50',    cumText: 'text-red-600'    },
  60: { bg: 'bg-orange-100', text: 'text-orange-800', cumBg: 'bg-orange-50', cumText: 'text-orange-600' },
  50: { bg: 'bg-amber-100',  text: 'text-amber-800',  cumBg: 'bg-amber-50',  cumText: 'text-amber-600'  },
  40: { bg: 'bg-yellow-100', text: 'text-yellow-800', cumBg: 'bg-yellow-50', cumText: 'text-yellow-600' },
  30: { bg: 'bg-lime-100',   text: 'text-lime-800',   cumBg: 'bg-lime-50',   cumText: 'text-lime-600'   },
  20: { bg: 'bg-emerald-100',text: 'text-emerald-800',cumBg: 'bg-emerald-50',cumText: 'text-emerald-600'},
  10: { bg: 'bg-teal-100',   text: 'text-teal-800',   cumBg: 'bg-teal-50',   cumText: 'text-teal-600'   },
};

const DEPTH_LEVELS = [70, 60, 50, 40, 30, 20, 10];


function GmChip({ value }) {
  if (value == null) return <span className="text-neutral-300 text-[11px]">—</span>;
  const cls = value >= 52 ? 'bg-emerald-100 text-emerald-800'
    : value >= 45 ? 'bg-amber-100 text-amber-800'
    : 'bg-red-100 text-red-800';
  return (
    <span className={`text-[11px] font-semibold font-mono tabular-nums rounded px-1.5 py-0.5 ${cls}`}>
      {value.toFixed(1)}%
    </span>
  );
}


export default function MarketedRollupTab() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filterCh,  setFilterCh]  = useState('STR');
  const [expandedLevels, setExpandedLevels] = useState(new Set());

  const load = useCallback(() => {
    setError(null);
    pempalApi.getMarketedRollup()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useWebSocket({ entries_changed: load });

  const toggleLevel = useCallback((level) => {
    setExpandedLevels(prev => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      return next;
    });
  }, []);

  // For each period, extract the channel data once
  const channelData = useMemo(() => {
    if (!data) return {};
    const result = {};
    for (const period of data.periods) {
      result[period.period_id] = period.channels.find(c => c.channel === filterCh) ?? null;
    }
    return result;
  }, [data, filterCh]);

  // Total marketed (all promo) count across periods
  const totalMarketed = useMemo(() => {
    if (!data) return 0;
    return data.periods.reduce((sum, p) => {
      const ch = p.channels.find(c => c.channel === filterCh);
      return sum + (ch?.all_promo?.cc_count ?? 0);
    }, 0);
  }, [data, filterCh]);

  if (loading) return <RollupSkeleton />;
  if (error)   return <div className="text-sm text-danger-700 px-4 py-3 bg-danger-50 rounded-lg">{error}</div>;

  const periods = data?.periods ?? [];

  // Only show levels that have at least one non-zero exact entry across all periods
  const activeLevels = DEPTH_LEVELS.filter(level =>
    periods.some(p => (channelData[p.period_id]?.depth_buckets ?? []).find(b => b.level === level)?.exact?.cc_count > 0)
  );

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total CCs" value={data?.total_cc ?? 0} hint="Customer choices in assortment" />
        <StatCard label="Periods" value={periods.length} hint="Active promo periods" />
        <StatCard label="Marketed Entries" value={totalMarketed} hint={`on ${filterCh} channel`} />
      </div>

      {/* Channel selector */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-card p-1.5 flex gap-1">
        {['STR', 'ONL', 'ONO'].map(ch => {
          const isActive = ch === filterCh;
          return (
            <button key={ch} onClick={() => setFilterCh(ch)}
              className={`flex-1 px-4 py-2.5 rounded-lg transition-all text-left ${isActive ? 'bg-primary-50 border border-primary-200 shadow-xs' : 'border border-transparent hover:bg-neutral-50'}`}
            >
              <span className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded mr-2 ${isActive ? 'bg-primary-600 text-white' : 'bg-neutral-200 text-neutral-700'}`}>{ch}</span>
              <span className={`text-[13px] font-semibold ${isActive ? 'text-primary-800' : 'text-neutral-900'}`}>{CHANNEL_LABELS[ch]}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-neutral-500 px-1">
        Each row is a discount depth band; cumulative rows (≥) show running totals from deepest to shallowest. Click an exact row to expand department breakdown.
      </p>

      {periods.length === 0 ? (
        <Card>
          <EmptyState title="No data" description="Submit offers in Promo Details to populate the marketed rollup." />
        </Card>
      ) : (
        <Card padding="none" fullscreen>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 600 }}>
              <thead>
                <tr className="bg-primary-50 border-b border-primary-100">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-primary-600 uppercase tracking-wide sticky left-0 bg-primary-50 z-10" style={{ minWidth: 180 }}>
                    Promo Slice
                  </th>
                  {periods.map(p => (
                    <th key={p.period_id} className="px-3 py-2.5 text-center border-l border-primary-100" style={{ minWidth: 140 }}>
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {p.period_type === 'TOD'
                            ? <Badge variant="accent" size="xs">TOD</Badge>
                            : <Badge variant="default" size="xs">Std</Badge>}
                          <span className="text-[11px] font-semibold text-primary-700">{p.period_id}</span>
                        </div>
                        <p className="text-[10px] text-primary-500 font-normal leading-tight">{p.period_label}</p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {/* ── All Promo row ── */}
                <tr className="bg-primary-700/5 font-semibold">
                  <td className="px-4 py-2.5 sticky left-0 bg-primary-700/5 z-10 border-r border-neutral-100" style={{ minWidth: 180 }}>
                    <span className="text-[12px] font-bold text-primary-800 bg-primary-100 px-2 py-0.5 rounded">All Promo</span>
                  </td>
                  {periods.map(p => {
                    const ch = channelData[p.period_id];
                    const cell = ch?.all_promo;
                    if (!cell || cell.cc_count === 0) return (
                      <td key={p.period_id} className="px-3 py-2.5 text-center border-l border-neutral-100 bg-neutral-50">
                        <span className="text-neutral-300 text-[11px]">—</span>
                      </td>
                    );
                    return (
                      <td key={p.period_id} className="px-3 py-2.5 text-center border-l border-neutral-100">
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[12px] font-bold text-neutral-800 tabular-nums">{cell.cc_count}</span>
                            <span className="text-[10px] text-neutral-500 tabular-nums">({cell.pct_blended.toFixed(0)}%)</span>
                          </div>
                          <GmChip value={cell.gm_pct} />
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* ── Per-level rows ── */}
                {DEPTH_LEVELS.map(level => {
                  const colors    = LEVEL_COLORS[level] ?? LEVEL_COLORS[10];
                  const isExpanded = expandedLevels.has(level);
                  const isActive   = activeLevels.includes(level);

                  // Collect all dept names that appear in any period for this exact level
                  const allDepts = new Set();
                  for (const p of periods) {
                    const bucket = channelData[p.period_id]?.depth_buckets?.find(b => b.level === level);
                    if (bucket?.exact?.dept_breakdown) {
                      Object.keys(bucket.exact.dept_breakdown).forEach(d => allDepts.add(d));
                    }
                  }
                  const deptList = [...allDepts].sort();

                  return (
                    <Fragment key={level}>
                      {/* Exact row */}
                      <tr
                        onClick={() => deptList.length > 0 && toggleLevel(level)}
                        className={`transition-colors ${deptList.length > 0 ? 'cursor-pointer hover:brightness-95' : ''} ${!isActive ? 'opacity-40' : ''}`}
                      >
                        <td className="px-4 py-2 sticky left-0 bg-white z-10 border-r border-neutral-100" style={{ minWidth: 180 }}>
                          <div className="flex items-center gap-2">
                            {deptList.length > 0 && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                                className={`text-neutral-400 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}>
                                <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                            <span className={`text-[12px] font-semibold px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                              {level}% off
                            </span>
                          </div>
                        </td>
                        {periods.map(p => {
                          const bucket = channelData[p.period_id]?.depth_buckets?.find(b => b.level === level);
                          const cell   = bucket?.exact;
                          if (!cell || cell.cc_count === 0) return (
                            <td key={p.period_id} className="px-3 py-2 text-center border-l border-neutral-100 bg-neutral-50/50">
                              <span className="text-neutral-300 text-[11px]">—</span>
                            </td>
                          );
                          return (
                            <td key={p.period_id} className="px-3 py-2 text-center border-l border-neutral-100">
                              <div className="space-y-1">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="text-[12px] font-semibold text-neutral-800 tabular-nums">{cell.cc_count}</span>
                                  <span className="text-[10px] text-neutral-400 tabular-nums">({cell.pct_blended.toFixed(0)}%)</span>
                                </div>
                                <GmChip value={cell.gm_pct} />
                              </div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Dept sub-rows for exact */}
                      {isExpanded && deptList.map(dept => (
                        <tr key={`${level}::${dept}`} className="bg-neutral-50/30 hover:bg-neutral-50 transition-colors">
                          <td className="pl-10 pr-4 py-1.5 sticky left-0 bg-neutral-50/40 z-10 border-r border-neutral-100" style={{ minWidth: 180 }}>
                            <p className="text-[11px] text-neutral-600">{dept}</p>
                          </td>
                          {periods.map(p => {
                            const bucket   = channelData[p.period_id]?.depth_buckets?.find(b => b.level === level);
                            const deptCell = bucket?.exact?.dept_breakdown?.[dept];
                            if (!deptCell) return (
                              <td key={p.period_id} className="px-3 py-1.5 text-center border-l border-neutral-100">
                                <span className="text-neutral-200 text-[10px]">—</span>
                              </td>
                            );
                            return (
                              <td key={p.period_id} className="px-3 py-1.5 text-center border-l border-neutral-100">
                                <div className="space-y-0.5">
                                  <p className="text-[11px] text-neutral-600 tabular-nums">{deptCell.cc_count} CCs</p>
                                  <GmChip value={deptCell.gm_pct} />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Cumulative row (≥ level%) */}
                      <tr className={`${colors.cumBg} border-t border-dashed border-neutral-200`}>
                        <td className={`px-4 py-1.5 sticky left-0 z-10 border-r border-neutral-100 ${colors.cumBg}`} style={{ minWidth: 180 }}>
                          <span className={`text-[11px] font-medium pl-4 ${colors.cumText}`}>
                            ≥{level}% off
                          </span>
                        </td>
                        {periods.map(p => {
                          const bucket = channelData[p.period_id]?.depth_buckets?.find(b => b.level === level);
                          const cell   = bucket?.cumulative;
                          if (!cell || cell.cc_count === 0) return (
                            <td key={p.period_id} className="px-3 py-1.5 text-center border-l border-neutral-100">
                              <span className="text-neutral-300 text-[10px]">—</span>
                            </td>
                          );
                          return (
                            <td key={p.period_id} className="px-3 py-1.5 text-center border-l border-neutral-100">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className={`text-[11px] font-semibold tabular-nums ${colors.cumText}`}>{cell.cc_count}</span>
                                <span className="text-[10px] text-neutral-400 tabular-nums">({cell.pct_blended.toFixed(0)}%)</span>
                                <GmChip value={cell.gm_pct} />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}

                {/* Total marketed row */}
                <tr className="bg-neutral-50 border-t-2 border-neutral-200">
                  <td className="px-4 py-2.5 sticky left-0 bg-neutral-50 z-10 border-r border-neutral-200" style={{ minWidth: 180 }}>
                    <p className="text-[12px] font-bold text-neutral-700">Total marketed</p>
                  </td>
                  {periods.map(p => {
                    const ch = channelData[p.period_id];
                    const cell = ch?.all_promo;
                    const pct  = data?.total_cc > 0 && cell ? Math.round(cell.cc_count / data.total_cc * 100) : 0;
                    return (
                      <td key={p.period_id} className="px-3 py-2.5 text-center border-l border-neutral-200">
                        <div className="space-y-0.5">
                          <p className="text-[12px] font-semibold text-neutral-800 tabular-nums">{cell?.cc_count ?? 0}</p>
                          <p className="text-[10px] text-neutral-400 tabular-nums">{pct}% of assortment</p>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 flex-wrap text-[11px] text-neutral-400">
        <span>Cell format: <span className="font-medium text-neutral-600">CC count (% of assortment) · WP GM%</span></span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-emerald-100 border border-emerald-300" />GM ≥ 52%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-amber-100 border border-amber-300" />GM 45–52%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-red-100 border border-red-300" />GM &lt; 45%
        </span>
        <span className="ml-auto">Click an exact-% row to expand department breakdown · ≥ rows show cumulative totals</span>
      </div>
    </div>
  );
}


function RollupSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
