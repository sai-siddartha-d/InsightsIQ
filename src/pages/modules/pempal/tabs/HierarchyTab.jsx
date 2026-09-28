// src/pages/modules/pempal/tabs/HierarchyTab.jsx
import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { pempalApi } from '../../../../services/api';
import { Skeleton } from '../../../../components/ui/Skeleton';
import Card from '../../../../components/ui/Card';
import EmptyState from '../../../../components/ui/EmptyState';
import { effectivePx, VarianceBadge, GmCell, CHANNELS } from '../utils/tabHelpers';

export default function HierarchyTab() {
  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [activeChannel,  setActiveChannel]  = useState('STR');
  const [activePeriod,   setActivePeriod]   = useState(null);
  const [expandedDepts,  setExpandedDepts]  = useState(new Set());
  const [showYoy,        setShowYoy]        = useState(false);
  // classScenarios keyed by `${dept}::${class_name}` → pct_off number
  const [classScenarios, setClassScenarios] = useState({});

  useEffect(() => {
    pempalApi.getHierarchyDetail()
      .then(d => {
        setData(d);
        const firstStd = d.periods.find(p => p.type === 'Standard');
        setActivePeriod(firstStd?.id ?? d.periods[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const visibleRows = useMemo(() => {
    if (!data) return [];
    return data.rows.filter(r => r.channel === activeChannel && r.period_id === activePeriod);
  }, [data, activeChannel, activePeriod]);

  const periods         = data?.periods ?? [];
  const activePeriodObj = periods.find(p => p.id === activePeriod);
  const isStdPeriod     = activePeriodObj?.type === 'Standard';
  const activeScenCount = Object.keys(classScenarios).length;

  const toggleDept = useCallback((dept) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      next.has(dept) ? next.delete(dept) : next.add(dept);
      return next;
    });
  }, []);

  const setClassScenario = useCallback((dept, className, pctOff) => {
    const key = `${dept}::${className}`;
    setClassScenarios(prev => {
      const next = { ...prev };
      if (pctOff === '' || pctOff == null) delete next[key];
      else next[key] = parseFloat(pctOff);
      return next;
    });
  }, []);

  const clearScenarios = useCallback(() => setClassScenarios({}), []);

  const expandAll   = () => setExpandedDepts(new Set(visibleRows.map(r => r.department)));
  const collapseAll = () => setExpandedDepts(new Set());
  const allExpanded = visibleRows.length > 0 && visibleRows.every(r => expandedDepts.has(r.department));

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-2/3" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Filters ── */}
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mr-1">Channel</span>
          {CHANNELS.map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                activeChannel === ch.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {ch.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mr-1">Period</span>
          {periods.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePeriod(p.id)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                activePeriod === p.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {p.label}
              {p.type === 'TOD' && <span className="ml-1 text-[9px] opacity-50">TOD</span>}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {activeScenCount > 0 && (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-100 text-primary-700 text-[11px] font-medium rounded-full">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Scenario: {activeScenCount} class{activeScenCount !== 1 ? 'es' : ''} overridden
              </span>
              <button onClick={clearScenarios} className="text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors">
                Clear all
              </button>
            </>
          )}
          <button
            onClick={() => setShowYoy(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-full font-medium transition-all border ${
              showYoy
                ? 'bg-violet-50 border-violet-200 text-violet-700'
                : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            LY · LLY
          </button>
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      </div>

      {/* ── Context line ── */}
      {activePeriodObj && (
        <div className="text-[11px] text-neutral-400 flex items-center gap-2">
          <span>
            <span className="font-medium text-neutral-600">{activePeriodObj.label}</span>
            {' · '}
            <span className="font-medium text-neutral-600">{CHANNELS.find(c => c.id === activeChannel)?.label}</span>
            {' '}— WP vs vintage benchmarks (MF / LY) · class-level detail
          </span>
          {!isStdPeriod && (
            <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1zm0 9a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 12 16z"/></svg>
              No vintage benchmarks for TOD periods
            </span>
          )}
        </div>
      )}

      {/* ── Main table ── */}
      {visibleRows.length === 0 ? (
        <Card fullscreen>
          <EmptyState
            icon={<HierarchyIcon />}
            title="No entries yet"
            description="Submit entries in Promo Details to see the department hierarchy comparison."
          />
        </Card>
      ) : (
        <Card padding="none" fullscreen>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse" style={{ minWidth: 860 }}>
              <thead>
                <tr className="bg-primary-50 border-b border-primary-100">
                  <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-primary-600 uppercase tracking-wide">
                    Dept / Class
                  </th>
                  <th className="py-2.5 px-2 text-[11px] font-semibold text-primary-600 uppercase tracking-wide text-right" style={{ width: 64 }}>
                    CCs
                  </th>
                  <th className="py-2.5 px-2 text-[11px] font-semibold text-primary-600 uppercase tracking-wide text-right" style={{ width: 64 }}>
                    WOH avg
                  </th>
                  <th className="py-2.5 px-2 text-[11px] font-semibold text-primary-600 uppercase tracking-wide text-center" style={{ width: 100 }}>
                    Coverage
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-neutral-800 uppercase tracking-wide text-right" style={{ width: 80 }}>
                    WP GM%
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-primary-500 uppercase tracking-wide text-right" style={{ width: 100, background: 'rgb(235 246 250 / 0.7)' }}>
                    Scenario
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-primary-600 uppercase tracking-wide text-right" style={{ width: 76 }}>
                    MF GM%
                  </th>
                  <th className="py-2.5 px-2 text-[11px] font-semibold text-primary-600 uppercase tracking-wide text-center" style={{ width: 76 }}>
                    vs MF
                  </th>
                  <th className="py-2.5 px-3 text-[11px] font-semibold text-primary-600 uppercase tracking-wide text-right" style={{ width: 76 }}>
                    LY GM%
                  </th>
                  {showYoy && (
                    <th className="py-2.5 px-3 text-[11px] font-semibold text-violet-500 uppercase tracking-wide text-right" style={{ width: 76 }}>
                      LLY GM%
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {visibleRows.map((row, rowIdx) => {
                  const isExpanded   = expandedDepts.has(row.department);
                  const coveragePct  = row.classes.length > 0
                    ? Math.round((row.entry_count / row.classes.reduce((s, c) => s + c.cc_count, 0)) * 100)
                    : 0;

                  return (
                    <Fragment key={row.department}>
                      {/* ── Dept header row ── */}
                      <tr
                        onClick={() => toggleDept(row.department)}
                        className="border-t border-neutral-200 bg-neutral-50/70 hover:bg-neutral-100/80 cursor-pointer select-none transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <svg
                              width="11" height="11" viewBox="0 0 24 24" fill="none"
                              className={`text-neutral-400 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                            >
                              <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-semibold text-neutral-900">{row.department}</span>
                              <span className="text-[11px] text-neutral-400">{row.classes.length} classes · {row.classes.reduce((s, c) => s + c.cc_count, 0)} CCs</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="text-[11px] text-neutral-500 tabular-nums">{row.classes.reduce((s, c) => s + c.cc_count, 0)}</span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          {row.woh_avg != null ? (
                            <span className={`text-[11px] font-semibold tabular-nums ${row.woh_avg < 2 ? 'text-red-600' : row.woh_avg > 10 ? 'text-amber-600' : 'text-neutral-600'}`}>
                              {row.woh_avg.toFixed(1)}w
                            </span>
                          ) : (
                            <span className="text-neutral-300 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex justify-center items-center gap-1.5">
                            <div className="w-14 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${coveragePct === 100 ? 'bg-emerald-500' : coveragePct > 0 ? 'bg-amber-400' : 'bg-neutral-300'}`}
                                style={{ width: `${coveragePct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-neutral-500 tabular-nums w-6">{coveragePct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right"><GmCell value={row.wp_gm} bold /></td>
                        <td className="py-3 px-3" style={{ background: 'rgb(235 246 250 / 0.4)' }} />
                        <td className="py-3 px-3 text-right"><GmCell value={row.mf_gm} muted /></td>
                        <td className="py-3 px-2 text-center"><VarianceBadge value={row.variance_to_mf} /></td>
                        <td className="py-3 px-3 text-right"><GmCell value={row.ly_gm} muted /></td>
                        {showYoy && <td className="py-3 px-3 text-right"><GmCell value={row.lly_gm} muted /></td>}
                      </tr>

                      {/* ── Class detail rows ── */}
                      {isExpanded && row.classes.map((cls, idx) => {
                        const scenKey   = `${row.department}::${cls.class_name}`;
                        const scenPct   = classScenarios[scenKey];
                        const hasScen   = scenPct != null && !isNaN(scenPct);
                        let scenGmPct   = null;
                        if (hasScen && cls.ticket_avg != null && cls.auc_avg != null) {
                          const eff = effectivePx('PCT_OFF', String(scenPct), cls.ticket_avg);
                          if (eff > 0) scenGmPct = (eff - cls.auc_avg) / eff * 100;
                        }
                        const clsCovPct = cls.cc_count > 0 ? Math.round(cls.entry_count / cls.cc_count * 100) : 0;

                        return (
                          <tr
                            key={cls.class_name}
                            className={`border-t border-neutral-100/80 hover:bg-neutral-50/60 transition-colors ${idx === row.classes.length - 1 ? 'border-b border-neutral-200' : ''}`}
                          >
                            {/* Class name + entry types */}
                            <td className="py-2 pl-10 pr-4">
                              <p className="text-[12px] font-medium text-neutral-800 leading-tight">
                                {cls.class_name}
                              </p>
                              {cls.entry_types.length > 0 && (
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {cls.entry_types.map(et => (
                                    <span key={et} className="text-[9px] px-1 py-0.5 rounded bg-neutral-100 text-neutral-500 font-mono">{et}</span>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* CC count */}
                            <td className="py-2 px-2 text-right">
                              <span className="text-[11px] text-neutral-600 tabular-nums">{cls.cc_count}</span>
                            </td>

                            {/* WOH avg */}
                            <td className="py-2 px-2 text-right">
                              {cls.woh_avg != null ? (
                                <span className={`text-[11px] font-medium tabular-nums ${cls.woh_avg < 2 ? 'text-red-600' : cls.woh_avg > 10 ? 'text-amber-600' : 'text-neutral-500'}`}>
                                  {cls.woh_avg.toFixed(1)}w
                                </span>
                              ) : <span className="text-neutral-300 text-[11px]">—</span>}
                            </td>

                            {/* Coverage mini-bar */}
                            <td className="py-2 px-2 text-center">
                              <div className="flex justify-center items-center gap-1">
                                <div className="w-10 h-1 bg-neutral-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${clsCovPct === 100 ? 'bg-emerald-400' : clsCovPct > 0 ? 'bg-amber-300' : 'bg-neutral-200'}`}
                                    style={{ width: `${clsCovPct}%` }}
                                  />
                                </div>
                                <span className="text-[9px] text-neutral-400 tabular-nums">{cls.entry_count}/{cls.cc_count}</span>
                              </div>
                            </td>

                            {/* WP GM% */}
                            <td className="py-2 px-3 text-right">
                              {cls.wp_gm !== null
                                ? <span className="text-[12px] font-medium text-neutral-700 tabular-nums">{cls.wp_gm.toFixed(1)}%</span>
                                : <span className="text-neutral-300 text-[11px]">—</span>
                              }
                            </td>

                            {/* Scenario input */}
                            <td
                              className="py-2 px-3"
                              style={{ background: 'rgb(235 246 250 / 0.25)' }}
                            >
                              <div className="flex flex-col items-end gap-0.5">
                                <div className="relative flex items-center">
                                  <input
                                    type="number"
                                    min="0" max="90" step="1"
                                    value={hasScen ? scenPct : ''}
                                    onChange={e => setClassScenario(row.department, cls.class_name, e.target.value)}
                                    placeholder="—"
                                    className="w-14 pr-5 pl-1.5 py-0.5 text-xs text-right bg-primary-50 border border-primary-200 rounded text-primary-800 placeholder-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-400 tabular-nums"
                                  />
                                  <span className="absolute right-1.5 text-[9px] text-primary-400 pointer-events-none select-none">%</span>
                                </div>
                                {scenGmPct !== null && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-semibold text-primary-700 tabular-nums">{scenGmPct.toFixed(1)}%</span>
                                    {cls.wp_gm !== null && (
                                      <span className={`text-[9px] font-medium tabular-nums ${scenGmPct >= cls.wp_gm ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {scenGmPct >= cls.wp_gm ? '▲' : '▼'}{Math.abs(scenGmPct - cls.wp_gm).toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* No class-level vintages */}
                            <td className="py-2 px-3 text-right"><span className="text-neutral-200 text-[11px]">—</span></td>
                            <td />
                            <td className="py-2 px-3 text-right"><span className="text-neutral-200 text-[11px]">—</span></td>
                            {showYoy && <td className="py-2 px-3 text-right"><span className="text-neutral-200 text-[11px]">—</span></td>}
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 flex-wrap text-[11px] text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          WP above benchmark
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          WP below benchmark
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-amber-200 inline-block border border-amber-300" />
          Scenario — type a % off value to model an offer change at class level
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
          LLY = sample data
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          WOH <span className="text-red-400 font-medium">&lt;2w</span> = high velocity ·
          WOH <span className="text-amber-500 font-medium">&gt;10w</span> = slow mover
        </span>
      </div>
    </div>
  );
}


function HierarchyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="16" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 7v4M12 7v4M19 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="7" y="11" width="10" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 15v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="7" y="18" width="10" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
