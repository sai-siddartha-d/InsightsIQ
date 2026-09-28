// src/components/ui/PageHeader.jsx
export default function PageHeader({ title, subtitle, badge, actions }) {
  return (
    <div className="mb-7">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="text-sm text-neutral-600">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}