// src/components/ui/ColumnSortFilter.jsx
import { useState, useRef, useEffect } from 'react';

/**
 * Renders a clickable column header with sort + optional checkbox-filter dropdown.
 *
 * Props:
 *   label        string         — column header text
 *   sortKey      string         — key used for sort callbacks (matches row field name)
 *   activeSort   {col,dir}|null — currently active sort (null = no sort)
 *   onSort       (col,dir)=>v   — called when user picks a sort direction
 *   filterValues string[]       — all unique values for the filter checkboxes
 *   activeFilter Set<string>    — currently selected filter values (empty = show all)
 *   onFilter     (col,Set)=>v   — called when user applies filter
 *   sortOnly     boolean        — when true, hides the filter section (default false)
 */
export default function ColumnSortFilter({
  label,
  sortKey,
  activeSort = null,
  onSort,
  filterValues = [],
  activeFilter = new Set(),
  onFilter,
  sortOnly = false,
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const [draft, setDraft]   = useState(() => new Set(activeFilter));
  const ref = useRef(null);

  // Serialize the Set to a stable string primitive so useEffect doesn't
  // re-fire when the parent passes `new Set()` (new reference, same content).
  const filterKey = [...activeFilter].sort().join('\0');

  // Sync draft when the filter content actually changes (not just the reference)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setDraft(new Set(activeFilter)); }, [filterKey]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
        setDraft(new Set(activeFilter));  // discard uncommitted draft
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filterKey]);

  const currentDir  = activeSort?.col === sortKey ? activeSort.dir : null;
  const hasFilter   = activeFilter.size > 0;
  const visibleVals = filterValues.filter(v =>
    v.toLowerCase().includes(search.toLowerCase())
  );

  const toggleDraft = (val) => {
    const next = new Set(draft);
    next.has(val) ? next.delete(val) : next.add(val);
    setDraft(next);
  };

  const apply = () => {
    onFilter?.(sortKey, draft);
    setOpen(false);
    setSearch('');
  };

  const clear = () => {
    const empty = new Set();
    setDraft(empty);
    onFilter?.(sortKey, empty);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {/* Clickable header trigger — wide enough to click, icons large enough to see */}
      <button
        type="button"
        className="flex items-center gap-2 cursor-pointer select-none group px-2 py-1 -mx-2 rounded-md hover:bg-primary-100 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-[11px] font-bold text-primary-700 uppercase tracking-wide whitespace-nowrap">
          {label}
        </span>
        {/* Sort indicator — 14px, clearly visible */}
        {currentDir === 'asc'  && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary-600 flex-shrink-0">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        )}
        {currentDir === 'desc' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-primary-600 flex-shrink-0">
            <path d="M12 5v14M19 12l-7 7-7-7"/>
          </svg>
        )}
        {!currentDir && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary-400 group-hover:text-primary-600 transition-colors flex-shrink-0">
            <path d="M8 9l4-4 4 4M16 15l-4 4-4-4"/>
          </svg>
        )}
        {/* Active filter pill */}
        {hasFilter && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-600 text-white text-[9px] font-bold flex-shrink-0">
            {activeFilter.size}
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary-400 flex-shrink-0">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Dropdown popup */}
      {open && (
        <div
          className="absolute top-full left-0 z-30 mt-1 w-52 bg-white border border-primary-100 rounded-xl shadow-pop overflow-hidden animate-scale-in"
          onClick={e => e.stopPropagation()}
        >
          {/* Sort section */}
          <div className="p-2">
            <p className="text-[9px] font-semibold text-primary-400 uppercase tracking-wider px-1 mb-1.5">Sort</p>
            <button
              onClick={() => { onSort?.(sortKey, 'asc'); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-left transition-colors ${
                currentDir === 'asc'
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              ▲ A → Z
            </button>
            <button
              onClick={() => { onSort?.(sortKey, 'desc'); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-left transition-colors ${
                currentDir === 'desc'
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              ▼ Z → A
            </button>
          </div>

          {/* Filter section — hidden when sortOnly */}
          {!sortOnly && filterValues.length > 0 && (
            <>
              <div className="h-px bg-primary-50 mx-2" />
              <div className="p-2">
                <p className="text-[9px] font-semibold text-primary-400 uppercase tracking-wider px-1 mb-1.5">Filter</p>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full border border-primary-100 rounded-md px-2 py-1 text-[11px] mb-1.5 focus:outline-none focus:border-primary-300 bg-white"
                />
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {visibleVals.map(v => (
                    <label
                      key={v}
                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-neutral-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={draft.has(v)}
                        onChange={() => toggleDraft(v)}
                        className="accent-primary-600 w-3 h-3 flex-shrink-0"
                      />
                      <span className="text-[11px] text-neutral-700">{v}</span>
                    </label>
                  ))}
                  {visibleVals.length === 0 && (
                    <p className="text-[10px] text-neutral-400 px-1 py-1">No results</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 px-2 pb-2 pt-1">
                <button
                  onClick={apply}
                  className="flex-1 bg-primary-600 text-white text-[11px] font-semibold rounded-md py-1.5 hover:bg-primary-700 transition-colors"
                >
                  Apply
                </button>
                {(hasFilter || draft.size > 0) && (
                  <button
                    onClick={clear}
                    className="text-[10px] text-primary-400 hover:text-primary-600 transition-colors whitespace-nowrap"
                  >
                    Clear
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
