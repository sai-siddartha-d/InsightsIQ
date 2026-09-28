// src/components/ui/Badge.jsx
const VARIANTS = {
  default: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  primary: 'bg-primary-50 text-primary-700 border-primary-100',
  accent:  'bg-accent-50 text-accent-700 border-accent-100',
  success: 'bg-success-50 text-success-700 border-success-500/20',
  warning: 'bg-warning-50 text-warning-700 border-warning-500/20',
  danger:  'bg-danger-50 text-danger-700 border-danger-500/20',
  info:    'bg-info-50 text-info-700 border-info-500/20',
  dark:    'bg-neutral-900 text-white border-neutral-900',
};

const SIZES = {
  xs: 'px-1.5 py-0   text-[10px]',
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2   py-0.5 text-[11px]',
  lg: 'px-2.5 py-1   text-xs',
};


export default function Badge({
  children, variant = 'default', size = 'md',
  dot = false, className = '',
}) {
  return (
    <span className={
      `inline-flex items-center gap-1 font-medium rounded border ` +
      `${VARIANTS[variant]} ${SIZES[size]} ${className}`
    }>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}