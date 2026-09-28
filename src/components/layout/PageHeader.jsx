// src/components/layout/PageHeader.jsx
export default function PageHeader({ title, subtitle, breadcrumb, actions }) {
  return (
    <div className="mb-6">
      {breadcrumb && (
        <p className="text-xs text-gray-500 mb-1">{breadcrumb}</p>
      )}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}