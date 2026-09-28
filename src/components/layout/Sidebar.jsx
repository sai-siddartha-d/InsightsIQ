// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from '../../context/SidebarContext';
import FeedbackModal from '../ui/FeedbackModal';


const NAV_ITEMS = [
  { label: 'Dashboard',    path: '/',                     icon: DashboardIcon },
  { label: 'Krypton',      path: '/modules/krypton',      icon: KryptonIcon  },
  { label: 'Simple Suite', path: '/modules/simple-suite', icon: SuiteIcon    },
  { label: 'Pempal',       path: '/modules/pempal',       icon: PempalIcon, live: true, tourId: 'sidebar-pempal' },
];


// Emitted via CustomEvent so PempalPage can start the tour without prop drilling
function emitStartTour() {
  window.dispatchEvent(new CustomEvent('pempal:start-tour'));
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const navigate = useNavigate();
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [feedbackOpen,  setFeedbackOpen]  = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const width = collapsed ? 'w-14' : 'w-60';

  return (
    <aside
      data-tour="sidebar"
      className={`${width} bg-gradient-to-b from-[#12305E] to-[#0C2448] flex flex-col h-screen sticky top-0 border-r border-white/10 transition-[width] duration-200 ease-smooth z-30`}
    >
      {/* Brand + collapse toggle */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-3 py-3.5 border-b border-white/10`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-pop shrink-0">
              <span className="text-white text-sm font-bold tracking-tight">I</span>
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[13px] font-semibold text-white tracking-tight">InsightsIQ</span>
              <span className="text-[10px] text-white/35">Planning Platform</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-pop">
            <span className="text-white text-sm font-bold">I</span>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={toggle}
            className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded-md"
            title="Collapse sidebar"
          >
            <ChevronLeftIcon />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={toggle}
          className="mx-2 mt-2 p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-md flex items-center justify-center"
          title="Expand sidebar"
        >
          <ChevronRightIcon />
        </button>
      )}

      {/* Search trigger (only when expanded) */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-2xs text-white/50 hover:text-white bg-white/10 hover:bg-white/15 rounded-md border border-white/15 transition-all">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="flex-1 text-left">Search…</span>
            <kbd className="text-[9px] font-mono px-1 py-px bg-white/10 text-white/40 rounded border border-white/15">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Nav */}
      <nav data-tour="sidebar-nav" className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <p className="px-2.5 mt-2 mb-1.5 text-[9px] uppercase tracking-[0.08em] text-white/35 font-semibold">
            Workspace
          </p>
        )}
        <div className="space-y-0.5">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={collapsed ? item.label : undefined}
              {...(item.tourId ? { 'data-tour': item.tourId } : {})}
              className={({ isActive }) =>
                `group relative flex items-center ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5'} py-2 rounded-md text-[13px] font-medium transition-all ` +
                (isActive
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'text-white/55 hover:bg-white/10 hover:text-white')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className={`absolute ${collapsed ? 'left-0' : 'left-0'} top-1.5 bottom-1.5 w-0.5 bg-accent-400 rounded-r`} />
                  )}
                  <item.icon active={isActive} />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.live && (
                        <span className="flex items-center gap-1 px-1 py-0.5 rounded bg-success-500/15 border border-success-500/30">
                          <span className="w-1 h-1 rounded-full bg-success-500 animate-pulse-soft" />
                          <span className="text-[9px] uppercase tracking-wide text-success-500 font-semibold">Live</span>
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.live && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse-soft" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {!collapsed && (
          <>
            <p className="px-2.5 mt-6 mb-1.5 text-[9px] uppercase tracking-[0.08em] text-white/35 font-semibold">
              Resources
            </p>
            <a href="#" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-white/55 hover:bg-white/10 hover:text-white">
              <DocsIcon /> Documentation
            </a>
            <a href="#" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-white/55 hover:bg-white/10 hover:text-white">
              <HelpIcon /> Support
            </a>
            <button
              onClick={() => setFeedbackOpen(true)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-white/55 hover:bg-white/10 hover:text-white text-left"
            >
              <FeedbackIcon /> Feedback
            </button>
            <button
              onClick={emitStartTour}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-white/55 hover:bg-white/10 hover:text-white text-left"
            >
              <TourIcon /> Take a Tour
            </button>
          </>
        )}
        {collapsed && (
          <>
            <button
              onClick={() => setFeedbackOpen(true)}
              title="Feedback"
              className="w-full flex items-center justify-center py-2 rounded-md text-white/55 hover:bg-white/10 hover:text-white mt-1"
            >
              <FeedbackIcon />
            </button>
            <button
              onClick={emitStartTour}
              title="Take a Tour"
              className="w-full flex items-center justify-center py-2 rounded-md text-white/55 hover:bg-white/10 hover:text-white"
            >
              <TourIcon />
            </button>
          </>
        )}
      </nav>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* User */}
      <div className="relative border-t border-white/10 p-2">
        <button
          onClick={() => setMenuOpen(o => !o)}
          title={collapsed ? user?.name : undefined}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-2'} py-2 rounded-md hover:bg-white/10 transition-colors text-left`}
        >
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-[11px] font-semibold text-white shadow-sm shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-white truncate leading-tight">{user?.name || 'User'}</p>
                <p className="text-[10px] text-white/35 truncate leading-tight">{user?.role || 'Member'}</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`text-white/35 transition-transform ${menuOpen ? 'rotate-180' : ''}`}>
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
        </button>

        {menuOpen && !collapsed && (
          <div className="absolute left-2 right-2 bottom-[calc(100%+4px)] bg-[#071436] border border-white/15 rounded-lg shadow-high overflow-hidden animate-fade-in-up">
            <div className="px-3 py-2.5 border-b border-white/10">
              <p className="text-[11px] text-white/40">Signed in as</p>
              <p className="text-[12px] text-white truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-3 py-2 text-left text-[12px] text-white/60 hover:bg-white/10 hover:text-white flex items-center gap-2"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}


// ─── Icons ────────────────────────────────────────────────────────────
function iconClass(active) {
  return active ? 'text-accent-400' : 'text-white/40 group-hover:text-white/70';
}
function DashboardIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={iconClass(active)}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
function KryptonIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={iconClass(active)}>
      <path d="M12 2L20 7V17L12 22L4 17V7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}
function SuiteIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={iconClass(active)}>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M3 9H21M9 4V20" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
function PempalIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={iconClass(active)}>
      <path d="M12 2L22 8.5V15.5L12 22L2 15.5V8.5L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M12 11V22M22 8.5L12 15L2 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}
function DocsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-white/40">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function HelpIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-white/40">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function FeedbackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-white/40">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function TourIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-white/40">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}