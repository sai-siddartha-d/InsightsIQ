// src/pages/LandingPage.jsx
import ModuleCard from '../components/ui/ModuleCard';
import PageHeader from '../components/layout/PageHeader';
import { MODULES } from '../utils/constants';
import { useAuth } from '../hooks/useAuth';

export default function LandingPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}.`}
        subtitle="Choose a module to begin your planning workflow."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {MODULES.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>

      <div className="mt-10 p-6 bg-primary-50 border border-primary-100 rounded-lg">
        <h3 className="text-sm font-semibold text-primary-800">New here?</h3>
        <p className="text-sm text-gray-600 mt-1">
          Start with the <strong>Pempal</strong> module to explore in-season promotional planning. Krypton and Simple Suite are coming soon.
        </p>
      </div>
    </div>
  );
}