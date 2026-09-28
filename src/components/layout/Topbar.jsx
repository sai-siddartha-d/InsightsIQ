// src/components/layout/Topbar.jsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSidebar } from '../../context/SidebarContext';
import { useBrand } from '../../context/BrandContext';
import { useRegion } from '../../context/RegionContext';


function BrandAvatar({ brand, size = 'sm' }) {
  const [imgFailed, setImgFailed] = useState(false);
  const dim = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  const gradient = brand.configured
    ? 'bg-gradient-to-br from-primary-500 to-primary-700'
    : 'bg-gradient-to-br from-neutral-400 to-neutral-500';

  if (brand.logo && !imgFailed) {
    return (
      <div className={`${dim} rounded-md overflow-hidden flex-shrink-0 bg-white border border-neutral-100 flex items-center justify-center`}>
        <img
          src={brand.logo}
          alt={brand.label}
          className="w-full h-full object-contain p-0.5"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-md flex items-center justify-center ${textSize} font-bold text-white flex-shrink-0 ${gradient}`}>
      {brand.label.charAt(0)}
    </div>
  );
}

function BrandSwitcher({ currentBrand, selectBrand, brands }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-2.5 h-9 rounded-lg border transition-all duration-150 group min-w-[155px] ${
          open
            ? 'border-primary-400 bg-primary-100 shadow-sm'
            : 'border-primary-200 bg-primary-50 hover:border-primary-300 hover:bg-primary-100 hover:shadow-sm'
        }`}
      >
        {/* "Brand" label with icon */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="flex-shrink-0 text-primary-500">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-wide leading-none flex-shrink-0 text-primary-500">
          Brand
        </span>

        {/* Divider */}
        <div className="w-px h-3.5 bg-primary-200 flex-shrink-0 mx-0.5" />

        {/* Brand logo */}
        <BrandAvatar brand={currentBrand} size="sm" />

        {/* Brand name */}
        <span className="text-[12px] font-semibold leading-none text-primary-800 flex-1 min-w-0 truncate">
          {currentBrand.label}
        </span>

        {/* Warning dot for unconfigured */}
        {!currentBrand.configured && (
          <span className="w-1.5 h-1.5 rounded-full bg-warning-500 flex-shrink-0" />
        )}

        {/* Chevron */}
        <svg
          className={`flex-shrink-0 transition-transform duration-150 text-primary-400 ${open ? 'rotate-180' : ''}`}
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-neutral-200 rounded-xl shadow-float z-30 py-1.5 overflow-hidden animate-fade-in">
          <div className="px-3 pt-1 pb-2 border-b border-neutral-100 mb-1">
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Switch Brand</p>
          </div>
          {brands.map(b => (
            <button
              key={b.id}
              onClick={() => { selectBrand(b.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 ${
                b.id === currentBrand.id
                  ? 'bg-primary-50 hover:bg-primary-100'
                  : 'hover:bg-neutral-50'
              }`}
            >
              {/* Item logo */}
              <BrandAvatar brand={b} size="md" />

              {/* Item label */}
              <div className="flex-1 min-w-0">
                <p className={`text-[12px] font-medium leading-tight ${
                  b.id === currentBrand.id ? 'text-primary-700' : 'text-neutral-700'
                }`}>
                  {b.label}
                </p>
                {!b.configured && (
                  <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">Not configured</p>
                )}
              </div>

              {/* Active checkmark */}
              {b.id === currentBrand.id && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-primary-500 flex-shrink-0">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


function RegionSwitcher({ currentRegion, selectRegion, regions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-2.5 h-9 rounded-lg border transition-all duration-150 group min-w-[155px] ${
          open
            ? 'border-primary-400 bg-primary-100 shadow-sm'
            : 'border-primary-200 bg-primary-50 hover:border-primary-300 hover:bg-primary-100 hover:shadow-sm'
        }`}
      >
        {/* "Region" label with globe icon */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="flex-shrink-0 text-primary-500">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-wide leading-none flex-shrink-0 text-primary-500">
          Region
        </span>

        {/* Divider */}
        <div className="w-px h-3.5 bg-primary-200 flex-shrink-0 mx-0.5" />

        <span className="text-[13px] leading-none">{currentRegion.flag}</span>
        <span className="text-[12px] font-semibold leading-none text-primary-800 flex-1 min-w-0 truncate">
          {currentRegion.label}
        </span>
        <svg
          className={`flex-shrink-0 transition-transform duration-150 text-primary-400 ${open ? 'rotate-180' : ''}`}
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-neutral-200 rounded-xl shadow-float z-30 py-1.5 overflow-hidden animate-fade-in">
          <div className="px-3 pt-1 pb-2 border-b border-neutral-100 mb-1">
            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Region</p>
          </div>
          {regions.map(r => (
            <button
              key={r.id}
              onClick={() => { selectRegion(r.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                r.id === currentRegion.id ? 'bg-primary-50' : 'hover:bg-neutral-50'
              }`}
            >
              <span className="text-[13px]">{r.flag}</span>
              <span className={`text-[12px] font-medium flex-1 ${r.id === currentRegion.id ? 'text-primary-700' : 'text-neutral-700'}`}>
                {r.label}
              </span>
              {r.id === currentRegion.id && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="text-primary-500">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


export default function Topbar({ breadcrumb, onInsightsAssist }) {
  const { user } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const { currentBrand, selectBrand, brands } = useBrand();
  const { currentRegion, selectRegion, regions } = useRegion();

  return (
    <header className="h-14 border-b border-neutral-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-6">
      {/* Left cluster — collapse toggle + breadcrumb */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 3v18" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
        <div className="flex items-center gap-1.5 text-[13px]">
          {breadcrumb?.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-neutral-300">/</span>}
              <span className={i === breadcrumb.length - 1 ? 'text-neutral-900 font-medium' : 'text-neutral-500'}>
                {crumb}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Brand + Region filters — grouped for tour targeting */}
        <div data-tour="topbar-filters" className="flex items-center gap-2.5">
          <BrandSwitcher
            currentBrand={currentBrand}
            selectBrand={selectBrand}
            brands={brands}
          />

          <div className="w-px h-5 bg-neutral-200" />

          <RegionSwitcher
            currentRegion={currentRegion}
            selectRegion={selectRegion}
            regions={regions}
          />
        </div>

        <div className="w-px h-5 bg-neutral-200" />

        {/* Insights Assist button */}
        <button
          data-tour="insights-assist-btn"
          onClick={onInsightsAssist}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 hover:border-primary-300 transition-all text-[12px] font-medium"
          title="Open Insights Assist panel"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          Insights Assist
        </button>

        <div className="w-px h-5 bg-neutral-200" />

        {/* Notification bell */}
        <button className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="w-px h-5 bg-neutral-200 mx-0.5" />

        {/* User chip */}
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="text-[12px] text-neutral-600">{user?.name}</span>
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-[10px] font-semibold text-white">
            {user?.name?.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}
