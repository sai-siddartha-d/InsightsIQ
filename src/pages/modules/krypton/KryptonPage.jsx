// src/pages/modules/KryptonPage.jsx
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import Badge from '../../../components/ui/Badge';

export default function KryptonPage() {
  return (
    <div>
      <div className="mb-7">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Krypton</h1>
          <Badge>Coming Soon</Badge>
        </div>
        <p className="text-sm text-neutral-600">Pre-season investment-planning tool.</p>
      </div>
      <Card>
        <EmptyState
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          }
          title="Module not yet implemented"
          description="Krypton handles pre-season investment planning. The build for this module is scheduled for a future phase."
        />
      </Card>
    </div>
  );
}