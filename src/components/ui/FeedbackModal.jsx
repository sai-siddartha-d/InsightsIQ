// src/components/ui/FeedbackModal.jsx
import { useState } from 'react';
import { createPortal } from 'react-dom';

const TOOLS = ['PEMPAL', 'Krypton', 'Simple Suite'];
const BRANDS = ['Athleta', 'Gap', 'Old Navy', 'Banana Republic'];
const PAGES = [
  'Dashboard',
  'PEMPAL — Summary',
  'PEMPAL — Promo Details',
  'PEMPAL — TOD',
  'PEMPAL — Audit',
  'PEMPAL — Marketed Rollup',
  'PEMPAL — Fiscal Time',
  'PEMPAL — Hierarchy',
  'PEMPAL — Season Code',
  'Krypton',
  'Simple Suite',
  'Other',
];
const TYPES = ['Bug / Error', 'Feature Request', 'Data Issue', 'UI / Design', 'Performance', 'General Feedback'];

function Label({ children }) {
  return <p className="text-[10.5px] font-semibold text-neutral-600 mb-1">{children}</p>;
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-8 pl-2.5 pr-7 text-[11.5px] text-neutral-700 bg-white border border-neutral-200 rounded-lg appearance-none focus:outline-none focus:border-primary-400 transition-colors"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
    </div>
  );
}

export default function FeedbackModal({ open, onClose }) {
  const [form, setForm] = useState({ tool: '', brand: '', page: '', type: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800)); // simulate submit
    setSubmitting(false);
    setSubmitted(true);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSubmitted(false);
      setForm({ tool: '', brand: '', page: '', type: '', message: '' });
    }, 300);
  };

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999, width: 560,
          fontFamily: "'DM Sans', -apple-system, sans-serif",
        }}
      >
        <div className="bg-white rounded-2xl overflow-hidden animate-fade-in-up" style={{ boxShadow: '0 24px 64px -12px rgba(0,0,0,0.28), 0 8px 24px -4px rgba(0,0,0,0.12)' }}>
          {/* Header */}
          <div
            style={{ background: 'linear-gradient(135deg, #1B4F9C 0%, #163F82 60%, #112F68 100%)' }}
            className="flex items-center gap-3 px-6 py-5"
          >
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-white leading-tight">Submit Feedback</p>
              <p className="text-[11px] text-primary-200 mt-0.5">Help us improve InsightsIQ across all tools</p>
            </div>
            <button
              onClick={handleClose}
              style={{ cursor: 'pointer', background: 'none', border: 'none', padding: '6px', color: 'rgba(255,255,255,0.6)', display: 'flex', borderRadius: '6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {submitted ? (
            <div className="px-8 py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-neutral-800 mb-2">Feedback received!</p>
              <p className="text-[12.5px] text-neutral-500 leading-relaxed max-w-xs mx-auto">Thank you for helping us improve InsightsIQ. We'll review your feedback shortly.</p>
              <button
                onClick={handleClose}
                className="mt-6 px-6 py-2.5 text-[12.5px] font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tool / Module</Label>
                  <Select value={form.tool} onChange={v => set('tool', v)} options={TOOLS} placeholder="Select tool…" />
                </div>
                <div>
                  <Label>Brand</Label>
                  <Select value={form.brand} onChange={v => set('brand', v)} options={BRANDS} placeholder="Select brand…" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Specific Page</Label>
                  <Select value={form.page} onChange={v => set('page', v)} options={PAGES} placeholder="Select page…" />
                </div>
                <div>
                  <Label>Feedback Type</Label>
                  <Select value={form.type} onChange={v => set('type', v)} options={TYPES} placeholder="Select type…" />
                </div>
              </div>

              <div>
                <Label>Message <span className="text-danger-500">*</span></Label>
                <textarea
                  value={form.message}
                  onChange={e => set('message', e.target.value)}
                  placeholder="Describe what you observed, what you expected, or what could be improved…"
                  rows={5}
                  required
                  className="w-full px-3.5 py-2.5 text-[12px] text-neutral-700 bg-white border border-neutral-200 rounded-lg resize-none focus:outline-none focus:border-primary-400 transition-colors placeholder:text-neutral-300 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[10.5px] text-neutral-400">
                  <span className="text-danger-500">*</span> Required field
                </p>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-[12px] text-neutral-500 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!form.message.trim() || submitting}
                    className="flex items-center gap-1.5 px-5 py-2 text-[12px] font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        Submitting…
                      </>
                    ) : 'Submit Feedback'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
