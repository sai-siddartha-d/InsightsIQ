// src/components/ui/Table.jsx
export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-neutral-200 bg-white ${className}`}>
      <table className="min-w-full">{children}</table>
    </div>
  );
}

export function THead({ children }) {
  return (
    <thead className="bg-neutral-50/80 border-b border-neutral-200">
      {children}
    </thead>
  );
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-neutral-100">{children}</tbody>;
}

export function TR({ children, className = '' }) {
  return <tr className={`hover:bg-neutral-50/50 transition-colors ${className}`}>{children}</tr>;
}

export function TH({ children, className = '' }) {
  return (
    <th className={`px-4 py-2.5 text-left text-[11px] font-semibold text-neutral-600 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

export function TD({ children, className = '' }) {
  return <td className={`px-4 py-3 text-sm text-neutral-700 ${className}`}>{children}</td>;
}