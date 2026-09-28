// src/pages/modules/pempal/PeriodManager.jsx
import { useState } from 'react';
import Button from '../../../../components/ui/Button';
import Badge from '../../../../components/ui/Badge';
import { pempalApi } from '../../../../services/api';


export default function PeriodManager({ periods, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ label: '', type: 'Standard', start_date: '', end_date: '' });

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await pempalApi.createPeriod(form);
      setForm({ label: '', type: 'Standard', start_date: '', end_date: '' });
      setShowForm(false);
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (periodId) => {
    if (!confirm(`Delete period ${periodId}? Any entries for this period will also be deleted.`)) return;
    try {
      await pempalApi.deletePeriod(periodId);
      onChange();
    } catch (err) {
      alert(err.message);
    }
  };

  // Get today's date in YYYY-MM-DD for the date input min
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-xl border border-neutral-200/80 shadow-card overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            className={`text-neutral-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          >
            <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="text-left">
            <h3 className="text-[13px] font-semibold text-neutral-900">Promotional periods</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {periods.length} active {periods.length === 1 ? 'period' : 'periods'}
              {' · '}
              {periods.filter(p => p.type === 'TOD').length} TOD
              {' · '}
              {periods.filter(p => p.type === 'Standard').length} Standard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expanded && !showForm && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => { e.stopPropagation(); setShowForm(true); }}
              leftIcon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              }
            >
              New period
            </Button>
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-neutral-100 p-4 animate-fade-in-down">
          {/* Existing periods */}
          {periods.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
              {periods.map(p => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-md border border-neutral-200/60 group">
                  <Badge variant={p.type === 'TOD' ? 'accent' : 'default'} size="sm">
                    {p.id}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-neutral-900 truncate">{p.label}</p>
                    <p className="text-[10px] text-neutral-500">{p.type}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-all"
                    title="Delete period"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New period form */}
          {showForm && (
            <form onSubmit={handleCreate} className="bg-primary-50/50 border border-primary-200 rounded-md p-3 animate-fade-in-down">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold mb-1 block">
                    Label
                  </label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="e.g. Apr 1 – Apr 5"
                    required minLength={3}
                    className="w-full h-8 px-2 text-xs bg-white border border-neutral-300 rounded-md focus:outline-none focus:border-primary-400 focus:shadow-glow-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold mb-1 block">
                    Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full h-8 px-2 text-xs bg-white border border-neutral-300 rounded-md focus:outline-none focus:border-primary-400"
                  >
                    <option value="Standard">Standard</option>
                    <option value="TOD">TOD</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold mb-1 block">
                    Start
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    min={today}
                    required
                    className="w-full h-8 px-2 text-xs bg-white border border-neutral-300 rounded-md focus:outline-none focus:border-primary-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold mb-1 block">
                    End
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    min={form.start_date || today}
                    required
                    className="w-full h-8 px-2 text-xs bg-white border border-neutral-300 rounded-md focus:outline-none focus:border-primary-400"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-2 px-2 py-1.5 bg-danger-50 border border-danger-500/30 rounded-md text-[11px] text-danger-700">
                  {error}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowForm(false); setError(''); }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={submitting}>
                  Create period
                </Button>
              </div>
            </form>
          )}

          {periods.length === 0 && !showForm && (
            <p className="text-center text-[12px] text-neutral-500 py-4">
              No promotional periods. Click "New period" to add one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}