// src/components/ui/Skeleton.jsx
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 bg-[length:200%_100%] animate-shimmer rounded-md ${className}`}
    />
  );
}