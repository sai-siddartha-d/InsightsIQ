// src/components/ui/Button.jsx
const VARIANTS = {
  primary:   'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow',
  secondary: 'bg-white text-neutral-900 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 shadow-xs',
  accent:    'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-sm hover:shadow',
  ghost:     'text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200',
  danger:    'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-700 shadow-sm',
  outline:   'bg-transparent text-primary-700 border border-primary-200 hover:border-primary-400 hover:bg-primary-50',
  dark:      'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm',
};

const SIZES = {
  xs: 'h-7  px-2.5 text-2xs gap-1',
  sm: 'h-8  px-3   text-xs  gap-1.5',
  md: 'h-9  px-3.5 text-sm  gap-1.5',
  lg: 'h-10 px-4   text-sm  gap-2',
  xl: 'h-11 px-5   text-base gap-2',
};


export default function Button({
  children, variant = 'primary', size = 'md', type = 'button',
  onClick, disabled = false, loading = false,
  leftIcon, rightIcon, className = '', ...rest
}) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-md ' +
    'transition-all duration-150 ease-smooth ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'focus-visible:shadow-glow-primary focus-visible:outline-none ' +
    'whitespace-nowrap select-none';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}


function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
    </svg>
  );
}