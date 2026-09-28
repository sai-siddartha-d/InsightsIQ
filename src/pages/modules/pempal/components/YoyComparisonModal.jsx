// src/pages/modules/pempal/components/YoyComparisonModal.jsx
import { useState, useEffect, useMemo } from 'react';
import { pempalApi } from '../../../../services/api';
import { effectivePx } from '../utils/tabHelpers';

// ─── Helpers ────────────────────────────────────────────────────────────────
function avg(arr) {
  return arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;
}

const varColor = (v) => v == null ? 'text-neutral-400' : v > 1 ? 'text-success-700' : v < -1 ? 'text-danger-600' : 'text-neutral-700';
const varBg    = (v) => v == null ? '' : v > 1 ? 'bg-success-50' : v < -1 ? 'bg-danger-50' : 'bg-neutral-50';
const fmt      = (v) => v != null ? `${Number(v).toFixed(1)}%` : '—';
const fmtDelta = (v) => v != null ? `${v > 0 ? '+' : ''}${Number(v).toFixed(1)}` : '—';



export default function YoyComparisonModal({ open, onClose }) {
  const [loading, setLoading]         = useState(false);
  const [vintageRows, setVintageRows] = useState([]);
  const [entries, setEntries]         = useState([]);
  const [products, setProducts]       = useState([]);
  const [view, setView]               = useState('dept');       // 'dept' | 'class' | 'channel'

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      pempalApi.getVintageSummary(),
      pempalApi.getEntries(),
      pempalApi.getProducts(),
    ])
      .then(([vs, e, p]) => {
        setVintageRows(vs); setEntries(e); setProducts(p);
      })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // ── Aggregated data (dept / period views) ────────────────────────────
  const deptData = useMemo(() => {
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
      return { label: dept, wp_gm: wp, ly_gm: ly, lly_gm: lly,
        vs_ly:  (wp != null && ly  != null) ? +(wp - ly ).toFixed(1) : null,
        vs_lly: (wp != null && lly != null) ? +(wp - lly).toFixed(1) : null };
    });
  }, [vintageRows]);

  const classData = useMemo(() => {
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));
    const wpByCls = {};
    entries.forEach(e => {
      const prod = productMap[e.product_id];
      if (!prod?.ticket || !prod?.auc || !prod?.class_name) return;
      const eff = effectivePx(e.entry_type, e.offer_value, prod.ticket);
      if (eff <= 0) return;
      const gm = (eff - prod.auc) / eff * 100;
      wpByCls[prod.class_name] = wpByCls[prod.class_name] ?? [];
      wpByCls[prod.class_name].push(gm);
    });
    const lyByDept = {}, llyByDept = {};
    vintageRows.forEach(r => {
      if (r.ly_gm  != null) (lyByDept[r.department]  ??= []).push(r.ly_gm);
      if (r.lly_gm != null) (llyByDept[r.department] ??= []).push(r.lly_gm);
    });
    return Object.entries(wpByCls).map(([cls, gms]) => {
      const wp   = avg(gms);
      const prod = products.find(p => p.class_name === cls);
      const dept = prod?.department;
      // A class inherits its department's LY / LLY benchmark (vintages are dept-level).
      const ly   = dept && lyByDept[dept]?.length  ? avg(lyByDept[dept])  : null;
      const lly  = dept && llyByDept[dept]?.length ? avg(llyByDept[dept]) : null;
      return { label: cls, sublabel: dept,
        wp_gm: wp, ly_gm: ly, lly_gm: lly,
        vs_ly:  wp != null && ly  != null ? +(wp - ly ).toFixed(1) : null,
        vs_lly: wp != null && lly != null ? +(wp - lly).toFixed(1) : null };
    }).sort((a, b) => (a.sublabel ?? '').localeCompare(b.sublabel ?? '') || a.label.localeCompare(b.label));
  }, [entries, products, vintageRows]);

  const channelData = useMemo(() => {
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));
    const wpByCh = {};
    entries.forEach(e => {
      const prod = productMap[e.product_id];
      if (!prod?.ticket || !prod?.auc) return;
      const ch = e.channel || 'Unknown';
      const eff = effectivePx(e.entry_type, e.offer_value, prod.ticket);
      if (eff <= 0) return;
      const gm = (eff - prod.auc) / eff * 100;
      wpByCh[ch] = wpByCh[ch] ?? [];
      wpByCh[ch].push(gm);
    });
    const lyByCh = {}, llyByCh = {};
    vintageRows.forEach(r => {
      if (r.ly_gm  != null) (lyByCh[r.channel]  ??= []).push(r.ly_gm);
      if (r.lly_gm != null) (llyByCh[r.channel] ??= []).push(r.lly_gm);
    });
    return Object.entries(wpByCh).map(([ch, gms]) => {
      const wp  = avg(gms);
      const ly  = lyByCh[ch]?.length  ? avg(lyByCh[ch])  : null;
      const lly = llyByCh[ch]?.length ? avg(llyByCh[ch]) : null;
      return { label: ch,
        wp_gm: wp, ly_gm: ly, lly_gm: lly,
        vs_ly:  wp != null && ly  != null ? +(wp - ly ).toFixed(1) : null,
        vs_lly: wp != null && lly != null ? +(wp - lly).toFixed(1) : null };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [entries, products, vintageRows]);

  // ── Summary KPIs ─────────────────────────────────────────────────────
  const overallWp  = avg(deptData.map(d => d.wp_gm).filter(Boolean));
  const overallLy  = avg(deptData.map(d => d.ly_gm).filter(Boolean));
  const overallLly = avg(deptData.map(d => d.lly_gm).filter(Boolean));

  if (!open) return null;

  const tableRows = view === 'dept' ? deptData : view === 'class' ? classData : channelData;
  const VIEW_LABEL = { dept: 'Department', class: 'Class', channel: 'Channel' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0"
          style={{ background: 'linear-gradient(100deg, #0C2448 0%, #12305E 55%, #0C2448 100%)' }}>
          <div>
            <h2 className="text-[16px] font-bold text-white tracking-tight">Year-Over-Year GM% Comparison</h2>
            <p className="text-white/55 text-[11.5px] mt-0.5">Working Plan vs Last Year (LY) vs Last Last Year (LLY)</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* KPI strip */}
        {!loading && (overallWp || overallLy) && (
          <div className="flex items-stretch divide-x divide-neutral-100 border-b border-neutral-100 flex-shrink-0">
            {[
              { label: 'Current WP GM%', value: fmt(overallWp),  color: '#5B8DD9', desc: 'Avg across all entries' },
              { label: 'Last Year GM%',  value: fmt(overallLy),  color: '#7EC8A4', desc: 'Avg LY across all departments' },
              { label: 'LLY GM%',        value: fmt(overallLly), color: '#B8A5D4', desc: 'Avg LLY across all departments' },
              {
                label: 'Δ vs LY',
                value: overallWp && overallLy ? fmtDelta(+(overallWp - overallLy).toFixed(1)) : '—',
                color: overallWp && overallLy ? (overallWp > overallLy ? '#10b981' : '#ef4444') : '#71717A',
                desc: 'Overall WP vs LY variance',
              },
            ].map((kpi) => (
              <div key={kpi.label} className="flex-1 px-5 py-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 mb-1">
                  {kpi.label}{kpi.sample && <span className="ml-1 text-[8.5px] italic opacity-70">sample</span>}
                </p>
                <p className="text-[22px] font-bold tabular-nums leading-none" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">{kpi.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* View toggle */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-neutral-100 flex-shrink-0 bg-neutral-50/50">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">View by</span>
          <div className="flex bg-white border border-neutral-200 rounded-lg p-0.5 shadow-xs">
            {[['dept', 'Department'], ['class', 'Class'], ['channel', 'Channel']].map(([id, label]) => (
              <button key={id} onClick={() => setView(id)}
                className={`px-4 py-1.5 text-[11.5px] font-semibold rounded-md transition-all ${
                  view === id ? 'bg-[#12305E] text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <span className="ml-auto text-[10px] text-neutral-400 italic">
            {view === 'channel' ? 'Avg GM% per channel' : `Avg GM% per ${VIEW_LABEL[view].toLowerCase()}`}
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-neutral-400">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <span className="text-[13px]">Loading comparison data…</span>
            </div>
          ) : tableRows.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-neutral-400 text-[13px]">
              No data available — submit entries in Promo Details to populate.
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-neutral-200">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-primary-50 border-b border-primary-100">
                      <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-primary-600 font-semibold rounded-tl-xl">
                        {VIEW_LABEL[view]}
                      </th>
                      {view === 'class' && (
                        <th className="text-left py-3 px-4 text-[10px] uppercase tracking-wider text-primary-600 font-semibold">Department</th>
                      )}
                      <th className="text-right py-3 px-4 text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#5B8DD9' }}>WP GM%</th>
                      <th className="text-right py-3 px-4 text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#7EC8A4' }}>LY GM%</th>
                      <th className="text-right py-3 px-4 text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#B8A5D4' }}>
                        LLY GM%
                      </th>
                      <th className="text-right py-3 px-4 text-[10px] uppercase tracking-wider text-primary-600 font-semibold">Δ vs LY</th>
                      <th className="text-right py-3 px-4 text-[10px] uppercase tracking-wider text-primary-600 font-semibold rounded-tr-xl">Δ vs LLY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {tableRows.map((row) => (
                      <tr key={row.label} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-neutral-800">{row.label}</td>
                        {view === 'class' && (
                          <td className="py-2.5 px-4 text-[11px] text-neutral-400">{row.sublabel ?? '—'}</td>
                        )}
                        <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums" style={{ color: '#5B8DD9' }}>{fmt(row.wp_gm)}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums" style={{ color: '#5EB88A' }}>{fmt(row.ly_gm)}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums" style={{ color: '#9B82C8' }}>{fmt(row.lly_gm)}</td>
                        <td className={`py-2.5 px-4 text-right font-mono font-semibold tabular-nums ${varColor(row.vs_ly)} ${varBg(row.vs_ly)}`}>{fmtDelta(row.vs_ly)}</td>
                        <td className={`py-2.5 px-4 text-right font-mono font-semibold tabular-nums ${varColor(row.vs_lly)} ${varBg(row.vs_lly)}`}>{fmtDelta(row.vs_lly)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>


              {/* Legend */}
              <div className="flex items-center gap-4 text-[10px] text-neutral-500 flex-wrap pt-1">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success-50 border border-success-300 inline-block" />WP above (&gt;+1 pp)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-neutral-50 border border-neutral-200 inline-block" />Within ±1 pp</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-danger-50 border border-danger-200 inline-block" />WP below (&lt;−1 pp)</span>
                <span className="ml-auto italic text-[9.5px] text-neutral-300">LY · LLY are prior-year actuals</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


