// src/pages/modules/pempal/tabs/SummaryTab.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { effectivePx } from '../utils/tabHelpers';
import Card, { FullscreenFlexDiv, useIsFullscreen } from '../../../../components/ui/Card';
import StatCard, { InfoTooltip } from '../../../../components/ui/StatCard';
import Badge from '../../../../components/ui/Badge';
import EmptyState from '../../../../components/ui/EmptyState';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { pempalApi } from '../../../../services/api';
import { useWebSocket } from '../../../../hooks/useWebSocket';
import { useAuth } from '../../../../hooks/useAuth';
import { TYPE_COLORS, TYPE_LABELS, CHART_COLORS, CHART_AXIS_STYLE, CHART_TOOLTIP_STYLE, CHART_TOOLTIP_ITEM_STYLE, CHART_TOOLTIP_LABEL_STYLE } from '../../../../utils/chartTheme';
import ExportPptModal from '../../../../components/ui/ExportPptModal';
import { exportPempalPpt } from '../../../../utils/exportPpt';
import { PCF_TARGET } from '../../../../utils/constants';
import PempalDynamicChart, { buildPempalChartData } from '../components/PempalDynamicChart';


const CHANNEL_COLORS = {
  STR: '#5B8DD9',
  ONL: '#7EC8A4',
  ONO: '#4A78C4',
};

const PERIOD_DISC_COLORS = ['#C8DDF5', '#70A0DC', '#5B8DD9', '#3B74C8', '#1B4F9C'];
const DEPT_DISC_COLORS   = ['#5B8DD9', '#4A78C4', '#7EC8A4', '#B8A5D4', '#6982C4'];

const YOY_STAT_DELTAS = {
  'Plan Fill Rate':     [
    { label: 'vs LY',  change: '+8%',    trend: 'up'   },
    { label: 'vs LLY', change: '+15%',   trend: 'up'   },
  ],
  'Working Plan GM%':   [
    { label: 'vs LY',  change: '+1.2pp', trend: 'up'   },
    { label: 'vs LLY', change: '-0.8pp', trend: 'down' },
  ],
  'Avg Discount Depth': [
    { label: 'vs LY',  change: '-1.5pp', trend: 'up'   },
    { label: 'vs LLY', change: '+2.1pp', trend: 'down' },
  ],
  'Active Periods':     [
    { label: 'vs LY',  change: '+0',     trend: 'flat' },
    { label: 'vs LLY', change: '+1',     trend: 'up'   },
  ],
};


export default function SummaryTab() {
  const [metrics, setMetrics]         = useState([]);
  const [entries, setEntries]         = useState([]);
  const [products, setProducts]       = useState([]);
  const [periods, setPeriods]         = useState([]);
  const [channelCoverage, setChannelCoverage] = useState(null);
  const [vintageRows, setVintageRows] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [controlData, setControlData] = useState(null);
  const [auditFlags, setAuditFlags]   = useState([]);
  const [tick, setTick]               = useState(0);
  const { user } = useAuth();

  // Discount depth grouping toggle
  const [discGroupBy, setDiscGroupBy] = useState('period');

  // Lifted filter state — shared with VintageVarianceCard and the export button
  const [activeChannel,     setActiveChannel]     = useState('STR');
  const [activePeriodId,    setActivePeriodId]    = useState('');
  const [activePeriodLabel, setActivePeriodLabel] = useState('');

  // PPT export modal
  const [showExportModal, setShowExportModal] = useState(false);

  // Chart refs for PPT screenshots
  const offerMixRef     = useRef(null);
  const deptCoverageRef = useRef(null);
  const periodDistRef   = useRef(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([
      pempalApi.getSummary(),
      pempalApi.getEntries(),
      pempalApi.getProducts(),
      pempalApi.getPeriods(),
      pempalApi.getChannelCoverage(),
      pempalApi.getVintageSummary(),
      pempalApi.getControlDashboard(),
      pempalApi.getAudit(),
    ])
      .then(([m, e, p, pe, cc, vs, cd, af]) => {
        setMetrics(m); setEntries(e); setProducts(p); setPeriods(pe);
        setChannelCoverage(cc); setVintageRows(vs); setControlData(cd);
        setAuditFlags(af ?? []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh relative timestamps every 30 s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const loadOnEntriesChange = useCallback(() => {
    Promise.all([
      pempalApi.getSummary(),
      pempalApi.getEntries(),
      pempalApi.getChannelCoverage(),
      pempalApi.getVintageSummary(),
      pempalApi.getControlDashboard(),
      pempalApi.getAudit(),
    ]).then(([m, e, cc, vs, cd, af]) => {
      setMetrics(m); setEntries(e); setChannelCoverage(cc); setVintageRows(vs); setControlData(cd);
      setAuditFlags(af ?? []);
    }).catch(err => setError(err.message));
  }, []);

  const loadOnPeriodsChange = useCallback(() => {
    Promise.all([
      pempalApi.getPeriods(),
      pempalApi.getSummary(),
      pempalApi.getControlDashboard(),
    ]).then(([pe, m, cd]) => {
      setPeriods(pe); setMetrics(m); setControlData(cd);
    }).catch(err => setError(err.message));
  }, []);

  useWebSocket({
    entries_changed: loadOnEntriesChange,
    periods_changed: loadOnPeriodsChange,
  });

  // Existing derived data
  const offerMixData = useMemo(() => {
    const counts = {};
    entries.forEach(e => { counts[e.entry_type] = (counts[e.entry_type] || 0) + 1; });
    return Object.entries(counts).map(([type, count]) => ({
      name: TYPE_LABELS[type] || type, value: count, type,
    }));
  }, [entries]);

  const periodData = useMemo(() => {
    return periods.map(p => ({
      period: p.id, label: p.label, type: p.type,
      entries: entries.filter(e => e.period_id === p.id).length,
    }));
  }, [periods, entries]);

  const coveredProductIds = useMemo(
    () => new Set(entries.map(e => e.product_id)),
    [entries],
  );

  const gmHealth = useMemo(() => {
    if (!controlData) return null;
    let onTarget = 0, watching = 0, offTarget = 0, noData = 0;
    controlData.dept_gm_grid.forEach(row =>
      row.channels.forEach(cell => {
        if (cell.wp_gm === null)          noData++;
        else if (cell.variance >= 0)      onTarget++;
        else if (cell.variance >= -2.0)   watching++;
        else                              offTarget++;
      })
    );
    return { onTarget, watching, offTarget, noData };
  }, [controlData]);

  const departmentData = useMemo(() => {
    const deptMap = {};
    products.forEach(p => {
      if (!deptMap[p.department]) deptMap[p.department] = { total: 0, covered: 0 };
      deptMap[p.department].total += 1;
      if (coveredProductIds.has(p.id)) deptMap[p.department].covered += 1;
    });
    return Object.entries(deptMap).map(([dept, { total, covered }]) => ({
      department: dept, coverage: Math.round((covered / total) * 100), covered, total,
    })).sort((a, b) => b.coverage - a.coverage);
  }, [products, coveredProductIds]);

  const discountBucketsGrouped = useMemo(() => {
    const BUCKET_DEFS = [
      { label: '0–15%',  min: 0,  max: 15  },
      { label: '15–25%', min: 15, max: 25  },
      { label: '25–35%', min: 25, max: 35  },
      { label: '35–50%', min: 35, max: 50  },
      { label: '50%+',   min: 50, max: 101 },
    ];
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const catSet = new Set();
    entries.forEach(e => {
      const prod = productMap[e.product_id];
      if (!prod) return;
      const cat = discGroupBy === 'dept' ? prod.department
                : discGroupBy === 'channel' ? e.channel
                : e.period_id;
      if (cat) catSet.add(cat);
    });
    const categories = [...catSet].sort();

    const data = BUCKET_DEFS.map(b => {
      const row = { label: b.label };
      categories.forEach(c => (row[c] = 0));
      return row;
    });

    entries.forEach(e => {
      const prod = productMap[e.product_id];
      if (!prod?.ticket) return;
      const eff  = effectivePx(e.entry_type, e.offer_value, prod.ticket);
      const disc = (1 - eff / prod.ticket) * 100;
      const idx  = BUCKET_DEFS.findIndex(b => disc >= b.min && disc < b.max);
      if (idx === -1) return;
      const cat = discGroupBy === 'dept' ? prod.department
                : discGroupBy === 'channel' ? e.channel
                : e.period_id;
      if (cat && data[idx][cat] !== undefined) data[idx][cat]++;
    });

    return { data, categories };
  }, [entries, products, discGroupBy]);

  const avg = (arr) => arr.length ? +(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : null;

  const wpVsPcfByPeriod = useMemo(() => {
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));
    const gmByPeriod = {};
    entries.forEach(e => {
      const prod = productMap[e.product_id];
      if (!prod?.ticket || !prod?.auc) return;
      const eff = effectivePx(e.entry_type, e.offer_value, prod.ticket);
      if (eff <= 0) return;
      const gm = (eff - prod.auc) / eff * 100;
      if (!gmByPeriod[e.period_id]) gmByPeriod[e.period_id] = [];
      gmByPeriod[e.period_id].push(gm);
    });
    return periods.map(p => ({
      label: p.id,
      wp_gm: gmByPeriod[p.id]?.length ? avg(gmByPeriod[p.id]) : null,
      pcf:   +(PCF_TARGET * 100).toFixed(1),
    }));
  }, [entries, products, periods]);

  const wpVsMfByChannel = useMemo(() => {
    const map = {};
    vintageRows.forEach(r => {
      if (!map[r.channel]) map[r.channel] = { wp: [], mf: [] };
      if (r.wp_gm != null) map[r.channel].wp.push(r.wp_gm);
      if (r.mf_gm != null) map[r.channel].mf.push(r.mf_gm);
    });
    return ['STR', 'ONL', 'ONO'].map(ch => ({
      label: ch,
      wp_gm: avg(map[ch]?.wp ?? []),
      mf_gm: avg(map[ch]?.mf ?? []),
    }));
  }, [vintageRows]);

  const wpVsMfByDept = useMemo(() => {
    const map = {};
    vintageRows.forEach(r => {
      if (!map[r.department]) map[r.department] = { wp: [], mf: [] };
      if (r.wp_gm != null) map[r.department].wp.push(r.wp_gm);
      if (r.mf_gm != null) map[r.department].mf.push(r.mf_gm);
    });
    return Object.entries(map).map(([dept, d]) => ({
      label: dept.replace('Womens ', ''),
      wp_gm: avg(d.wp),
      mf_gm: avg(d.mf),
    }));
  }, [vintageRows]);

  const yoyPeriodData = useMemo(() => {
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));
    const wpByPeriod = {};
    entries.forEach(e => {
      const prod = productMap[e.product_id];
      if (!prod?.ticket || !prod?.auc) return;
      const eff = effectivePx(e.entry_type, e.offer_value, prod.ticket);
      if (eff <= 0) return;
      const gm = (eff - prod.auc) / eff * 100;
      if (!wpByPeriod[e.period_id]) wpByPeriod[e.period_id] = [];
      wpByPeriod[e.period_id].push(gm);
    });
    const lyByPeriod = {}, llyByPeriod = {};
    vintageRows.forEach(r => {
      if (r.ly_gm  != null) (lyByPeriod[r.period_id]  ??= []).push(r.ly_gm);
      if (r.lly_gm != null) (llyByPeriod[r.period_id] ??= []).push(r.lly_gm);
    });
    return periods.map((p) => ({
      label:  p.id,
      wp_gm:  wpByPeriod[p.id]?.length  ? avg(wpByPeriod[p.id])  : null,
      ly_gm:  lyByPeriod[p.id]?.length  ? avg(lyByPeriod[p.id])  : null,
      lly_gm: llyByPeriod[p.id]?.length ? avg(llyByPeriod[p.id]) : null,
    }));
  }, [entries, products, periods, vintageRows]);

  const yoyDeptData = useMemo(() => {
    const deptWp = {}, deptLy = {}, deptLly = {};
    vintageRows.forEach(r => {
      if (!deptWp[r.department]) { deptWp[r.department] = []; deptLy[r.department] = []; deptLly[r.department] = []; }
      if (r.wp_gm  != null) deptWp[r.department].push(r.wp_gm);
      if (r.ly_gm  != null) deptLy[r.department].push(r.ly_gm);
      if (r.lly_gm != null) deptLly[r.department].push(r.lly_gm);
    });
    return Object.keys(deptWp).map((dept) => {
      const wp  = avg(deptWp[dept]);
      const ly  = deptLy[dept]?.length  ? avg(deptLy[dept])  : null;
      const lly = deptLly[dept]?.length ? avg(deptLly[dept]) : null;
      return {
        dept,
        wp_gm:  wp,
        ly_gm:  ly,
        lly_gm: lly,
        vs_ly:  (wp != null && ly  != null) ? +(wp - ly ).toFixed(1) : null,
        vs_lly: (wp != null && lly != null) ? +(wp - lly).toFixed(1) : null,
      };
    });
  }, [vintageRows]);

  const pempalChartData = useMemo(() =>
    buildPempalChartData(entries, products, periods, vintageRows),
  [entries, products, periods, vintageRows]);

  const heatmapFromControl = useMemo(() => {
    if (!controlData?.heatmap || !controlData?.periods) return null;
    return {
      matrix: controlData.heatmap.map(row => ({
        channel: row.channel,
        cells: row.cells.map(c => ({ ...c, coverage: c.pct })),
      })),
      periods: controlData.periods,
    };
  }, [controlData]);

  const STAT_TOOLTIPS = {
    'Plan Fill Rate':     'Total submitted entries as a share of all possible planning slots across every period and channel. Formula: total entries ÷ (products × all periods × 3 channels). Can exceed 100% if a slot has more than one entry.',
    'Working Plan GM%':   'Average gross margin across all submitted offers, based on effective selling price. Formula: avg((effective price − AUC) ÷ effective price).',
    'Avg Discount Depth': 'Average discount off ticket price across all submitted offers. Formula: avg(1 − effective price ÷ ticket price).',
    'Active Periods':     'Number of planning periods that have at least one submitted entry.',
  };

  if (loading) return <SummarySkeleton />;

  if (error) return (
    <div className="flex items-center gap-3 px-4 py-3 bg-danger-50 border border-danger-500/30 text-danger-700 rounded-lg text-sm">
      <span className="font-semibold">Failed to load summary:</span> {error}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ── Section 1: Plan Performance ────────────────────────────── */}
      <SectionDivider
        title="Plan Performance"
        subtitle="Key metrics, GM% health, and audit status for the current planning cycle"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(m => (
          <StatCard
            key={m.label}
            label={m.label}
            value={m.value}
            tooltip={STAT_TOOLTIPS[m.label]}
            comparisons={YOY_STAT_DELTAS[m.label]}
          />
        ))}
      </div>

      {/* Audit snapshot */}
      {auditFlags.length > 0 && <AuditSnapshot flags={auditFlags} />}

      {/* Cycle status strip — Coverage · GM Health · Last Activity */}
      {controlData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Coverage ring */}
          <div className={`rounded-xl border px-5 py-4 flex items-center gap-4 ${
            controlData.coverage_pct === 100 ? 'bg-emerald-50 border-emerald-200' :
            controlData.coverage_pct  >= 50  ? 'bg-amber-50  border-amber-200'   :
                                               'bg-red-50    border-red-200'
          }`}>
            <CoverageRing pct={controlData.coverage_pct} />
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-[11px] uppercase tracking-wide font-medium text-primary-500">
                  Std Period Fill
                </p>
                <InfoTooltip text="Unique product-channel-period combinations filled for standard (non-TOD) periods. Deduplicates multiple entries in the same slot. Formula: unique filled slots ÷ (products × standard periods × 3 channels)." />
              </div>
              <p className="text-[15px] font-bold text-primary-800 tabular-nums">
                {controlData.filled_slots} / {controlData.total_slots}
              </p>
              <p className="text-[11px] text-primary-400">std slots filled</p>
            </div>
          </div>

          {/* GM Health */}
          {gmHealth && (
            <div className={`rounded-xl border px-5 py-4 ${
              gmHealth.offTarget > 0 ? 'bg-red-50 border-red-200' :
              gmHealth.watching  > 0 ? 'bg-amber-50 border-amber-200' :
                                       'bg-emerald-50 border-emerald-200'
            }`}>
              <p className="text-[11px] uppercase tracking-wide font-medium text-primary-500 mb-1">
                GM Health
              </p>
              <p className={`text-2xl font-bold tabular-nums ${
                gmHealth.offTarget > 0 ? 'text-red-700' :
                gmHealth.watching  > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {gmHealth.onTarget}
                <span className="text-[14px] font-medium text-neutral-400">
                  {' '}/ {gmHealth.onTarget + gmHealth.watching + gmHealth.offTarget}
                </span>
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {gmHealth.offTarget > 0
                  ? `${gmHealth.offTarget} off target · ${gmHealth.watching} watching`
                  : gmHealth.watching > 0
                  ? `${gmHealth.watching} to watch`
                  : 'All dept × channels on target'}
              </p>
            </div>
          )}

          {/* Last Activity */}
          <div className="relative rounded-xl border border-neutral-200 bg-white px-5 py-4 overflow-hidden">
            <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-primary-500 opacity-70" />
            <p className="text-[11px] uppercase tracking-wide font-medium text-primary-500 mb-1">
              Last Activity
            </p>
            <p key={tick} className="text-2xl font-bold text-neutral-900">
              {relativeTime(controlData.last_entry_at)}
            </p>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {controlData.last_entry_at
                ? new Date(controlData.last_entry_at).toLocaleString(undefined, {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })
                : 'No entries yet'}
            </p>
          </div>
        </div>
      )}

      {/* Plan status go/no-go banner */}
      {vintageRows.length > 0 && (
        <PlanStatusBanner vintageRows={vintageRows} />
      )}

      {/* Dept GM% health grid (from Control) */}
      {controlData && controlData.dept_gm_grid.length > 0 && (
        <Card
          title="Department GM% Health"
          subtitle="WP GM% vs MF target, averaged across all standard periods · On Target ≥ MF · Watch 0 to −2 pts · Off Target < −2 pts"
        >
          <DeptGmGrid deptGmGrid={controlData.dept_gm_grid} channels={controlData.channels} />
          <div className="flex items-center gap-5 mt-4 flex-wrap text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              On Target (WP ≥ MF)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              Watch (0 to −2 pts)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              Off Target (&lt; −2 pts)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 inline-block" />
              No WP entries
            </span>
          </div>
        </Card>
      )}

      {/* Plan vs Target — vintage GM% comparison */}
      {vintageRows.length > 0 && (
        <VintageVarianceCard
          rows={vintageRows}
          periods={periods}
          activeChannel={activeChannel}
          setActiveChannel={setActiveChannel}
          activePeriodId={activePeriodId}
          setActivePeriodId={setActivePeriodId}
          setActivePeriodLabel={setActivePeriodLabel}
        />
      )}


      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Offer mix" subtitle="Distribution of entry types across all submissions" fullscreen>
          {offerMixData.length === 0 ? (
            <EmptyState title="No entries yet" description="The offer mix will appear after entries are submitted." />
          ) : (
            <OfferMixContent data={offerMixData} chartRef={offerMixRef} />
          )}
        </Card>

        <Card
          title="Discount depth distribution"
          subtitle={`Entries in each discount bracket by ${discGroupBy === 'period' ? 'planning period' : discGroupBy === 'dept' ? 'department' : 'channel'}, based on effective selling price`}
          fullscreen
          action={
            <div className="flex bg-neutral-100 rounded-md p-0.5">
              {[['period', 'Period'], ['dept', 'Dept'], ['channel', 'Channel']].map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setDiscGroupBy(val)}
                  className={`h-6 px-2.5 text-[11px] font-medium rounded transition-all ${
                    discGroupBy === val ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          }
        >
          {entries.length === 0 ? (
            <EmptyState title="No entries yet" description="Discount distribution will appear after entries are submitted." />
          ) : (
            <FullscreenFlexDiv normalHeight={256} chartRef={periodDistRef}>
              <DiscountDepthChart
                data={discountBucketsGrouped.data}
                categories={discountBucketsGrouped.categories}
                groupBy={discGroupBy}
              />
            </FullscreenFlexDiv>
          )}
        </Card>
      </div>

      {/* GM% variance — 3 separate cards */}
      {vintageRows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Card title="WP vs PCF · By Period" subtitle="Avg WP GM% vs PCF target across all planning periods" fullscreen>
            <MiniAreaChart
              chartId="period"
              data={wpVsPcfByPeriod}
              xKey="label" yKey1="wp_gm" yKey2="pcf"
              label2="PCF Target"
            />
          </Card>
          <Card title="WP vs MF · By Channel" subtitle="Avg WP GM% vs monthly forecast target across channels" fullscreen>
            <MiniAreaChart
              chartId="channel"
              data={wpVsMfByChannel}
              xKey="label" yKey1="wp_gm" yKey2="mf_gm"
              label2="MF Target"
            />
          </Card>
          <Card title="WP vs MF · By Department" subtitle="Avg WP GM% vs monthly forecast target across departments" fullscreen>
            <MiniAreaChart
              chartId="dept"
              data={wpVsMfByDept}
              xKey="label" yKey1="wp_gm" yKey2="mf_gm"
              label2="MF Target"
            />
          </Card>
        </div>
      )}

      {/* ── Section: Year-Over-Year Comparison ────────────────────────── */}
      {vintageRows.length > 0 && (
        <>
          <SectionDivider
            title="Year-Over-Year Comparison"
            subtitle="Working Plan GM% benchmarked against Last Year (LY) and Last Last Year (LLY)"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="GM% Trend · By Period" subtitle="Avg WP vs LY vs LLY gross margin across planning periods" fullscreen>
              <YoyGmTrendChart data={yoyPeriodData} />
            </Card>
            <YoyComparisonCard data={yoyDeptData} />
          </div>
        </>
      )}

      {/* Channel × period heatmap */}
      <Card
        title="Channel × period heatmap"
        subtitle="Coverage of each (channel, period) cell — darker teal is higher coverage"
        fullscreen
      >
        {!heatmapFromControl || heatmapFromControl.matrix.length === 0 ? (
          <EmptyState title="No data" description="Heatmap will appear once products and periods exist." />
        ) : (
          <ChannelPeriodHeatmap data={heatmapFromControl} totalProducts={controlData?.product_count ?? 0} />
        )}
      </Card>

      {/* Department coverage */}
      <Card title="Department coverage" subtitle="Percentage of products in each department that have at least one entry" fullscreen>
        {departmentData.length === 0 ? (
          <EmptyState title="No data" description="Department coverage will appear after entries are submitted." />
        ) : (
          <FullscreenFlexDiv normalHeight={Math.max(180, departmentData.length * 44)} chartRef={deptCoverageRef}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={departmentData}
                layout="vertical"
                margin={{ top: 0, right: 30, left: 100, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={CHART_AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="department" tick={{ ...CHART_AXIS_STYLE, fontSize: 12 }} axisLine={false} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(228, 228, 231, 0.3)' }}
                  formatter={(value, name, props) => [`${value}% (${props.payload.covered}/${props.payload.total})`, 'Coverage']}
                />
                <Bar dataKey="coverage" radius={[0, 4, 4, 0]}>
                  {departmentData.map((entry, index) => (
                    <Cell
                      key={entry.department}
                      fill={['#5B8DD9', '#4A78C4', '#7EC8A4', '#B8A5D4', '#6982C4'][index % 5]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </FullscreenFlexDiv>
        )}
      </Card>

      {/* ── Section 2: Plan Explorer ────────────────────────────────── */}
      <SectionDivider
        title="Plan Explorer"
        subtitle="Configurable chart — pick X axis, metric, chart type, and vintages to explore the plan from any angle"
      />

      <PempalDynamicChart data={pempalChartData} />

      {/* PPT Export modal */}
      {showExportModal && (
        <ExportPptModal
          onClose={() => setShowExportModal(false)}
          onExport={(opts) => exportPempalPpt({ ...opts, user, activeChannel, activePeriodId, activePeriodLabel, offerMixRef, deptCoverageRef, periodDistRef })}
        />
      )}
    </div>
  );
}


// ─── Discount depth distribution ─────────────────────────────────────
function discCatColor(cat, idx, groupBy) {
  if (groupBy === 'channel') return CHANNEL_COLORS[cat] ?? '#A1A1AA';
  if (groupBy === 'dept')    return DEPT_DISC_COLORS[idx % DEPT_DISC_COLORS.length];
  return PERIOD_DISC_COLORS[idx % PERIOD_DISC_COLORS.length];
}

function DiscountDepthChart({ data, categories, groupBy }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
        <XAxis dataKey="label" tick={CHART_AXIS_STYLE} axisLine={false} tickLine={false} />
        <YAxis tick={CHART_AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          cursor={{ fill: 'rgba(3,87,117,0.06)' }}
          formatter={(value, name) => [value, name]}
          itemStyle={CHART_TOOLTIP_ITEM_STYLE}
          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
        />
        <Legend
          iconSize={8} iconType="circle"
          wrapperStyle={{ paddingTop: 10 }}
          formatter={(v) => <span style={{ fontSize: 10, color: '#71717A', fontFamily: 'DM Sans, sans-serif' }}>{v}</span>}
        />
        {categories.map((cat, i) => (
          <Bar
            key={cat}
            dataKey={cat}
            stackId="a"
            fill={discCatColor(cat, i, groupBy)}
            radius={i === categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}


// ─── GM% variance row — 3 mini area charts ───────────────────────────
function MiniAreaChart({ chartId, data, xKey, yKey1, yKey2, label2 }) {
  const isFullscreen = useIsFullscreen();
  const hasData = data.some(d => d[yKey1] != null);
  return (
    <div className={isFullscreen ? 'flex flex-col h-full' : ''}>
      {!hasData ? (
        <div className={`${isFullscreen ? 'flex-1 min-h-0' : 'h-40'} flex items-center justify-center text-[11px] text-neutral-400`}>
          No WP data yet
        </div>
      ) : (
        <div className={isFullscreen ? 'flex-1 min-h-0' : 'h-40'}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id={`gwp-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#5B8DD9" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#5B8DD9" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id={`gbm-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="10%" stopColor="#4A78C4" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#4A78C4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 10, fill: '#71717A', fontFamily: 'DM Sans, sans-serif' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#71717A', fontFamily: 'DM Sans, sans-serif' }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v}%`}
                width={34}
                domain={([min, max]) => [Math.max(0, Math.floor(min) - 2), Math.ceil(max) + 2]}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                formatter={(val, key) => [val != null ? `${val}%` : '—', key === yKey1 ? 'WP GM%' : label2]}
              />
              <Area type="monotone" dataKey={yKey1}
                stroke="#5B8DD9" strokeWidth={2}
                fill={`url(#gwp-${chartId})`}
                dot={{ r: 3, fill: '#5B8DD9', stroke: 'white', strokeWidth: 1.5 }}
                activeDot={{ r: 5, stroke: 'white', strokeWidth: 1.5 }}
                connectNulls
              />
              <Area type="monotone" dataKey={yKey2}
                stroke="#4A78C4" strokeWidth={1.5} strokeDasharray="4 3"
                fill={`url(#gbm-${chartId})`}
                dot={{ r: 3, fill: '#4A78C4', stroke: 'white', strokeWidth: 1.5 }}
                activeDot={{ r: 5, stroke: 'white', strokeWidth: 1.5 }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Per-card legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-100 flex-shrink-0">
        <span className="flex items-center gap-1.5 text-[10px] text-neutral-500">
          <svg width="16" height="4" className="flex-shrink-0">
            <line x1="0" y1="2" x2="16" y2="2" stroke="#5B8DD9" strokeWidth="2" strokeLinecap="round" />
          </svg>
          WP GM%
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-neutral-500">
          <svg width="16" height="4" className="flex-shrink-0">
            <line x1="0" y1="2" x2="16" y2="2" stroke="#4A78C4" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
          </svg>
          {label2}
        </span>
      </div>
    </div>
  );
}


// ─── Channel coverage chart ──────────────────────────────────────────
function ChannelCoverageChart({ data }) {
  const chartData = data.channels.map(c => ({
    channel:  c.channel,
    coverage: c.coverage,
    filled:   c.filled,
    total:    c.total,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {data.channels.map(c => (
          <div key={c.channel} className="text-center p-3 bg-neutral-50 rounded-lg border border-neutral-200/60">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[c.channel] }} />
              <span className="text-[11px] font-mono font-semibold text-neutral-700">{c.channel}</span>
            </div>
            <p className="text-2xl font-bold text-neutral-900 tabular-nums">{c.coverage}%</p>
            <p className="text-[11px] text-neutral-500 mt-0.5 tabular-nums">{c.filled} / {c.total} slots</p>
          </div>
        ))}
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
            <XAxis dataKey="channel" tick={CHART_AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 100]} tick={CHART_AXIS_STYLE}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              cursor={{ fill: 'rgba(228, 228, 231, 0.3)' }}
              formatter={(value, name, props) => [
                `${value}% (${props.payload.filled}/${props.payload.total})`,
                'Coverage',
              ]}
            />
            <Bar dataKey="coverage" radius={[4, 4, 0, 0]}>
              {chartData.map((d) => (
                <Cell key={d.channel} fill={CHANNEL_COLORS[d.channel] || CHART_COLORS.neutral} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


// ─── Channel × period heatmap ────────────────────────────────────────
function ChannelPeriodHeatmap({ data, totalProducts }) {
  const cellColor = (coverage) => {
    if (coverage >= 75) return 'bg-success-500';
    if (coverage >= 50) return 'bg-success-500/70';
    if (coverage >= 25) return 'bg-warning-500/70';
    if (coverage >   0) return 'bg-danger-500/60';
    return 'bg-neutral-200';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-[10px] font-semibold text-neutral-600 uppercase tracking-wider w-24">
              Channel
            </th>
            {data.periods.map(p => (
              <th key={p.id} className="px-2 py-2 text-center min-w-[110px]">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1">
                    {p.type === 'TOD'
                      ? <Badge variant="accent" size="xs">TOD</Badge>
                      : <Badge variant="default" size="xs">Std</Badge>}
                    <span className="text-[11px] font-semibold text-neutral-700">{p.id}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-normal normal-case">{p.label}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.matrix.map(row => (
            <tr key={row.channel}>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[row.channel] }} />
                  <span className="text-[12px] font-mono font-semibold text-neutral-700">{row.channel}</span>
                </div>
              </td>
              {row.cells.map(cell => (
                <td key={cell.period_id} className="px-1 py-1">
                  <div
                    className={`relative h-12 rounded-md ${cellColor(cell.coverage)} flex items-center justify-center text-white text-xs font-semibold transition-all hover:scale-105 cursor-default`}
                    title={`${row.channel} × ${cell.period_label}: ${cell.count} / ${cell.total} (${cell.coverage}%)`}
                  >
                    <div className="text-center">
                      <p className="tabular-nums leading-none">{cell.coverage}%</p>
                      <p className="text-[9px] opacity-80 leading-tight mt-0.5">{cell.count}/{cell.total}</p>
                    </div>
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-neutral-500">
        <span>Low</span>
        <div className="flex gap-0.5">
          <span className="w-4 h-3 rounded-sm bg-neutral-200" />
          <span className="w-4 h-3 rounded-sm bg-danger-500/60" />
          <span className="w-4 h-3 rounded-sm bg-warning-500/70" />
          <span className="w-4 h-3 rounded-sm bg-success-500/70" />
          <span className="w-4 h-3 rounded-sm bg-success-500" />
        </div>
        <span>High</span>
      </div>
    </div>
  );
}


// ─── Vintage variance card ────────────────────────────────────────────
function VintageVarianceCard({ rows, periods, activeChannel, setActiveChannel, activePeriodId, setActivePeriodId, setActivePeriodLabel }) {
  const filterCh     = activeChannel;
  const setFilterCh  = setActiveChannel;
  const filterPeriod = activePeriodId;

  const stdPeriods = useMemo(() => periods.filter(p => p.type === 'Standard'), [periods]);

  useEffect(() => {
    if (!activePeriodId && stdPeriods.length > 0) {
      const first = stdPeriods[0];
      setActivePeriodId(first.id);
      setActivePeriodLabel(first.label);
    }
  }, [stdPeriods, activePeriodId, setActivePeriodId, setActivePeriodLabel]);

  const setFilterPeriod = (id) => {
    setActivePeriodId(id);
    const p = stdPeriods.find(p => p.id === id);
    setActivePeriodLabel(p ? p.label : '');
  };

  const filtered = rows.filter(r =>
    r.channel === filterCh && (filterPeriod ? r.period_id === filterPeriod : true)
  );

  const varColor = (v) => {
    if (v == null) return 'text-neutral-400';
    if (v > 1)  return 'text-success-700';
    if (v < -1) return 'text-danger-600';
    return 'text-neutral-700';
  };

  const varBg = (v) => {
    if (v == null) return '';
    if (v > 1)  return 'bg-success-100';
    if (v < -1) return 'bg-danger-100';
    return 'bg-neutral-100';
  };

  return (
    <Card
      title="Plan vs Target — GM%"
      subtitle="Working Plan GM% compared to Monthly Forecast (MF) and LY"
      fullscreen
      action={
        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-100 rounded-md p-0.5">
            {['STR', 'ONL', 'ONO'].map(ch => (
              <button key={ch}
                onClick={() => setFilterCh(ch)}
                className={`h-6 px-2 text-[11px] font-medium rounded transition-all ${filterCh === ch ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600'}`}
              >{ch}</button>
            ))}
          </div>
          <select
            value={filterPeriod}
            onChange={e => setFilterPeriod(e.target.value)}
            className="h-7 px-2 text-xs bg-white border border-neutral-200 rounded-md focus:outline-none"
          >
            <option value="">All periods</option>
            {stdPeriods.map(p => (
              <option key={p.id} value={p.id}>{p.id} — {p.label}</option>
            ))}
          </select>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-neutral-500">
          No WP entries yet — submit offers in Promo Details to see variance.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-primary-50 border-b border-primary-100">
                <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-primary-600 font-semibold rounded-tl-lg">Department</th>
                <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-primary-600 font-semibold">Period</th>
                <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-primary-600 font-semibold">WP GM%</th>
                <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-primary-600 font-semibold">MF GM%</th>
                <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-primary-600 font-semibold">vs MF</th>
                <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-primary-600 font-semibold rounded-tr-lg">LY GM%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {filtered.map((r, i) => (
                <tr key={i} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-2 px-3 font-medium text-neutral-800">{r.department}</td>
                  <td className="py-2 px-3 text-neutral-500 font-mono">{r.period_id}</td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-neutral-900">
                    {r.wp_gm != null ? `${r.wp_gm.toFixed(1)}%` : <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-neutral-600">
                    {r.mf_gm != null ? `${r.mf_gm.toFixed(1)}%` : '—'}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono font-semibold rounded-sm ${varColor(r.variance_to_mf)} ${varBg(r.variance_to_mf)}`}>
                    {r.variance_to_mf != null
                      ? `${r.variance_to_mf > 0 ? '+' : ''}${r.variance_to_mf.toFixed(1)}`
                      : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-neutral-500">
                    {r.ly_gm != null ? `${r.ly_gm.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 pt-3 border-t border-primary-100 flex items-center gap-4 text-[10px] text-neutral-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success-100 border border-success-300 inline-block" /> Above MF</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-neutral-100 border border-neutral-300 inline-block" /> Within ±1 pt</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-danger-100 border border-danger-200 inline-block" /> Below MF</span>
            <span className="ml-auto italic">Submit offers on Promo Details to populate WP GM%</span>
          </div>
        </div>
      )}
    </Card>
  );
}


// ─── Plan status banner ──────────────────────────────────────────────
const MF_BAND = 2.0; // pts — rows more than this below MF are "Off Target"

function classifyRow(row) {
  if (row.wp_gm === null || row.variance_to_mf === null) return 'nodata';
  if (row.variance_to_mf >= 0)          return 'on_target';
  if (row.variance_to_mf >= -MF_BAND)   return 'watch';
  return 'off_target';
}

function PlanStatusBanner({ vintageRows }) {
  const stats = useMemo(() => {
    let onTarget = 0, watch = 0, offTarget = 0, noData = 0;
    let worstRow = null;
    vintageRows.forEach(r => {
      const cls = classifyRow(r);
      if      (cls === 'on_target')  { onTarget++; }
      else if (cls === 'watch')      { watch++; }
      else if (cls === 'off_target') {
        offTarget++;
        if (!worstRow || r.variance_to_mf < worstRow.variance_to_mf) worstRow = r;
      }
      else { noData++; }
    });
    const status = offTarget > 0 ? 'blocked' : watch > 0 ? 'caution' : onTarget > 0 ? 'go' : 'empty';
    return { onTarget, watch, offTarget, noData, worstRow, status };
  }, [vintageRows]);

  if (stats.status === 'empty') return null;

  const { onTarget, watch, offTarget, noData, worstRow, status } = stats;

  const CFG = {
    go: {
      icon: '✓',
      label: 'Plan On Track',
      sub: 'All submitted entries meet or exceed the MF GM% target.',
      wrapCls: 'bg-emerald-50 border-emerald-200',
      iconCls: 'bg-emerald-500 text-white',
      headCls: 'text-emerald-900',
      subCls:  'text-emerald-700',
    },
    caution: {
      icon: '!',
      label: 'Review Before Submitting',
      sub: `${watch} dept·channel·period ${watch === 1 ? 'combination is' : 'combinations are'} below MF target but within the watch band.`,
      wrapCls: 'bg-amber-50 border-amber-200',
      iconCls: 'bg-amber-400 text-white',
      headCls: 'text-amber-900',
      subCls:  'text-amber-700',
    },
    blocked: {
      icon: '✕',
      label: 'Action Required',
      sub: `${offTarget} ${offTarget === 1 ? 'combination is' : 'combinations are'} more than ${MF_BAND} pts below MF — submit is at risk.`,
      wrapCls: 'bg-red-50 border-red-200',
      iconCls: 'bg-red-500 text-white',
      headCls: 'text-red-900',
      subCls:  'text-red-700',
    },
  };

  const cfg = CFG[status];

  return (
    <div className={`rounded-xl border px-5 py-4 ${cfg.wrapCls}`}>
      <div className="flex items-start gap-4 flex-wrap">
        {/* Icon + text */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 ${cfg.iconCls}`}>
            {cfg.icon}
          </div>
          <div className="min-w-0">
            <p className={`text-[14px] font-bold leading-tight ${cfg.headCls}`}>{cfg.label}</p>
            <p className={`text-[12px] mt-0.5 ${cfg.subCls}`}>{cfg.sub}</p>
            {worstRow && (
              <p className="mt-1 text-[11px] text-neutral-500">
                Worst offender:{' '}
                <span className="font-semibold text-neutral-700">
                  {worstRow.department} · {worstRow.channel} · {worstRow.period_id}
                </span>
                {' '}—{' '}
                <span className="text-red-600 font-semibold tabular-nums">
                  {worstRow.variance_to_mf.toFixed(1)} pts vs MF
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {onTarget > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {onTarget} on target
            </span>
          )}
          {watch > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              {watch} watching
            </span>
          )}
          {offTarget > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              {offTarget} off target
            </span>
          )}
          {noData > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 inline-block" />
              {noData} no WP
            </span>
          )}
        </div>
      </div>

      {/* Threshold key */}
      <p className="mt-3 pt-3 border-t border-black/5 text-[10px] text-neutral-400">
        Thresholds — <span className="font-medium">On Target:</span> WP ≥ MF ·{' '}
        <span className="font-medium">Watch:</span> 0 to −{MF_BAND} pts ·{' '}
        <span className="font-medium">Off Target:</span> &lt;−{MF_BAND} pts vs MF GM%
      </p>
    </div>
  );
}


// ─── Audit snapshot ──────────────────────────────────────────────────
const AUDIT_BLOCKING = new Set(['Invalid', 'TOD Not Deeper']);
const AUDIT_CAT_META = {
  'Required':         { label: 'Required Offers',     blocking: false },
  'Invalid':          { label: 'Invalid Offers',       blocking: true  },
  'TOD Not Deeper':   { label: 'TOD Not Deeper',       blocking: true  },
  'Should be at Reg': { label: 'Should be Full Price', blocking: false },
  'Below PCF':        { label: 'Below PCF Floor',      blocking: false },
};

function AuditHealthRing({ clean, total, blocking }) {
  const r = 26, circ = 2 * Math.PI * r;
  const pct   = total > 0 ? clean / total : 0;
  // Use theme hex values: success-500, warning-500, danger-500
  const color = blocking > 0 ? '#D00000' : clean < total ? '#D4651A' : '#10B981';
  const track = '#D8EAF0'; // primary-50
  return (
    <svg width="68" height="68" viewBox="0 0 68 68">
      <circle cx="34" cy="34" r={r} fill="none" stroke={track} strokeWidth="6" />
      <circle
        cx="34" cy="34" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeDasharray={`${pct * circ} ${(1 - pct) * circ}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="34" y="30" textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>{clean}</text>
      <text x="34" y="43" textAnchor="middle" fontSize="9" fill="#6AAABB">/ {total}</text>
    </svg>
  );
}

function AuditSnapshot({ flags }) {
  const total    = flags.length;
  const clean    = flags.filter(f => f.count === 0).length;
  const blocking = flags.filter(f => AUDIT_BLOCKING.has(f.category)).reduce((s,f) => s+f.count, 0);
  const warnings = flags.filter(f => !AUDIT_BLOCKING.has(f.category) && f.count > 0).reduce((s,f) => s+f.count, 0);

  const statusLabel = blocking > 0
    ? `${blocking} blocking issue${blocking > 1 ? 's' : ''}`
    : warnings > 0
    ? `${warnings} warning${warnings > 1 ? 's' : ''}`
    : 'Ready to submit';
  const statusPill = blocking > 0
    ? 'bg-danger-50 border-danger-100 text-danger-700'
    : warnings > 0
    ? 'bg-warning-50 border-warning-100 text-warning-700'
    : 'bg-success-50 border-success-100 text-success-700';
  const statusDot = blocking > 0 ? 'bg-danger-500' : warnings > 0 ? 'bg-warning-500' : 'bg-success-500';

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-primary-400">
          Pre-Submission Audit
        </p>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${statusPill}`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot}`} />
          {statusLabel}
        </span>
      </div>

      {/* Body: ring + blocking count on left, category rows on right */}
      <div className="flex items-center gap-5">

        {/* Left visual column */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <AuditHealthRing clean={clean} total={total} blocking={blocking} />
          <p className="text-[10px] text-primary-300 text-center leading-tight">checks<br/>passed</p>

          <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[52px] ${
            blocking > 0
              ? 'bg-danger-50 border border-danger-100'
              : 'bg-success-50 border border-success-100'
          }`}>
            <span className={`text-xl font-bold tabular-nums leading-none ${
              blocking > 0 ? 'text-danger-600' : 'text-success-600'
            }`}>
              {blocking}
            </span>
            <span className={`text-[9px] font-semibold uppercase tracking-wide mt-0.5 ${
              blocking > 0 ? 'text-danger-500' : 'text-success-600'
            }`}>
              blocking
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px self-stretch bg-primary-100 flex-shrink-0" />

        {/* Right: category rows */}
        <div className="flex-1 space-y-1">
          {flags.map(f => {
            const meta       = AUDIT_CAT_META[f.category] || { label: f.category };
            const isBlocking = AUDIT_BLOCKING.has(f.category);
            const hasIssue   = f.count > 0;
            return (
              <div
                key={f.category}
                className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors ${
                  hasIssue
                    ? isBlocking ? 'bg-danger-50' : 'bg-warning-50'
                    : 'hover:bg-accent-100'
                }`}
              >
                {/* Severity dot */}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  hasIssue
                    ? isBlocking ? 'bg-danger-500' : 'bg-warning-500'
                    : 'bg-success-500'
                }`} />

                {/* Category name */}
                <span className={`flex-1 text-[12px] ${
                  hasIssue
                    ? isBlocking ? 'font-medium text-danger-700' : 'font-medium text-warning-700'
                    : 'text-neutral-500'
                }`}>
                  {meta.label}
                  {hasIssue && isBlocking && (
                    <span className="ml-2 text-[9px] font-bold uppercase tracking-wide text-danger-500">blocking</span>
                  )}
                </span>

                {/* Right: count badge or check */}
                {hasIssue ? (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                    isBlocking ? 'bg-danger-100 text-danger-700' : 'bg-warning-100 text-warning-700'
                  }`}>
                    {f.count}
                  </span>
                ) : (
                  <span className="text-[11px] text-success-600 font-semibold">✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(blocking > 0 || warnings > 0) && (
        <p className="mt-4 pt-3 border-t border-accent-300 text-[10px] text-neutral-400">
          Open the <span className="font-medium text-primary-500">Audit</span> tab to review and resolve flagged entries before submitting.
        </p>
      )}
    </div>
  );
}


// ─── Control-tab helpers (merged) ────────────────────────────────────────────

function relativeTime(isoString) {
  if (!isoString) return '—';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CoverageRing({ pct }) {
  const r     = 28;
  const circ  = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  const color  = pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={color} strokeWidth="7"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
        {pct}%
      </text>
    </svg>
  );
}

const CH_LABELS = { STR: 'Stores', ONL: 'Online', ONO: 'Online Only' };

function gmCellStyle(variance) {
  if (variance === null || variance === undefined) {
    return { bg: 'bg-neutral-50', text: 'text-neutral-400', dot: 'bg-neutral-300' };
  }
  if (variance >= 0)    return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  if (variance >= -2.0) return { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400'  };
  return                       { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'    };
}

function DeptGmGrid({ deptGmGrid, channels }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-primary-50 border-b border-primary-100">
            <th className="text-left py-2.5 px-4 text-[11px] font-semibold text-primary-600 uppercase tracking-wide">
              Department
            </th>
            {channels.map(ch => (
              <th key={ch} className="py-2.5 px-3 text-[11px] font-semibold text-primary-600 uppercase tracking-wide text-center">
                {CH_LABELS[ch] ?? ch}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deptGmGrid.map(row => (
            <tr key={row.department} className="border-t border-primary-50 hover:bg-primary-50/40 transition-colors">
              <td className="py-3 px-4 text-[13px] font-semibold text-primary-800">
                {row.department}
              </td>
              {row.channels.map(cell => {
                const s = gmCellStyle(cell.variance);
                return (
                  <td key={cell.channel} className={`py-2.5 px-3 text-center ${s.bg}`}>
                    {cell.wp_gm !== null ? (
                      <>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 ${s.dot}`} />
                          <span className={`text-[13px] font-semibold tabular-nums ${s.text}`}>
                            {cell.wp_gm.toFixed(1)}%
                          </span>
                        </div>
                        {cell.variance !== null && (
                          <p className={`text-[10px] font-medium tabular-nums ${s.text} opacity-80`}>
                            {cell.variance >= 0 ? '+' : ''}{cell.variance.toFixed(1)} vs MF
                          </p>
                        )}
                        {cell.mf_gm !== null && (
                          <p className="text-[10px] text-neutral-400 tabular-nums">
                            MF {cell.mf_gm.toFixed(1)}%
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-neutral-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


// ─── Offer Mix — fullscreen-aware content ────────────────────────────────────
const OFFER_MIX_INSIGHTS = [
  {
    severity: 'info',
    category: 'Dominant Type',
    getText: (data) => {
      const top = [...data].sort((a, b) => b.value - a.value)[0];
      const total = data.reduce((s, d) => s + d.value, 0);
      const pct = Math.round(top.value / total * 100);
      return `${top.name} is the leading entry type at ${pct}% of all submissions. Ensure offer depths align with MF GM% targets.`;
    },
  },
  {
    severity: 'success',
    category: 'Type Diversity',
    getText: (data) => {
      const count = data.length;
      return count >= 4
        ? `${count} of 7 entry types are in use — good mix diversity. Broader spread reduces reliance on any single offer mechanic.`
        : `Only ${count} of 7 entry types are active. Introducing additional mechanics like MUPP or Price Point can improve GM% flexibility.`;
    },
  },
  {
    severity: 'warning',
    category: 'BOGO Exposure',
    getText: (data) => {
      const bogo = data.find(d => d.type === 'BOGO_FREE' || d.type === 'BOGO_50');
      if (!bogo) return 'No BOGO entries detected. BOGO mechanics can drive traffic but require careful GM% modeling to avoid margin erosion.';
      const total = data.reduce((s, d) => s + d.value, 0);
      const pct = Math.round(bogo.value / total * 100);
      return `BOGO entries represent ${pct}% of submissions. Validate that effective GM% after discount depth meets the MF floor.`;
    },
  },
  {
    severity: 'info',
    category: 'MUPP Opportunity',
    getText: (data) => {
      const mupp = data.find(d => d.type === 'MUPP');
      if (!mupp) return 'No MUPP entries found. Multi-unit pricing (e.g. "2 for $X") can lift basket size and blended GM% vs. straight % off.';
      return `MUPP entries are present. Ensure quantity fields are set correctly — "2 for $X" behaves differently from single-unit pricing in GM% calculations.`;
    },
  },
  {
    severity: 'warning',
    category: 'Concentration Risk',
    getText: (data) => {
      const total = data.reduce((s, d) => s + d.value, 0);
      const top = [...data].sort((a, b) => b.value - a.value)[0];
      const pct = Math.round(top.value / total * 100);
      if (pct >= 60) return `${pct}% of entries share the same type. High concentration reduces negotiating flexibility during final approval review.`;
      return `Offer type distribution looks balanced — no single mechanic exceeds 60% of submissions, reducing concentration risk.`;
    },
  },
];

const SEVERITY_CFG = {
  success: { dot: 'bg-emerald-500', border: 'border-l-emerald-400', bg: 'bg-emerald-50/60',  cat: 'text-emerald-700' },
  warning: { dot: 'bg-amber-400',   border: 'border-l-amber-400',   bg: 'bg-amber-50/60',   cat: 'text-amber-700'   },
  error:   { dot: 'bg-red-500',     border: 'border-l-red-400',     bg: 'bg-red-50/60',     cat: 'text-red-700'     },
  info:    { dot: 'bg-primary-400', border: 'border-l-primary-300', bg: 'bg-primary-50/50', cat: 'text-primary-600' },
};

function OfferMixContent({ data, chartRef }) {
  const isFullscreen = useIsFullscreen();

  const donut = (
    <div
      ref={chartRef}
      className={isFullscreen ? 'flex-1 min-h-0' : 'h-72'}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="48%"
            innerRadius={isFullscreen ? 68 : 48}
            outerRadius={isFullscreen ? 104 : 74}
            paddingAngle={2} dataKey="value"
            stroke="white" strokeWidth={2}
            label={({ cx, cy, midAngle, outerRadius, name, value, percent }) => {
              const RADIAN = Math.PI / 180;
              const radius = outerRadius + (isFullscreen ? 36 : 28);
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              if (percent < 0.06) return null;
              return (
                <text
                  x={x} y={y}
                  fill="#1A3A42"
                  textAnchor={x > cx ? 'start' : 'end'}
                  dominantBaseline="central"
                  fontSize={isFullscreen ? 13 : 11}
                  fontFamily="DM Sans, sans-serif"
                  fontWeight={500}
                >
                  {`${name} · ${value}`}
                </text>
              );
            }}
            labelLine={{ stroke: '#C4D3EC', strokeWidth: 1 }}
          >
            {data.map((entry) => (
              <Cell key={entry.type} fill={TYPE_COLORS[entry.type] || CHART_COLORS.neutral} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            itemStyle={CHART_TOOLTIP_ITEM_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            formatter={(value, name) => [`${value} entries`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  if (!isFullscreen) return donut;

  return (
    <div className="flex h-full gap-0">
      {/* Chart side */}
      <div className="flex-1 flex flex-col min-h-0 pr-6">
        {donut}
        {/* Legend */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4 justify-center">
          {data.map(d => (
            <div key={d.type} className="flex items-center gap-1.5 text-[12px] text-neutral-600">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: TYPE_COLORS[d.type] || CHART_COLORS.neutral }} />
              <span>{d.name}</span>
              <span className="text-neutral-400 tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-neutral-100 flex-shrink-0 self-stretch" />

      {/* AI Insights side */}
      <div className="w-96 flex-shrink-0 pl-6 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-5 flex-shrink-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-bold text-neutral-800 leading-none">AI Insights</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">Based on current offer mix</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft inline-block" />
            Live
          </span>
        </div>

        {/* Insight cards */}
        <div className="space-y-3 flex-1">
          {OFFER_MIX_INSIGHTS.map((ins, i) => {
            const s = SEVERITY_CFG[ins.severity] ?? SEVERITY_CFG.info;
            return (
              <div key={i} className={`flex gap-2.5 px-3.5 py-3 rounded-xl border-l-[3px] ${s.border} ${s.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full mt-[5px] flex-shrink-0 ${s.dot}`} />
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${s.cat}`}>{ins.category}</span>
                  <p className="text-[12px] text-neutral-600 mt-0.5 leading-relaxed">{ins.getText(data)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 pt-3 border-t border-neutral-100 text-[10px] text-neutral-300 italic flex-shrink-0">
          AI insights are generated from live cycle data and are for planning guidance only.
        </p>
      </div>
    </div>
  );
}


// ─── Section divider ─────────────────────────────────────────────────
function SectionDivider({ title, subtitle }) {
  return (
    <div className="flex items-center gap-4 pt-2 pb-1">
      <div className="flex-shrink-0">
        <h2 className="text-[11px] font-bold text-primary-600 uppercase tracking-[0.12em]">{title}</h2>
        {subtitle && <p className="text-[10.5px] text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-primary-200 via-accent-200 to-transparent" />
    </div>
  );
}




// ─── [PlanExplorer removed — replaced by PempalDynamicChart] ─────────
const _REMOVED_EXPLORER_METRICS = [
  { id: 'wp_gm',       label: 'WP GM%',             unit: '%',  hasVintage: true  },
  { id: 'disc_depth',  label: 'Avg Discount Depth',  unit: '%',  hasVintage: false },
  { id: 'entry_count', label: 'Entry Count',          unit: '',   hasVintage: false },
  { id: 'coverage',    label: 'Product Coverage',     unit: '%',  hasVintage: false },
  { id: 'eff_price',   label: 'Avg Eff. Price',       unit: '$',  hasVintage: false },
];

const EXPLORER_DIMS = [
  { id: 'period',  label: 'Period'  },
  { id: 'dept',    label: 'Dept'    },
  { id: 'channel', label: 'Channel' },
];

const CHART_TYPE_ICONS = {
  bar: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/>
    </svg>
  ),
  line: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="4 20 9 13 14 16 20 6"/>
    </svg>
  ),
  area: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 20 L9 13 L14 16 L20 6 L20 20 Z" strokeLinejoin="round"/>
    </svg>
  ),
};

function PlanExplorer({ entries, products, periods, vintageRows }) {
  const [metric,       setMetric]       = useState('wp_gm');
  const [dim,          setDim]          = useState('period');
  const [chartType,    setChartType]    = useState('bar');
  const [showVintage,  setShowVintage]  = useState(true);

  const metaCurrent = EXPLORER_METRICS.find(m => m.id === metric);
  const canVintage  = metaCurrent?.hasVintage;

  const chartData = useMemo(() => {
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    // Build group keys — pre-seed from master data so empty groups still appear
    const groupMap = {};
    if (dim === 'period')  periods.forEach(p => { groupMap[p.id] = []; });
    else if (dim === 'dept') products.forEach(p => { if (!groupMap[p.department]) groupMap[p.department] = []; });

    entries.forEach(e => {
      const prod = productMap[e.product_id];
      if (!prod) return;
      const key = dim === 'dept' ? prod.department : dim === 'channel' ? (e.channel ?? 'Unknown') : e.period_id;
      if (!groupMap[key]) groupMap[key] = [];
      groupMap[key].push(e);
    });

    return Object.entries(groupMap).sort(([a],[b]) => a.localeCompare(b)).map(([grp, grpEntries]) => {
      let value = null;

      if (metric === 'entry_count') {
        value = grpEntries.length;
      } else if (metric === 'coverage') {
        const base = dim === 'dept'
          ? products.filter(p => p.department === grp).length
          : products.length;
        const covered = new Set(grpEntries.map(e => e.product_id)).size;
        value = base > 0 ? +(covered / base * 100).toFixed(1) : null;
      } else if (metric === 'wp_gm') {
        const gms = [];
        grpEntries.forEach(e => {
          const p = productMap[e.product_id];
          if (!p?.ticket || !p?.auc) return;
          const eff = effectivePx(e.entry_type, e.offer_value, p.ticket);
          if (eff > 0) gms.push((eff - p.auc) / eff * 100);
        });
        value = gms.length ? +(gms.reduce((a,b)=>a+b,0)/gms.length).toFixed(1) : null;
      } else if (metric === 'disc_depth') {
        const ds = [];
        grpEntries.forEach(e => {
          const p = productMap[e.product_id];
          if (!p?.ticket) return;
          const eff = effectivePx(e.entry_type, e.offer_value, p.ticket);
          ds.push((1 - eff / p.ticket) * 100);
        });
        value = ds.length ? +(ds.reduce((a,b)=>a+b,0)/ds.length).toFixed(1) : null;
      } else if (metric === 'eff_price') {
        const ps = [];
        grpEntries.forEach(e => {
          const p = productMap[e.product_id];
          if (!p?.ticket) return;
          const eff = effectivePx(e.entry_type, e.offer_value, p.ticket);
          if (eff > 0) ps.push(eff);
        });
        value = ps.length ? +(ps.reduce((a,b)=>a+b,0)/ps.length).toFixed(2) : null;
      }

      // Vintage: MF GM% from vintageRows for WP GM% only
      let vintage = null;
      if (canVintage && showVintage && metric === 'wp_gm') {
        const vRows = vintageRows.filter(r => {
          if (dim === 'period')  return r.period_id === grp;
          if (dim === 'dept')    return r.department === grp;
          return r.channel === grp;
        }).filter(r => r.mf_gm != null);
        vintage = vRows.length ? +(vRows.reduce((s,r)=>s+r.mf_gm,0)/vRows.length).toFixed(1) : null;
      }

      return { label: grp, value, ...(vintage != null ? { vintage } : {}) };
    });
  }, [entries, products, periods, vintageRows, metric, dim, canVintage, showVintage]);

  const unit      = metaCurrent?.unit ?? '';
  const hasAny    = chartData.some(d => d.value != null);
  const hasVint   = chartData.some(d => d.vintage != null);
  const primaryColor = '#5B8DD9';

  return (
    <Card
      title="Plan Explorer"
      subtitle="Choose a metric and dimension to visualise — optionally overlay the MF benchmark"
      fullscreen
      action={
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Metric selector */}
          <div className="relative">
            <select
              value={metric}
              onChange={e => setMetric(e.target.value)}
              className="appearance-none pl-2.5 pr-7 py-1 text-[11px] font-medium bg-white border border-neutral-200 rounded-full text-neutral-700 hover:border-primary-300 focus:outline-none focus:border-primary-400 cursor-pointer transition-all"
            >
              {EXPLORER_METRICS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6"/></svg>
          </div>

          {/* Dimension toggle */}
          <div className="flex bg-neutral-100 rounded-md p-0.5">
            {EXPLORER_DIMS.map(d => (
              <button
                key={d.id}
                onClick={() => setDim(d.id)}
                className={`h-6 px-2.5 text-[11px] font-medium rounded transition-all ${dim === d.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              >{d.label}</button>
            ))}
          </div>

          {/* Chart type toggle */}
          <div className="flex bg-neutral-100 rounded-md p-0.5">
            {['bar','line','area'].map(ct => (
              <button
                key={ct}
                onClick={() => setChartType(ct)}
                title={ct.charAt(0).toUpperCase() + ct.slice(1)}
                className={`h-6 w-7 flex items-center justify-center rounded transition-all ${chartType === ct ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                {CHART_TYPE_ICONS[ct]}
              </button>
            ))}
          </div>

          {/* Vintage toggle — only when metric supports it */}
          {canVintage && (
            <button
              onClick={() => setShowVintage(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all ${
                showVintage
                  ? 'bg-warning-50 border-warning-300 text-warning-700'
                  : 'bg-white border-neutral-200 text-neutral-400 hover:border-neutral-300'
              }`}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="4 20 9 13 14 16 20 6"/>
              </svg>
              MF Benchmark
            </button>
          )}
        </div>
      }
    >
      {!hasAny ? (
        <div className="h-64 flex items-center justify-center text-[12px] text-neutral-400">
          No data for this combination — submit entries to populate the explorer.
        </div>
      ) : (
        <FullscreenFlexDiv normalHeight={280}>
          <ExplorerChart
            data={chartData}
            chartType={chartType}
            unit={unit}
            primaryColor={primaryColor}
            hasVintage={hasVint}
            showVintage={showVintage && canVintage}
          />
        </FullscreenFlexDiv>
      )}

      {/* Legend */}
      {hasAny && (
        <div className="flex items-center gap-5 mt-3 pt-3 border-t border-neutral-100 flex-wrap">
          <span className="flex items-center gap-1.5 text-[10px] text-neutral-500">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: primaryColor }} />
            {metaCurrent?.label}
          </span>
          {showVintage && canVintage && hasVint && (
            <span className="flex items-center gap-1.5 text-[10px] text-neutral-500">
              <svg width="16" height="4" className="flex-shrink-0">
                <line x1="0" y1="2" x2="16" y2="2" stroke="#4A78C4" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" />
              </svg>
              MF Benchmark (avg)
            </span>
          )}
          <span className="ml-auto text-[10px] text-neutral-300 italic">
            {dim === 'period' ? 'Grouped by planning period' : dim === 'dept' ? 'Grouped by department' : 'Grouped by channel'}
          </span>
        </div>
      )}
    </Card>
  );
}

function ExplorerChart({ data, chartType, unit, primaryColor, hasVintage, showVintage }) {
  const fmtVal  = (v) => v != null ? `${v}${unit}` : '—';
  const yFmt    = (v) => unit === '$' ? `$${v}` : `${v}${unit}`;
  const axisW   = unit === '$' ? 52 : 40;

  const sharedProps = {
    data,
    margin: { top: 8, right: 12, left: -8, bottom: 4 },
  };
  const xAxis   = <XAxis dataKey="label" tick={CHART_AXIS_STYLE} axisLine={false} tickLine={false} />;
  const yAxis   = <YAxis tick={CHART_AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={yFmt} width={axisW} allowDecimals />;
  const grid    = <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />;
  const tooltip = (
    <Tooltip
      contentStyle={CHART_TOOLTIP_STYLE}
      itemStyle={CHART_TOOLTIP_ITEM_STYLE}
      labelStyle={CHART_TOOLTIP_LABEL_STYLE}
      cursor={{ fill: 'rgba(3,87,117,0.05)' }}
      formatter={(v, name) => [fmtVal(v), name === 'value' ? 'WP' : 'MF Benchmark']}
    />
  );

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...sharedProps}>
          {grid}{xAxis}{yAxis}{tooltip}
          <Bar dataKey="value" radius={[4,4,0,0]}>
            {data.map((d, i) => <Cell key={i} fill={d.value != null ? primaryColor : '#E4E4E7'} />)}
          </Bar>
          {showVintage && hasVintage && (
            <Bar dataKey="vintage" fill="#4A78C4" radius={[4,4,0,0]} fillOpacity={0.85} />
          )}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart {...sharedProps}>
          {grid}{xAxis}{yAxis}{tooltip}
          <defs>
            <linearGradient id="expGradPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={primaryColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={primaryColor} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="expGradVintage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#4A78C4" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#4A78C4" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={primaryColor} strokeWidth={2.5}
            fill="url(#expGradPrimary)"
            dot={{ r: 4, fill: primaryColor, stroke: 'white', strokeWidth: 2 }}
            activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
            connectNulls
          />
          {showVintage && hasVintage && (
            <Area type="monotone" dataKey="vintage" stroke="#4A78C4" strokeWidth={1.5} strokeDasharray="5 3"
              fill="url(#expGradVintage)"
              dot={{ r: 3, fill: '#4A78C4', stroke: 'white', strokeWidth: 1.5 }}
              connectNulls
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // line
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart {...sharedProps}>
        {grid}{xAxis}{yAxis}{tooltip}
        <Line type="monotone" dataKey="value" stroke={primaryColor} strokeWidth={2.5}
          dot={{ r: 4, fill: primaryColor, stroke: 'white', strokeWidth: 2 }}
          activeDot={{ r: 6, stroke: 'white', strokeWidth: 2 }}
          connectNulls
        />
        {showVintage && hasVintage && (
          <Line type="monotone" dataKey="vintage" stroke="#4A78C4" strokeWidth={1.5} strokeDasharray="5 3"
            dot={{ r: 3, fill: '#4A78C4', stroke: 'white', strokeWidth: 1.5 }}
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}


// ─── YOY GM% trend chart (WP · LY · LLY) ────────────────────────────
function YoyGmTrendChart({ data }) {
  const isFullscreen = useIsFullscreen();
  const hasData = data.some(d => d.wp_gm != null || d.ly_gm != null);
  if (!hasData) {
    return (
      <div className="h-48 flex items-center justify-center text-[11px] text-neutral-400">
        No data yet — submit entries to see the YOY trend
      </div>
    );
  }
  return (
    <div className={isFullscreen ? 'flex flex-col h-full' : ''}>
      <div className={isFullscreen ? 'flex-1 min-h-0' : 'h-52'}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="yoyWp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="#5B8DD9" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#5B8DD9" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="yoyLy" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="#7EC8A4" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#7EC8A4" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="yoyLly" x1="0" y1="0" x2="0" y2="1">
                <stop offset="10%" stopColor="#B8A5D4" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#B8A5D4" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#71717A', fontFamily: 'DM Sans, sans-serif' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#71717A', fontFamily: 'DM Sans, sans-serif' }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v}%`}
              width={34}
              domain={([min, max]) => [Math.max(0, Math.floor(min) - 2), Math.ceil(max) + 2]}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              itemStyle={CHART_TOOLTIP_ITEM_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              formatter={(val, key) => [
                val != null ? `${Number(val).toFixed(1)}%` : '—',
                key === 'wp_gm' ? 'WP GM%' : key === 'ly_gm' ? 'LY GM%' : 'LLY GM%',
              ]}
            />
            <Area type="monotone" dataKey="lly_gm"
              stroke="#B8A5D4" strokeWidth={1.5} strokeDasharray="3 3"
              fill="url(#yoyLly)"
              dot={{ r: 2.5, fill: '#B8A5D4', stroke: 'white', strokeWidth: 1 }}
              connectNulls
            />
            <Area type="monotone" dataKey="ly_gm"
              stroke="#7EC8A4" strokeWidth={1.5} strokeDasharray="5 3"
              fill="url(#yoyLy)"
              dot={{ r: 2.5, fill: '#7EC8A4', stroke: 'white', strokeWidth: 1 }}
              connectNulls
            />
            <Area type="monotone" dataKey="wp_gm"
              stroke="#5B8DD9" strokeWidth={2}
              fill="url(#yoyWp)"
              dot={{ r: 3.5, fill: '#5B8DD9', stroke: 'white', strokeWidth: 1.5 }}
              activeDot={{ r: 5, stroke: 'white', strokeWidth: 1.5 }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-neutral-100 flex-shrink-0 flex-wrap">
        <span className="flex items-center gap-1.5 text-[10px] text-neutral-500">
          <svg width="16" height="4" className="flex-shrink-0">
            <line x1="0" y1="2" x2="16" y2="2" stroke="#5B8DD9" strokeWidth="2" strokeLinecap="round" />
          </svg>
          WP (Current)
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-neutral-500">
          <svg width="16" height="4" className="flex-shrink-0">
            <line x1="0" y1="2" x2="16" y2="2" stroke="#7EC8A4" strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round" />
          </svg>
          LY
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-neutral-500">
          <svg width="16" height="4" className="flex-shrink-0">
            <line x1="0" y1="2" x2="16" y2="2" stroke="#B8A5D4" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" />
          </svg>
          LLY
        </span>
      </div>
    </div>
  );
}


// ─── YOY dept comparison table ───────────────────────────────────────
function YoyComparisonCard({ data }) {
  const varColor = (v) => {
    if (v == null) return 'text-neutral-400';
    if (v > 1)  return 'text-success-700';
    if (v < -1) return 'text-danger-600';
    return 'text-neutral-700';
  };
  const varBg = (v) => {
    if (v == null) return '';
    if (v > 1)  return 'bg-success-50';
    if (v < -1) return 'bg-danger-50';
    return 'bg-neutral-50';
  };
  const fmt      = (v) => v != null ? `${Number(v).toFixed(1)}%` : '—';
  const fmtDelta = (v) => v != null ? `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}` : '—';

  return (
    <Card
      title="GM% by Department · YOY"
      subtitle="Avg WP, LY, and LLY gross margin per department"
      fullscreen
    >
      {data.length === 0 ? (
        <EmptyState title="No data" description="YOY comparison will populate after entries are submitted." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-primary-50 border-b border-primary-100">
                  <th className="text-left py-2.5 px-3 text-[10px] uppercase tracking-wider text-primary-600 font-semibold rounded-tl-lg">
                    Department
                  </th>
                  <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-primary-600 font-semibold">
                    WP GM%
                  </th>
                  <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-primary-600 font-semibold">
                    LY GM%
                  </th>
                  <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-[#B8A5D4] font-semibold">
                    LLY GM%
                  </th>
                  <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-primary-600 font-semibold">
                    Δ vs LY
                  </th>
                  <th className="text-right py-2.5 px-3 text-[10px] uppercase tracking-wider text-primary-600 font-semibold rounded-tr-lg">
                    Δ vs LLY
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-50">
                {data.map((row) => (
                  <tr key={row.dept} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-2 px-3 font-medium text-neutral-800">{row.dept}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-neutral-900 tabular-nums">
                      {fmt(row.wp_gm)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-neutral-600 tabular-nums">
                      {fmt(row.ly_gm)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[#9B82C8] tabular-nums">
                      {fmt(row.lly_gm)}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-semibold tabular-nums ${varColor(row.vs_ly)} ${varBg(row.vs_ly)}`}>
                      {fmtDelta(row.vs_ly)}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono font-semibold tabular-nums ${varColor(row.vs_lly)} ${varBg(row.vs_lly)}`}>
                      {fmtDelta(row.vs_lly)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 pt-3 border-t border-primary-100 flex items-center gap-4 text-[10px] text-neutral-500 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-success-50 border border-success-300 inline-block" />
              WP above (&gt;+1 pp)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-neutral-50 border border-neutral-200 inline-block" />
              Within ±1 pp
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-danger-50 border border-danger-200 inline-block" />
              WP below (&lt;−1 pp)
            </span>
            <span className="ml-auto text-[9px] italic text-neutral-300">LY · LLY are prior-year actuals</span>
          </div>
        </>
      )}
    </Card>
  );
}


function SummarySkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
      <Skeleton className="h-64" />
    </div>
  );
}