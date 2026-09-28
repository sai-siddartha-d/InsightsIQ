// src/components/layout/AppLayout.jsx
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import InsightsAssistPanel from '../ui/InsightsAssistPanel';
import { InsightsProvider } from '../../context/InsightsContext';
import { MODULES } from '../../utils/constants';


function getBreadcrumb(pathname) {
  if (pathname === '/') return ['Dashboard'];
  const moduleMatch = pathname.match(/^\/modules\/(.+)$/);
  if (moduleMatch) {
    const mod = MODULES.find(m => m.path === pathname);
    return ['Modules', mod?.name || 'Module'];
  }
  return ['Page'];
}


export default function AppLayout() {
  const { pathname } = useLocation();
  const [insightsOpen, setInsightsOpen] = useState(false);

  return (
    <InsightsProvider>
      <div className="min-h-screen bg-neutral-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            breadcrumb={getBreadcrumb(pathname)}
            onInsightsAssist={() => setInsightsOpen(true)}
          />
          <main className="flex-1 overflow-x-hidden">
            <div className="px-7 py-7 max-w-[1600px] mx-auto animate-fade-in-up">
              <Outlet />
            </div>
          </main>
        </div>
        <InsightsAssistPanel
          open={insightsOpen}
          onClose={() => setInsightsOpen(false)}
          pathname={pathname}
        />
      </div>
    </InsightsProvider>
  );
}