// src/components/ui/ExportPptModal.jsx
import { useState } from 'react';

export default function ExportPptModal({ onClose, onExport, activeChannel, activePeriodLabel }) {
  const [scope, setScope]     = useState('current');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await onExport(scope);
    } catch (err) {
      console.error('[ExportPpt] generation failed:', err);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-high w-full max-w-md mx-4 overflow-hidden animate-scale-in">

        {/* Header */}
        <div className="bg-primary-600 px-6 py-4">
          <h2 className="text-white font-semibold text-[15px]">Export Pempal Report</h2>
          <p className="text-primary-200 text-[12px] mt-0.5">Choose what to include in the PowerPoint</p>
        </div>

        {/* Scope options */}
        <div className="p-5 space-y-3">
          <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            scope === 'current' ? 'border-primary-600 bg-primary-50' : 'border-neutral-200 hover:border-primary-200'
          }`}>
            <input
              type="radio" name="scope" value="current"
              checked={scope === 'current'} onChange={() => setScope('current')}
              className="mt-0.5 accent-primary-600"
            />
            <div>
              <p className="text-[13px] font-semibold text-neutral-900">Current selection</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">{activeChannel} · {activePeriodLabel}</p>
            </div>
          </label>

          <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            scope === 'full' ? 'border-primary-600 bg-primary-50' : 'border-neutral-200 hover:border-primary-200'
          }`}>
            <input
              type="radio" name="scope" value="full"
              checked={scope === 'full'} onChange={() => setScope('full')}
              className="mt-0.5 accent-primary-600"
            />
            <div>
              <p className="text-[13px] font-semibold text-neutral-900">Full report</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">All channels · All periods</p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-end gap-3">
          <button
            onClick={onClose} disabled={loading}
            className="px-4 py-2 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleExport} disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white text-[13px] font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Export .pptx
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
