// src/components/ui/Input.jsx
export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
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
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={
          'px-3 py-2 text-sm bg-white border rounded-md transition-colors ' +
          'placeholder:text-gray-400 ' +
          'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 ' +
          (error ? 'border-danger' : 'border-surface-border')
        }
        {...rest}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}