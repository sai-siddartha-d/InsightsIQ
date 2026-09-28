// src/pages/modules/pempal/PempalPage.jsx
import { useState, useCallback, useEffect } from 'react';
import { Tabs, Tab } from '../../../components/ui/Tabs';
import { useBrand } from '../../../context/BrandContext';
import { useInsights } from '../../../context/InsightsContext';
import PempalTour, { usePempalTour } from '../../../components/ui/PempalTour';
import PromoDetailsTab    from './tabs/PromoDetailsTab';
import AuditTab           from './tabs/AuditTab';
import SummaryTab         from './tabs/SummaryTab';
import FiscalTimeTab      from './tabs/FiscalTimeTab';
import HierarchyTab       from './tabs/HierarchyTab';
import MarketedRollupTab  from './tabs/MarketedRollupTab';
import SeasonCodeTab      from './tabs/SeasonCodeTab';
import YoyComparisonModal from './components/YoyComparisonModal';


const TAB_DEFS = [
  { id: 'summary',   label: 'Summary',          kind: 'Reporting'   },
  { id: 'promo',     label: 'Promo Details',     kind: 'Application' },
  { id: 'audit',     label: 'Audit',             kind: 'Reporting'   },
  { id: 'marketed',  label: 'Marketed Rollup',   kind: 'Reporting'   },
  { id: 'fiscal',    label: 'Fiscal Time',       kind: 'Reporting'   },
  { id: 'hier',      label: 'Hierarchy',         kind: 'Reporting'   },
  { id: 'season',    label: 'Season Code',       kind: 'Reporting'   },
];


// Prefixed with BASE_URL so the paths stay valid when the app is served from a
// repository sub-path (e.g. /<repository-name>/) rather than a domain root.
const asset = (file) => `${import.meta.env.BASE_URL}${file}`;

const BRAND_HERO_IMAGES = {
  'athleta':         asset('athleta-hero.jpg'),
  'gap':             asset('gap-portrait.jpg'),
  'old-navy':        asset('on-hero.jpg'),
  'banana-republic': asset('br-hero.jpg'),
};

export default function PempalPage() {
  const [activeTab,          setActiveTab]          = useState('summary');
  const [highlightedProduct, setHighlightedProduct] = useState(null);
  const [showYoyModal,       setShowYoyModal]       = useState(false);
  const { currentBrand, brandId } = useBrand();
  const { setTab } = useInsights();
  const tour = usePempalTour();

  useEffect(() => {
    setTab({ module: 'pempal', tab: activeTab });
    return () => setTab(null);
  }, [activeTab, setTab]);

  // Auto-start tour on first PEMPAL visit
  useEffect(() => {
    tour.startIfFirst();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Allow sidebar "Take a Tour" button to trigger tour via CustomEvent
  useEffect(() => {
    const handler = () => tour.start();
    window.addEventListener('pempal:start-tour', handler);
    return () => window.removeEventListener('pempal:start-tour', handler);
  }, [tour.start]);

  // `item` is an audit flag item: { product_id, channel, period_id } (channel /
  // period let Promo Details jump to the exact offending cell, not just STR).
  const navigateToProduct = useCallback((item) => {
    setHighlightedProduct(item);
    setActiveTab('promo');
  }, []);

  return (
    <div>
      <PempalTour
        active={tour.active}
        stepIndex={tour.stepIndex}
        onNext={tour.next}
        onPrev={tour.prev}
        onSkip={tour.skip}
      />

      {/* ── Themed Hero Header ────────────────────────────────────────────── */}
      <div
        data-tour="pempal-hero"
        className="relative mb-7 rounded-2xl overflow-hidden border border-[#1a3a6e]"
        style={{ background: 'linear-gradient(100deg, #0C2448 0%, #12305E 55%, #0C2448 100%)' }}
      >
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative px-7 py-8 flex items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <h1 className="text-2xl font-bold text-white tracking-tight leading-none">
                PEMPAL
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 text-white/90 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
                Live
              </span>
              {currentBrand && (
                <span className="text-[11px] font-medium text-white/60 ml-1">
                  · {currentBrand.label}
                </span>
              )}
            </div>
            <p className="text-white/65 text-[12px] max-w-lg leading-relaxed">
              Price Execution Management Pre-Approval Layer — in-season promotion planning.
            </p>
          </div>

          {/* YOY comparison button */}
          <button
            onClick={() => setShowYoyModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/35 text-white transition-all flex-shrink-0 group"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-75 group-hover:opacity-100">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <div className="text-left">
              <p className="text-[11px] font-semibold leading-none">YOY Comparison</p>
              <p className="text-[9.5px] text-white/55 mt-0.5 leading-none">WP · LY · LLY</p>
            </div>
          </button>
        </div>
      </div>

      <YoyComparisonModal open={showYoyModal} onClose={() => setShowYoyModal(false)} />

      {/* ── Brand not configured — empty state ─────────────────────────── */}
      {!currentBrand.configured ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-warning-50 border border-warning-200 flex items-center justify-center mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-warning-500">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className="text-base font-semibold text-neutral-700 mb-2">
            No configuration for {currentBrand.label}
          </h3>
          <p className="text-[12px] text-neutral-400 max-w-sm leading-relaxed">
            PEMPAL has not been set up for <span className="font-medium text-neutral-600">{currentBrand.label}</span> yet.
            Switch to <span className="font-medium text-primary-600">Athleta</span> or contact your administrator to configure this brand.
          </p>
        </div>
      ) : (
        <>
          <div data-tour="pempal-tabs">
            <Tabs className="mb-6">
              {TAB_DEFS.map(t => (
                <Tab
                  key={t.id}
                  active={activeTab === t.id}
                  onClick={() => setActiveTab(t.id)}
                  data-tour={`tab-${t.id}`}
                >
                  <span className={t.kind === 'Application' ? 'font-bold' : ''}>
                    {t.label}
                  </span>
                </Tab>
              ))}
            </Tabs>
          </div>

          <div key={activeTab} className="animate-fade-in-up">
            {activeTab === 'summary'  && <SummaryTab />}
            {activeTab === 'promo'    && (
              <PromoDetailsTab
                highlightedProduct={highlightedProduct}
                onHighlightConsumed={() => setHighlightedProduct(null)}
              />
            )}
            {activeTab === 'audit'    && <AuditTab onNavigateToProduct={navigateToProduct} />}
            {activeTab === 'marketed' && <MarketedRollupTab />}
            {activeTab === 'fiscal'   && <FiscalTimeTab />}
            {activeTab === 'hier'     && <HierarchyTab />}
            {activeTab === 'season'   && <SeasonCodeTab />}
          </div>
        </>
      )}
    </div>
  );
}
