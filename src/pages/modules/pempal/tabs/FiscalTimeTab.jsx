// src/pages/modules/pempal/tabs/FiscalTimeTab.jsx
import { useState, useEffect, useMemo } from 'react';
import { pempalApi } from '../../../../services/api';
import { Skeleton } from '../../../../components/ui/Skeleton';
import Card from '../../../../components/ui/Card';
import EmptyState from '../../../../components/ui/EmptyState';


// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(vals) {
  const filtered = vals.filter(v => v !== null && v !== undefined);
  return filtered.length > 0 ? filtered.reduce((a, b) => a + b, 0) / filtered.length : null;
}

function round1(v) { return v !== null && v !== undefined ? parseFloat(v.toFixed(1)) : null; }

// Margin tone: grade WP GM% against the MF benchmark when present, otherwise
// fall back to the PCF floor (52.5%) so EVERY period with a WP value is graded
// — not just the handful that happen to have vintage benchmarks.
const PCF_FLOOR = 52.5;
function marginTone(wp, mf) {
  if (wp === null || wp === undefined) return { tone: 'none', basis: null, delta: null };
  const hasMf = mf !== null && mf !== undefined;
  const d = round1(wp - (hasMf ? mf : PCF_FLOOR));
  return {
    tone:  d >= 0 ? 'good' : d >= -2 ? 'watch' : 'bad',
    basis: hasMf ? 'mf' : 'pcf',
    delta: d,
  };
}

/** Build the dept × period cell data for a given channel selection. */
function buildMatrix(timeline, departments, channels, activeCh) {
  const matrix = {};
  departments.forEach(dept => {
    matrix[dept] = {};
    timeline.forEach(p => {
      if (activeCh === 'ALL') {
        const rows = channels.map(ch => p.dept_breakdown?.[dept]?.[ch]).filter(Boolean);
        const wp = round1(avg(rows.map(r => r.wp_gm)));
        const mf = round1(avg(rows.map(r => r.mf_gm)));
        const ly = round1(avg(rows.map(r => r.ly_gm)));
        const lly = round1(avg(rows.map(r => r.lly_gm)));
        matrix[dept][p.period_id] = {
          wp_gm: wp, mf_gm: mf, ly_gm: ly, lly_gm: lly,
          variance_to_mf: wp !== null && mf !== null ? round1(wp - mf) : null,
        };
      } else {
        matrix[dept][p.period_id] = p.dept_breakdown?.[dept]?.[activeCh] ?? {
          wp_gm: null, mf_gm: null, ly_gm: null, lly_gm: null, variance_to_mf: null,
        };
      }
    });
  });
  return matrix;
}

/** Build the summary row (across all depts) for each period under a given channel selection. */
function buildSummaryRow(timeline, channels, activeCh) {
  const result = {};
  timeline.forEach(p => {
    if (activeCh === 'ALL') {
      const chVals = channels.map(ch => p.channels?.[ch]).filter(Boolean);
      const wp = round1(avg(chVals.map(r => r.wp_gm)));
      const mf = round1(avg(chVals.map(r => r.mf_gm)));
      const ly = round1(avg(chVals.map(r => r.ly_gm)));
      const lly = round1(avg(chVals.map(r => r.lly_gm)));
      result[p.period_id] = {
        wp_gm: wp, mf_gm: mf, ly_gm: ly, lly_gm: lly,
        variance_to_mf: wp !== null && mf !== null ? round1(wp - mf) : null,
      };
    } else {
      const ch = p.channels?.[activeCh] ?? {};
      result[p.period_id] = {
        wp_gm: ch.wp_gm ?? null, mf_gm: ch.mf_gm ?? null,
        ly_gm: ch.ly_gm ?? null, lly_gm: ch.lly_gm ?? null,
        variance_to_mf: ch.variance_to_mf ?? null,
      };
    }
  });
  return result;
}


// ─── Sub-components ───────────────────────────────────────────────────────────

/** Top-level period summary card */
function PeriodCard({ entry, activeCh }) {
  const chData = activeCh === 'ALL' ? null : entry.channels?.[activeCh];
  const wp  = activeCh === 'ALL' ? entry.overall_wp_gm  : chData?.wp_gm  ?? null;
  const mf  = activeCh === 'ALL' ? entry.overall_mf_gm  : chData?.mf_gm  ?? null;
  const isTod = entry.period_type === 'TOD';
  const { tone, basis, delta } = marginTone(wp, mf);

  const borderCls = tone === 'none'  ? 'border-neutral-200'
    : tone === 'good'  ? 'border-emerald-300'
    : tone === 'watch' ? 'border-amber-300'
    : 'border-red-300';

  const dotCls = tone === 'none'  ? 'bg-neutral-300'
    : tone === 'good'  ? 'bg-emerald-500'
    : tone === 'watch' ? 'bg-amber-400'
    : 'bg-red-500';

  const chipCls = tone === 'good'  ? 'bg-emerald-100 text-emerald-700'
    : tone === 'watch' ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700';

  return (
    <div className={`flex-1 min-w-[140px] rounded-xl border-2 ${borderCls} bg-white px-3.5 py-3 space-y-1.5`}>
      <div className="flex items-start justify-between">
        <span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${
          isTod ? 'bg-accent-100 text-accent-700' : 'bg-neutral-100 text-neutral-600'
        }`}>
          {isTod ? 'TOD' : 'Std'}
        </span>
        <span className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${dotCls}`} />
      </div>

      <p className="text-[11px] text-neutral-500 leading-tight">{entry.period_label}</p>

      {wp !== null ? (
        <div>
          <p className="text-[18px] font-bold text-neutral-900 tabular-nums leading-none">
            {wp.toFixed(1)}<span className="text-[11px] font-medium text-neutral-400">%</span>
          </p>
          <p className="text-[10px] text-neutral-400 mt-0.5">WP GM%</p>
        </div>
      ) : (
        <div>
          <p className="text-[18px] font-bold text-neutral-300 leading-none">—</p>
          <p className="text-[10px] text-neutral-300 mt-0.5">No entries</p>
        </div>
      )}

      {delta !== null && (
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums rounded px-1.5 py-0.5 ${chipCls}`}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)} vs {basis === 'mf' ? 'MF' : 'PCF'}
        </span>
      )}
    </div>
  );
}

/** A single cell in the dept × period matrix */
function MatrixCell({ cell, showBenchmarks }) {
  if (!cell || cell.wp_gm === null) {
    return (
      <td className="px-3 py-2.5 text-center border-l border-neutral-100" style={{ minWidth: 120, background: 'rgb(248 250 252)' }}>
        <span className="text-neutral-300 text-[12px]">—</span>
      </td>
    );
  }

  const { tone, basis, delta } = marginTone(cell.wp_gm, cell.mf_gm);

  const bg = tone === 'good'  ? 'rgb(240 253 244)'   // emerald-50
    : tone === 'watch' ? 'rgb(255 251 235)'          // amber-50
    : tone === 'bad'   ? 'rgb(254 242 242)'          // red-50
    : '#f8fafc';

  const wpTextCls = tone === 'good'  ? 'text-emerald-900'
    : tone === 'watch' ? 'text-amber-900'
    : tone === 'bad'   ? 'text-red-900'
    : 'text-neutral-800';

  const chipCls = tone === 'good'  ? 'bg-emerald-200 text-emerald-800'
    : tone === 'watch' ? 'bg-amber-200 text-amber-800'
    : 'bg-red-200 text-red-800';

  return (
    <td className="px-3 py-2.5 text-center border-l border-neutral-100" style={{ minWidth: 120, background: bg }}>
      <div className="space-y-1">
        {/* WP GM% — primary value */}
        <p className={`text-[14px] font-bold tabular-nums ${wpTextCls}`}>
          {cell.wp_gm.toFixed(1)}%
        </p>

        {/* Benchmarks (shown when toggle is on and the period has vintage data) */}
        {showBenchmarks && (cell.mf_gm !== null || cell.ly_gm !== null || cell.lly_gm != null) && (
          <div className="space-y-0.5">
            {cell.mf_gm !== null && (
              <p className="text-[10px] text-neutral-500 tabular-nums">
                MF {cell.mf_gm.toFixed(1)}%
              </p>
            )}
            {cell.ly_gm !== null && (
              <p className="text-[10px] text-emerald-600/80 tabular-nums">
                LY {cell.ly_gm.toFixed(1)}%
              </p>
            )}
            {cell.lly_gm != null && (
              <p className="text-[10px] text-violet-500/80 tabular-nums">
                LLY {cell.lly_gm.toFixed(1)}%
              </p>
            )}
          </div>
        )}

        {/* Variance chip — vs MF when benchmarked, else vs the PCF floor */}
        {delta !== null && (
          <div className="flex items-center justify-center">
            <span className={`text-[10px] font-semibold tabular-nums rounded px-1 py-0.5 ${chipCls}`}>
              {basis === 'mf' ? 'MF' : 'PCF'} {delta > 0 ? '+' : ''}{delta.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </td>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────

const CHANNEL_OPTIONS = [
  { id: 'ALL', label: 'All Channels' },
  { id: 'STR', label: 'Stores' },
  { id: 'ONL', label: 'Online' },
  { id: 'ONO', label: 'Online Only' },
];

export default function FiscalTimeTab() {
  const [data,            setData]            = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [activeChannel,   setActiveChannel]   = useState('ALL');
  const [showBenchmarks,  setShowBenchmarks]  = useState(true);
  const [expandedDepts,   setExpandedDepts]   = useState(new Set());

  useEffect(() => {
    pempalApi.getFiscalTimeline()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const { matrix, summaryRow } = useMemo(() => {
    if (!data) return { matrix: {}, summaryRow: {} };
    return {
      matrix:     buildMatrix(data.timeline, data.departments, data.channels, activeChannel),
      summaryRow: buildSummaryRow(data.timeline, data.channels, activeChannel),
    };
  }, [data, activeChannel]);

  const toggleDept = (dept) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      next.has(dept) ? next.delete(dept) : next.add(dept);
      return next;
    });
  };

  // Collect unique class names per dept from the class_breakdown in timeline data
  const classesByDept = useMemo(() => {
    if (!data) return {};
    const result = {};
    for (const dept of data.departments) {
      const classNames = new Set();
      for (const p of data.timeline) {
        const ch = activeChannel === 'ALL' ? data.channels[0] : activeChannel;
        const cb = p.dept_breakdown?.[dept]?.[ch]?.class_breakdown ?? {};
        Object.keys(cb).forEach(c => classNames.add(c));
      }
      result[dept] = [...classNames].sort();
    }
    return result;
  }, [data, activeChannel]);

  const hasAnyWp = useMemo(() => {
    if (!data) return false;
    return data.timeline.some(p => p.overall_wp_gm !== null || Object.values(p.channels).some(c => c.wp_gm !== null));
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-36 flex-shrink-0" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!hasAnyWp) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarIcon />}
          title="No entries to project"
          description="Submit entries in Promo Details to see the week-by-week fiscal projection."
        />
      </Card>
    );
  }

  const { timeline, departments, channels } = data;

  return (
    <div className="space-y-5">

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide mr-1">Channel</span>
          {CHANNEL_OPTIONS.map(ch => (
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

        <button
          onClick={() => setShowBenchmarks(v => !v)}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1 text-xs rounded-full font-medium transition-all border ${
            showBenchmarks
              ? 'bg-primary-50 border-primary-200 text-primary-700'
              : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
          }`}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          {showBenchmarks ? 'Hide LY · LLY' : 'Show LY · LLY'}
        </button>
      </div>

      {/* ── Period Summary Cards ── */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {timeline.map(entry => (
          <PeriodCard
            key={entry.period_id}
            entry={entry}
            activeCh={activeChannel}
          />
        ))}
      </div>

      {/* ── Dept × Period Matrix Table ── */}
      <Card padding="none" fullscreen>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 600 }}>
            <thead>
              {/* Period type row */}
              <tr className="bg-primary-50 border-b border-primary-100">
                <th className="text-left px-4 py-2 text-[11px] font-semibold text-primary-600 uppercase tracking-wide sticky left-0 bg-primary-50 z-10" style={{ minWidth: 160 }}>
                  Department
                </th>
                {timeline.map(p => (
                  <th
                    key={p.period_id}
                    className="px-3 py-2 text-center border-l border-primary-100"
                    style={{ minWidth: 120 }}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-[12px] font-semibold text-neutral-800">{p.period_id}</span>
                        <span className={`text-[9px] font-semibold uppercase tracking-wide rounded px-1 py-0.5 ${
                          p.period_type === 'TOD'
                            ? 'bg-accent-100 text-accent-700'
                            : 'bg-neutral-200 text-neutral-600'
                        }`}>
                          {p.period_type === 'TOD' ? 'TOD' : 'Std'}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-normal leading-tight">{p.period_label}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {/* Dept rows (expandable to show class sub-rows) */}
              {departments.map(dept => {
                const isExpanded = expandedDepts.has(dept);
                const deptClasses = classesByDept[dept] ?? [];
                return (
                  <>
                    <tr
                      key={dept}
                      onClick={() => deptClasses.length > 0 && toggleDept(dept)}
                      className={`transition-colors hover:brightness-95 bg-neutral-50/50 ${deptClasses.length > 0 ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-4 py-2.5 sticky left-0 bg-neutral-50/80 z-10 border-r border-neutral-100" style={{ minWidth: 160 }}>
                        <div className="flex items-center gap-1.5">
                          {deptClasses.length > 0 && (
                            <svg
                              width="10" height="10" viewBox="0 0 24 24" fill="none"
                              className={`text-neutral-400 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                            >
                              <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                          <p className="text-[12px] font-semibold text-neutral-800 leading-tight">{dept}</p>
                        </div>
                      </td>
                      {timeline.map((p) => (
                        <MatrixCell
                          key={p.period_id}
                          cell={matrix[dept]?.[p.period_id]}
                          showBenchmarks={showBenchmarks}
                        />
                      ))}
                    </tr>
                    {/* Class sub-rows */}
                    {isExpanded && deptClasses.map(cls => (
                      <tr key={`${dept}::${cls}`} className="bg-white hover:bg-neutral-50/40 transition-colors">
                        <td className="pl-9 pr-4 py-2 sticky left-0 bg-white z-10 border-r border-neutral-100" style={{ minWidth: 160 }}>
                          <p className="text-[11px] text-neutral-600 leading-tight">{cls}</p>
                        </td>
                        {timeline.map(p => {
                          const ch = activeChannel === 'ALL' ? (data?.channels?.[0] ?? 'STR') : activeChannel;
                          const wpGm = p.dept_breakdown?.[dept]?.[ch]?.class_breakdown?.[cls] ?? null;
                          return (
                            <td key={p.period_id} className="px-3 py-2 text-center border-l border-neutral-100" style={{ minWidth: 120, background: 'rgb(248 250 252)' }}>
                              {wpGm !== null
                                ? <span className="text-[12px] font-medium text-neutral-700 tabular-nums">{wpGm.toFixed(1)}%</span>
                                : <span className="text-neutral-300 text-[11px]">—</span>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                );
              })}

              {/* Summary / Total row */}
              <tr className="bg-neutral-50 border-t-2 border-neutral-200">
                <td className="px-4 py-2.5 sticky left-0 bg-neutral-50 z-10 border-r border-neutral-200" style={{ minWidth: 160 }}>
                  <p className="text-[12px] font-bold text-neutral-700 leading-tight">
                    {activeChannel === 'ALL' ? 'All Channels' : CHANNEL_OPTIONS.find(c => c.id === activeChannel)?.label}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Rollup</p>
                </td>
                {timeline.map((p) => {
                  const cell = summaryRow[p.period_id];
                  return (
                    <MatrixCell
                      key={p.period_id}
                      cell={cell}
                      showBenchmarks={showBenchmarks}
                    />
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 flex-wrap text-[11px] text-neutral-400">
        <span className="font-medium text-neutral-500">Cell color = vs MF:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-emerald-200 border border-emerald-300" />
          WP ≥ MF
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-amber-200 border border-amber-300" />
          0 to −2 pts
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-red-200 border border-red-300" />
          &lt; −2 pts below MF
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block bg-neutral-100 border border-neutral-200" />
          No WP entries
        </span>
        <span className="ml-auto">
          Cells without an MF benchmark (TOD &amp; newly added periods) are graded vs the PCF floor (52.5%) · LY · LLY are prior-year actuals
        </span>
      </div>
    </div>
  );
}


function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
