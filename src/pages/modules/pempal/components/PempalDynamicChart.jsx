// src/pages/modules/pempal/components/PempalDynamicChart.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer, ComposedChart,
  Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { effectivePx } from '../utils/tabHelpers';
import Card, { FullscreenFlexDiv, useIsFullscreen } from '../../../../components/ui/Card';
import { PCF_TARGET } from '../../../../utils/constants';
import { CHART_TOOLTIP_STYLE } from '../../../../utils/chartTheme';


// ─── Static config ────────────────────────────────────────────────────────────

const VINTAGES = ['wp', 'mf', 'ly', 'imwp'];

const VINTAGE_CFG = {
  wp:   { label: 'WP',   color: '#5B8DD9', dash: null  },
  mf:   { label: 'MF',   color: '#4A78C4', dash: null  },
  ly:   { label: 'LY',   color: '#B8A5D4', dash: '4 3' },
  imwp: { label: 'IMWP', color: '#7EC8A4', dash: '5 2' },
};

const PRIMARY_METRICS = [
  { id: 'gm',      label: 'GM%',         srcKey: 'gm',   unit: '%',   derived: false },
  { id: 'disc',    label: 'Disc%',        srcKey: 'disc', unit: '%',   derived: false },
  { id: 'aur',     label: 'AUR',          srcKey: 'aur',  unit: '$',   derived: false },
  { id: 'var_pcf', label: 'vs PCF (pts)', srcKey: 'gm',   unit: 'pts', derived: true  },
  { id: 'var_mf',  label: 'vs MF (pts)',  srcKey: 'gm',   unit: 'pts', derived: true  },
];

const SECONDARY_METRICS = [
  { id: 'none',  label: 'None'     },
  { id: 'cc',    label: 'Coverage' },
  { id: 'disc',  label: 'Disc%'    },
  { id: 'aur',   label: 'AUR'      },
];

const X_AXIS_LABELS = {
  period:  'Promo Period',
  dept:    'Department',
  channel: 'Channel',
};

const CHART_TYPES = [
  { id: 'bar',      title: 'Bar chart',  icon: <BarIcon />   },
  { id: 'line',     title: 'Line chart', icon: <LineIcon />  },
  { id: 'bar_line', title: 'Bar + Line', icon: <ComboIcon /> },
];


// ─── Data builder ─────────────────────────────────────────────────────────────

export function buildPempalChartData(entries, products, periods, vintageRows) {
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));
  const pcf = +(PCF_TARGET * 100).toFixed(1);

  function computeGroup(grpEntries) {
    const gms = [], discs = [], aurs = [];
    const covered = new Set();
    grpEntries.forEach(e => {
      const p = productMap[e.product_id];
      if (!p?.ticket) return;
      const eff = effectivePx(e.entry_type, e.offer_value, p.ticket);
      if (eff <= 0) return;
      covered.add(e.product_id);
      aurs.push(eff);
      discs.push((1 - eff / p.ticket) * 100);
      if (p.auc) gms.push((eff - p.auc) / eff * 100);
    });
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    return { gm: avg(gms), disc: avg(discs), aur: avg(aurs), cc: covered.size };
  }

  function vAvg(rows, key) {
    const vals = rows.filter(r => r[key] != null).map(r => r[key]);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  function buildDim(labels, entriesFn, vintagesFn) {
    const dim = { labels, gm: {}, disc: {}, aur: {}, cc: {}, pcf };
    labels.forEach((lbl, i) => {
      const g = computeGroup(entriesFn(lbl));
      if (!dim.gm.wp)   dim.gm.wp   = new Array(labels.length).fill(null);
      if (!dim.disc.wp) dim.disc.wp = new Array(labels.length).fill(null);
      if (!dim.aur.wp)  dim.aur.wp  = new Array(labels.length).fill(null);
      if (!dim.cc.wp)   dim.cc.wp   = new Array(labels.length).fill(null);
      dim.gm.wp[i]   = g.gm;
      dim.disc.wp[i] = g.disc;
      dim.aur.wp[i]  = g.aur;
      dim.cc.wp[i]   = g.cc;

      const vr = vintagesFn(lbl);
      const mf = vAvg(vr, 'mf_gm');
      const ly = vAvg(vr, 'ly_gm');
      if (mf != null) {
        if (!dim.gm.mf) dim.gm.mf = new Array(labels.length).fill(null);
        dim.gm.mf[i] = mf;
      }
      if (ly != null) {
        if (!dim.gm.ly) dim.gm.ly = new Array(labels.length).fill(null);
        dim.gm.ly[i] = ly;
      }
    });
    return dim;
  }

  const periodLabels  = periods.map(p => p.id);
  const deptLabels    = [...new Set(products.map(p => p.department))].sort();
  const channelLabels = [...new Set(entries.map(e => e.channel).filter(Boolean))].sort();
  if (!channelLabels.length) channelLabels.push('STR', 'ONL', 'ONO');

  return {
    period:  buildDim(periodLabels,  pid  => entries.filter(e => e.period_id === pid),                           pid  => vintageRows.filter(r => r.period_id === pid)),
    dept:    buildDim(deptLabels,    dept => entries.filter(e => productMap[e.product_id]?.department === dept), dept => vintageRows.filter(r => r.department === dept)),
    channel: buildDim(channelLabels, ch   => entries.filter(e => e.channel === ch),                             ch   => vintageRows.filter(r => r.channel === ch)),
  };
}


// ─── Component ────────────────────────────────────────────────────────────────

export default function PempalDynamicChart({ data, availableXAxes, availableMetrics }) {
  const allXAxes = Object.keys(data).filter(k =>
    (!availableXAxes || availableXAxes.includes(k)) && data[k]?.labels?.length > 0
  );

  const [xAxis,          setXAxis]          = useState(() => allXAxes[0] ?? 'period');
  const [primaryY,       setPrimaryY]       = useState('gm');
  const [secondaryY,     setSecondaryY]     = useState('none');
  const [chartType,      setChartType]      = useState('bar');
  const [activeVintages, setActiveVintages] = useState(['wp']);

  const dim = data[xAxis] ?? {};

  // ── Available options derived from data ──
  const availPrimary = useMemo(() => {
    return PRIMARY_METRICS
      .filter(m => {
        if (availableMetrics && !availableMetrics.includes(m.id)) return false;
        if (m.derived) {
          if (!dim.gm?.wp?.some(x => x != null)) return false;
          if (m.id === 'var_mf' && !dim.gm?.mf?.some(x => x != null)) return false;
          return true;
        }
        return dim[m.srcKey]?.wp?.some(x => x != null) ?? false;
      })
      .map(m => m.id);
  }, [dim, availableMetrics]);

  const availVintages = useMemo(() => {
    const src = PRIMARY_METRICS.find(m => m.id === primaryY)?.srcKey ?? primaryY;
    return VINTAGES.filter(v => dim[src]?.[v]?.some(x => x != null));
  }, [dim, primaryY]);

  const availSecondary = useMemo(() => {
    return SECONDARY_METRICS
      .filter(m => m.id === 'none' || (m.id !== primaryY && dim[m.id]?.wp?.some(x => x != null)))
      .map(m => m.id);
  }, [dim, primaryY]);

  // ── Re-validate state on dimension change ──
  useEffect(() => {
    if (!availPrimary.includes(primaryY)) setPrimaryY(availPrimary[0] ?? 'gm');
  }, [availPrimary]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!availSecondary.includes(secondaryY)) setSecondaryY('none');
  }, [availSecondary]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const valid = activeVintages.filter(v => availVintages.includes(v));
    setActiveVintages(valid.length > 0 ? valid : availVintages.slice(0, 1));
  }, [availVintages]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleVintage = useCallback((v) => {
    setActiveVintages(prev =>
      prev.includes(v) && prev.length === 1 ? prev
      : prev.includes(v) ? prev.filter(x => x !== v)
      : [...prev, v]
    );
  }, []);

  // ── Chart data points ──
  const chartPoints = useMemo(() => {
    if (!dim.labels) return [];
    const srcKey = PRIMARY_METRICS.find(m => m.id === primaryY)?.srcKey ?? primaryY;
    const pcf = dim.pcf ?? (PCF_TARGET * 100);
    return dim.labels.map((label, i) => {
      const pt = { label };
      activeVintages.forEach(v => {
        const raw = dim[srcKey]?.[v]?.[i];
        if (raw == null) { pt[v] = null; return; }
        if (primaryY === 'var_pcf') {
          pt[v] = +(raw - pcf).toFixed(1);
        } else if (primaryY === 'var_mf') {
          const mf = dim.gm?.mf?.[i];
          pt[v] = mf != null ? +(raw - mf).toFixed(1) : null;
        } else {
          pt[v] = +(primaryY === 'aur' ? raw.toFixed(2) : raw.toFixed(1));
        }
      });
      if (secondaryY !== 'none' && dim[secondaryY]?.wp) {
        const sv = dim[secondaryY].wp[i];
        pt.secondary = sv != null ? +(secondaryY === 'aur' ? sv.toFixed(2) : sv.toFixed(1)) : null;
      }
      return pt;
    });
  }, [dim, primaryY, secondaryY, activeVintages]);

  // ── Derived display helpers ──
  const primaryMeta   = PRIMARY_METRICS.find(m => m.id === primaryY);
  const secondaryMeta = SECONDARY_METRICS.find(m => m.id === secondaryY);
  const showSecondary = secondaryY !== 'none';
  const showPcf       = primaryY === 'gm';
  const pcfValue      = dim.pcf ?? (PCF_TARGET * 100);
  const hasData       = chartPoints.some(p => activeVintages.some(v => p[v] != null));

  const fmtPrimary = useCallback((v) => {
    if (v == null) return '—';
    if (primaryMeta?.unit === '$')   return `$${v}`;
    if (primaryMeta?.unit === 'pts') return `${v > 0 ? '+' : ''}${v} pts`;
    return `${v}%`;
  }, [primaryMeta]);

  const fmtSecondary = useCallback((v) => {
    if (v == null) return '—';
    if (secondaryY === 'aur') return `$${v}`;
    if (secondaryY === 'cc')  return String(Math.round(v));
    return `${v}%`;
  }, [secondaryY]);

  const yLeftFmt  = (v) => primaryMeta?.unit === '$' ? `$${v}` : primaryMeta?.unit === 'pts' ? `${v}` : `${v}%`;
  const yRightFmt = (v) => secondaryY === 'aur' ? `$${v}` : secondaryY === 'cc' ? String(v) : `${v}%`;

  // ── Series renderer ──
  const renderSeries = useCallback((v) => {
    const cfg = VINTAGE_CFG[v];
    if (chartType === 'bar' || (chartType === 'bar_line' && v === 'wp')) {
      return (
        <Bar key={v} dataKey={v} name={cfg.label} yAxisId="y1"
          fill={cfg.color} fillOpacity={0.88} radius={[3, 3, 0, 0]} maxBarSize={52}
        />
      );
    }
    return (
      <Line key={v} type="monotone" dataKey={v} name={cfg.label} yAxisId="y1"
        stroke={cfg.color} strokeWidth={v === 'wp' ? 2.5 : 2}
        strokeDasharray={cfg.dash ?? undefined}
        dot={{ r: 3.5, fill: cfg.color, stroke: 'white', strokeWidth: 1.5 }}
        activeDot={{ r: 5.5, stroke: 'white', strokeWidth: 2 }}
        connectNulls
      />
    );
  }, [chartType]);

  // ── Tooltip ──
  const TooltipContent = useCallback(({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const byKey = Object.fromEntries(payload.map(p => [p.dataKey, p.value]));
    return (
      <div style={{ ...CHART_TOOLTIP_STYLE, minWidth: 170 }} className="rounded-xl px-3.5 py-3 shadow-float pointer-events-none">
        <p className="text-[11px] font-semibold text-neutral-700 mb-2 border-b border-neutral-100 pb-1.5">{label}</p>
        {activeVintages.map(v => {
          const cfg = VINTAGE_CFG[v];
          return (
            <div key={v} className="flex items-center justify-between gap-5 mb-1">
              <span className="flex items-center gap-2 text-[10px] text-neutral-500">
                <svg width="16" height="5" viewBox="0 0 16 5">
                  {cfg.dash
                    ? <line x1="0" y1="2.5" x2="16" y2="2.5" stroke={cfg.color} strokeWidth="2" strokeDasharray={cfg.dash} strokeLinecap="round"/>
                    : <line x1="0" y1="2.5" x2="16" y2="2.5" stroke={cfg.color} strokeWidth="2.5" strokeLinecap="round"/>
                  }
                </svg>
                {cfg.label}
              </span>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: cfg.color }}>
                {fmtPrimary(byKey[v])}
              </span>
            </div>
          );
        })}
        {showSecondary && byKey.secondary != null && (
          <div className="flex items-center justify-between gap-5 mt-1.5 pt-1.5 border-t border-neutral-100">
            <span className="flex items-center gap-2 text-[10px] text-neutral-500">
              <span className="w-2 h-2 rounded-full bg-[#F4876A]" />
              {secondaryMeta?.label}
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-[#F4876A]">
              {fmtSecondary(byKey.secondary)}
            </span>
          </div>
        )}
      </div>
    );
  }, [activeVintages, fmtPrimary, fmtSecondary, showSecondary, secondaryMeta]);

  // ── Dropdown options ──
  const xAxisOptions     = allXAxes.map(k   => ({ value: k,  label: X_AXIS_LABELS[k] ?? k }));
  const primaryOptions   = availPrimary.map(id => ({ value: id, label: PRIMARY_METRICS.find(m => m.id === id)?.label ?? id }));
  const secondaryOptions = availSecondary.map(id => ({ value: id, label: SECONDARY_METRICS.find(m => m.id === id)?.label ?? id }));

  return (
    <Card
      title="Plan Explorer"
      subtitle="Build a custom view — choose X axis, metric, chart type, and vintages"
      fullscreen
    >
      {/* ChartBody is a separate component so useIsFullscreen() runs inside FullscreenContext.Provider */}
      <ChartBody
        xAxis={xAxis}                   setXAxis={setXAxis}
        primaryY={primaryY}             setPrimaryY={setPrimaryY}
        secondaryY={secondaryY}         setSecondaryY={setSecondaryY}
        chartType={chartType}           setChartType={setChartType}
        activeVintages={activeVintages} toggleVintage={toggleVintage}
        availVintages={availVintages}
        chartPoints={chartPoints}
        primaryMeta={primaryMeta}       secondaryMeta={secondaryMeta}
        showSecondary={showSecondary}   showPcf={showPcf}   pcfValue={pcfValue}
        hasData={hasData}
        fmtPrimary={fmtPrimary}         fmtSecondary={fmtSecondary}
        yLeftFmt={yLeftFmt}             yRightFmt={yRightFmt}
        renderSeries={renderSeries}     TooltipContent={TooltipContent}
        xAxisOptions={xAxisOptions}     primaryOptions={primaryOptions}   secondaryOptions={secondaryOptions}
        xAxisLabel={X_AXIS_LABELS[xAxis] ?? xAxis}
      />
    </Card>
  );
}


// ─── ChartBody ─────────────────────────────────────────────────────────────────
// Separate component so useIsFullscreen() correctly reads the portal context.

function ChartBody({
  xAxis, setXAxis, primaryY, setPrimaryY, secondaryY, setSecondaryY,
  chartType, setChartType, activeVintages, toggleVintage,
  availVintages, chartPoints,
  primaryMeta, secondaryMeta, showSecondary, showPcf, pcfValue,
  hasData, fmtPrimary, fmtSecondary, yLeftFmt, yRightFmt,
  renderSeries, TooltipContent,
  xAxisOptions, primaryOptions, secondaryOptions, xAxisLabel,
}) {
  const isFullscreen = useIsFullscreen();

  const tickStyle = {
    fontSize: isFullscreen ? 12 : 11,
    fill: '#3F3F46',
    fontFamily: 'DM Sans, sans-serif',
  };

  return (
    <div className={`flex flex-col${isFullscreen ? ' flex-1 min-h-0' : ''}`}>

      {/* ── Controls panel ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 mb-4 flex-shrink-0 p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex-wrap">
        {/* Dropdowns */}
        <div className="flex items-start gap-3 flex-wrap flex-1 min-w-0">
          <DropSelect label="X Axis"    value={xAxis}      onChange={setXAxis}      options={xAxisOptions} />
          <DropSelect label="Primary Y" value={primaryY}   onChange={setPrimaryY}   options={primaryOptions} />
          <DropSelect label="2nd Y"     value={secondaryY} onChange={setSecondaryY} options={secondaryOptions} />
        </div>

        {/* Divider */}
        <div className="self-stretch w-px bg-neutral-200 mx-0.5 hidden sm:block" />

        {/* Chart type */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider px-0.5">
            Chart Type
          </span>
          <div className="flex bg-white border border-neutral-200 rounded-lg p-0.5 gap-0.5 shadow-xs">
            {CHART_TYPES.map(({ id, icon, title }) => (
              <button key={id} onClick={() => setChartType(id)} title={title}
                className={`h-7 w-9 flex items-center justify-center rounded-md transition-all ${
                  chartType === id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Vintage chips ──────────────────────────────────────────────────── */}
      {availVintages.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-shrink-0 flex-wrap">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mr-0.5">
            Vintage
          </span>

          {availVintages.map(v => {
            const cfg = VINTAGE_CFG[v];
            const on  = activeVintages.includes(v);
            return (
              <button key={v} onClick={() => toggleVintage(v)}
                className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${
                  on
                    ? 'text-white border-transparent'
                    : 'bg-white text-neutral-500 border-neutral-200 hover:border-primary-200 hover:text-neutral-700 hover:bg-primary-50/30'
                }`}
                style={on
                  ? { backgroundColor: cfg.color, boxShadow: `0 0 0 2px ${cfg.color}30, 0 1px 3px rgba(0,0,0,0.1)` }
                  : {}
                }
              >
                <svg width="22" height="6" viewBox="0 0 22 6" className="flex-shrink-0">
                  {cfg.dash
                    ? <line x1="1" y1="3" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray={cfg.dash} strokeLinecap="round"/>
                    : <line x1="1" y1="3" x2="21" y2="3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  }
                </svg>
                {cfg.label}
              </button>
            );
          })}

          {/* PCF reference indicator */}
          {showPcf && (
            <div className="flex items-center gap-1.5 ml-1 pl-3 border-l border-neutral-200">
              <svg width="22" height="6" viewBox="0 0 22 6">
                <line x1="1" y1="3" x2="21" y2="3" stroke="#D4651A" strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round"/>
              </svg>
              <span className="text-[10px] font-medium text-neutral-500">
                PCF {pcfValue.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Chart area ─────────────────────────────────────────────────────── */}
      {!hasData ? (
        <div className={`flex flex-col items-center justify-center gap-2${isFullscreen ? ' flex-1 min-h-[200px]' : ' h-64'}`}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-neutral-300">
            <rect x="3" y="12" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="10" y="7" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            <rect x="17" y="3" width="4" height="18" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <p className="text-[12px] text-neutral-400 text-center max-w-xs leading-relaxed">
            No data for the current selection — submit entries to populate the chart.
          </p>
        </div>
      ) : (
        <FullscreenFlexDiv normalHeight={320}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartPoints}
              margin={{ top: 10, right: showSecondary ? 58 : 14, left: -2, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
              <XAxis
                dataKey="label"
                tick={tickStyle}
                axisLine={false}
                tickLine={false}
                dy={4}
              />
              <YAxis
                yAxisId="y1"
                orientation="left"
                tick={tickStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={yLeftFmt}
                width={54}
              />
              {showSecondary && (
                <YAxis
                  yAxisId="y2"
                  orientation="right"
                  tick={tickStyle}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={yRightFmt}
                  width={54}
                />
              )}
              <Tooltip content={TooltipContent} cursor={{ fill: 'rgba(3,87,117,0.04)' }} />
              {showPcf && (
                <ReferenceLine
                  yAxisId="y1"
                  y={pcfValue}
                  stroke="#D4651A"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  strokeOpacity={0.75}
                  label={{
                    value: `PCF ${pcfValue.toFixed(1)}%`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#92400E',
                    fontWeight: 500,
                    dy: -6,
                    dx: -4,
                  }}
                />
              )}
              {activeVintages.map(v => renderSeries(v))}
              {showSecondary && (
                <Line
                  type="monotone" dataKey="secondary"
                  name={secondaryMeta?.label ?? secondaryY}
                  yAxisId="y2"
                  stroke="#F4876A" strokeWidth={1.5} strokeDasharray="5 3"
                  dot={{ r: 3, fill: '#F4876A', stroke: 'white', strokeWidth: 1.5 }}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </FullscreenFlexDiv>
      )}

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      {hasData && (
        <div className="flex items-center gap-x-5 gap-y-2 mt-3 pt-3 border-t border-neutral-100 flex-wrap flex-shrink-0">
          {activeVintages.map(v => {
            const cfg = VINTAGE_CFG[v];
            return (
              <span key={v} className="flex items-center gap-2 text-[10px] text-neutral-500">
                <svg width="20" height="5" viewBox="0 0 20 5">
                  {cfg.dash
                    ? <line x1="0" y1="2.5" x2="20" y2="2.5" stroke={cfg.color} strokeWidth={2} strokeDasharray={cfg.dash} strokeLinecap="round"/>
                    : <rect x="0" y="0.5" width="20" height="4" rx="1.5" fill={cfg.color} fillOpacity={0.88}/>
                  }
                </svg>
                {cfg.label} — {primaryMeta?.label}
              </span>
            );
          })}
          {showSecondary && (
            <span className="flex items-center gap-2 text-[10px] text-neutral-500">
              <svg width="20" height="5" viewBox="0 0 20 5">
                <line x1="0" y1="2.5" x2="20" y2="2.5" stroke="#F4876A" strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round"/>
              </svg>
              {secondaryMeta?.label} (right axis)
            </span>
          )}
          <span className="ml-auto text-[10px] text-neutral-300 italic">{xAxisLabel}</span>
        </div>
      )}
    </div>
  );
}


// ─── Sub-components ───────────────────────────────────────────────────────────

function DropSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1 flex-shrink-0">
      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider px-0.5">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ minWidth: 120 }}
          className="appearance-none pl-3 pr-8 py-1.5 text-[12px] font-medium bg-white border border-neutral-200 rounded-lg text-neutral-700 hover:border-primary-300 focus:outline-none focus:border-primary-500 cursor-pointer transition-all shadow-xs"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <svg
          className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2.5"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </div>
    </div>
  );
}

function BarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/>
    </svg>
  );
}
function LineIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 20 9 13 14 16 20 6"/>
    </svg>
  );
}
function ComboIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="14" width="4" height="7"/><rect x="10" y="9" width="4" height="12"/>
      <polyline points="17 5 20 5 20 21"/>
    </svg>
  );
}
