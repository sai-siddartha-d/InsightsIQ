// src/components/ui/Select.jsx
export default function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  required = false,
  className = '',
  ...rest
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-accent-400 ml-0.5">*</span>}
        </label>
      )}
      <select
        value={value || ''}
        onChange={onChange}
        className={
          'px-3 py-2 text-sm bg-white border border-surface-border rounded-md ' +
          'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 ' +
          'transition-colors'
        }
        {...rest}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}