// src/components/ui/Tabs.jsx
export function Tabs({ children, className = '' }) {
  return (
    <div className={`flex gap-1.5 flex-wrap ${className}`}>{children}</div>
  );
}


export function Tab({ active, onClick, children, count, ...rest }) {
  return (
    <button
      onClick={onClick}
      {...rest}
      className={
        'px-4 py-2 text-[12.5px] font-semibold transition-all rounded-full ' +
        'flex items-center gap-2 ' +
        (active
          ? 'bg-[#12305E] text-white shadow-md'
          : 'bg-[#DDE2EE] text-neutral-600 hover:bg-[#C4D3EC] hover:text-neutral-800')
      }
    >
      {children}
      {count !== undefined && count !== null && (
        <span className={
          'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 ' +
          'text-[10px] font-semibold rounded-full ' +
          (active ? 'bg-white/20 text-white' : 'bg-neutral-300 text-neutral-600')
        }>
          {count}
        </span>
      )}
    </button>
  );
}
