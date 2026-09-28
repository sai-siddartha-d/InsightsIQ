// src/components/ui/EmptyState.jsx
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-14 px-6 bg-dotted rounded-lg">
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-white shadow-card border border-neutral-200/80 text-neutral-400 flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      {description && (
        <p className="text-xs text-neutral-500 mt-1.5 max-w-sm mx-auto leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}