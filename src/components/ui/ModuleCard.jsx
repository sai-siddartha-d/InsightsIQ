// src/components/ui/ModuleCard.jsx
import { useNavigate } from 'react-router-dom';
import Badge from './Badge';


export default function ModuleCard({ module }) {
  const navigate = useNavigate();
  const isActive = module.status === 'active';

  return (
    <button
      onClick={() => navigate(module.path)}
      className="hover-lift group text-left w-full bg-white rounded-xl border border-neutral-200/80 shadow-card hover:shadow-pop hover:border-neutral-300 transition-all duration-200 p-5"
    >
      <div className="flex items-start justify-between mb-5">
        <div className={
          'w-11 h-11 rounded-lg flex items-center justify-center text-lg font-bold transition-transform group-hover:scale-105 ' +
          (isActive
            ? 'bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-pop'
            : 'bg-neutral-100 text-neutral-500')
        }>
          {module.name.charAt(0)}
        </div>
        {isActive ? <Badge variant="success" dot>Live</Badge> : <Badge>Coming Soon</Badge>}
      </div>
      <h3 className="text-base font-semibold text-neutral-900 tracking-tight mb-1">{module.name}</h3>
      <p className="text-xs text-neutral-500 leading-relaxed mb-5 min-h-[2.25rem]">{module.description}</p>
      <div className="flex items-center text-xs font-medium text-neutral-600 group-hover:text-primary-700 transition-colors">
        <span>{isActive ? 'Open module' : 'View details'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="ml-1 group-hover:translate-x-1 transition-transform">
          <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}