// src/components/ui/PempalTour.jsx
// Spotlight product tour rendered via createPortal.
// Steps target elements by [data-tour="..."] attribute.
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const TOUR_KEY = 'pempal_tour_v1_seen';

const STEPS = [
  {
    target:   'sidebar',
    title:    'Your Workspace',
    body:     'The sidebar is your main navigation hub. Use it to switch between the three planning tools — PEMPAL, Krypton, and Simple Suite — and access resources like documentation, support, and feedback.',
    placement: 'right',
  },
  {
    target:   'sidebar-nav',
    title:    'Planning Tools',
    body:     'This app includes three tools: PEMPAL for in-season promotion planning, Krypton for pre-season planning, and Simple Suite for weekly evaluation. The "Live" badge on PEMPAL means it\'s actively used this season.',
    placement: 'right',
  },
  {
    target:   'sidebar-pempal',
    title:    'PEMPAL',
    body:     'Click PEMPAL to access the Price Execution Management Pre-Approval Layer — where your team plans, submits, and approves in-season promotional offers across channels and periods.',
    placement: 'right',
  },
  {
    target:   'pempal-hero',
    title:    'PEMPAL Overview',
    body:     'This banner confirms you\'re inside PEMPAL — the Price Execution Management Pre-Approval Layer. The "Live" badge means the current brand\'s plan is active this season and open for submissions.',
    placement: 'bottom',
  },
  {
    target:   'topbar-filters',
    title:    'Brand & Region Filters',
    body:     'Use the Brand dropdown to switch between Athleta, Gap, Old Navy, and Banana Republic. Use the Region dropdown to filter plan data by US, Canada, or Japan. All tabs update instantly when you switch.',
    placement: 'bottom',
  },
  {
    target:   'pempal-tabs',
    title:    'Navigation Tabs',
    body:     'Tabs are split into two kinds. Reporting tabs (Summary, Audit, Marketed Rollup, etc.) surface plan analysis. Application tabs (Promo Details, TOD) are where you enter and manage promotional offers.',
    placement: 'bottom',
  },
  {
    target:   'tab-summary',
    title:    'Summary Tab',
    body:     'The Summary tab shows your full plan health — coverage %, GM% trends against the PCF threshold, channel split, and the Plan Explorer chart. Start here to assess your plan before sign-off.',
    placement: 'bottom',
  },
  {
    target:   'tab-promo',
    title:    'Promo Details',
    body:     'Promo Details is where you submit individual product entries. Choose an entry type (% Off, Price Point, BOGO, MUPP, etc.), set the offer value, and assign it to channels and fiscal periods.',
    placement: 'bottom',
  },
  {
    target:   'tab-audit',
    title:    'Audit Tab',
    body:     'The Audit tab flags any entries that fall below the 52.5% PCF GM threshold. Non-compliant entries are highlighted in red — review and correct them before the plan can be signed off.',
    placement: 'bottom',
  },
  {
    target:   'insights-assist-btn',
    title:    'Insights Assist',
    body:     'Open Insights Assist at any time to get an AI-generated analysis of the tab you\'re currently viewing. Content updates per tab — switch tabs and reopen for fresh insights.',
    placement: 'bottom',
  },
];

const PAD = 10;  // padding around highlighted element

function getRect(selector) {
  const el = document.querySelector(`[data-tour="${selector}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
}

function Tooltip({ step, rect, stepIndex, total, onNext, onPrev, onSkip }) {
  const vpH = window.innerHeight;
  const vpW = window.innerWidth;

  let top, left;
  const TOOLTIP_W = 320;
  const TOOLTIP_EST_H = 180;

  if (rect) {
    if (step.placement === 'right') {
      // Place to the right of the rect
      left = rect.x + rect.w + 16;
      top  = rect.y + rect.h / 2 - TOOLTIP_EST_H / 2;
      // Clamp vertically
      top = Math.max(16, Math.min(top, vpH - TOOLTIP_EST_H - 16));
      // If not enough room on right, place below instead
      if (left + TOOLTIP_W > vpW - 16) {
        left = Math.max(16, rect.x + rect.w / 2 - TOOLTIP_W / 2);
        top  = rect.y + rect.h + 12;
      }
    } else {
      // Prefer below
      if (rect.y + rect.h + TOOLTIP_EST_H + 16 < vpH) {
        top  = rect.y + rect.h + 12;
      } else {
        top  = rect.y - TOOLTIP_EST_H - 12;
      }
      left = rect.x + rect.w / 2 - TOOLTIP_W / 2;
      left = Math.max(16, Math.min(left, vpW - TOOLTIP_W - 16));
    }
  } else {
    top  = vpH / 2 - TOOLTIP_EST_H / 2;
    left = vpW / 2 - TOOLTIP_W / 2;
  }

  return (
    <div
      style={{
        position: 'fixed', zIndex: 10000,
        top, left, width: TOOLTIP_W,
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        animation: 'fadeInUp 0.2s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div
        className="bg-white rounded-xl shadow-high overflow-hidden"
        style={{ boxShadow: '0 20px 48px -8px rgba(0,0,0,0.28), 0 8px 16px -4px rgba(0,0,0,0.12)' }}
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-neutral-100">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="px-4 pt-3.5 pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-[12.5px] font-semibold text-neutral-800 leading-tight">{step.title}</p>
            <span className="text-[9.5px] text-neutral-400 font-medium flex-shrink-0 mt-0.5">{stepIndex + 1}/{total}</span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">{step.body}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 pb-3.5">
          <button
            onClick={onSkip}
            className="text-[10.5px] text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            Skip tour
          </button>
          <div className="flex-1" />
          {stepIndex > 0 && (
            <button
              onClick={onPrev}
              className="px-3 py-1.5 text-[11px] text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={onNext}
            className="px-3.5 py-1.5 text-[11px] font-medium text-white rounded-lg transition-colors"
            style={{ background: 'linear-gradient(135deg, #1B4F9C, #163F82)' }}
          >
            {stepIndex === total - 1 ? 'Done 🎉' : 'Next →'}
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1 pb-3">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all ${i === stepIndex ? 'w-3 h-1.5 bg-primary-500' : 'w-1.5 h-1.5 bg-neutral-200'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TourOverlay({ stepIndex, onNext, onPrev, onSkip }) {
  const [rect, setRect] = useState(null);
  const step = STEPS[stepIndex];

  useEffect(() => {
    const update = () => setRect(getRect(step.target));
    update();
    // Small delay to allow DOM to settle
    const t = setTimeout(update, 80);
    window.addEventListener('resize', update);
    return () => { clearTimeout(t); window.removeEventListener('resize', update); };
  }, [stepIndex, step.target]);

  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  return (
    <>
      {/* SVG spotlight overlay — z-index above sidebar (z-30 = 30) but below tooltip */}
      <svg
        style={{ position: 'fixed', inset: 0, width: vpW, height: vpH, zIndex: 9990, pointerEvents: 'auto' }}
        onClick={onNext}
      >
        <defs>
          <mask id="tour-mask">
            <rect width={vpW} height={vpH} fill="white" />
            {rect && (
              <rect
                x={rect.x} y={rect.y}
                width={rect.w} height={rect.h}
                rx="8" fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width={vpW} height={vpH}
          fill="rgba(3,20,40,0.72)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight ring */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            left: rect.x, top: rect.y,
            width: rect.w, height: rect.h,
            zIndex: 9991,
            borderRadius: 8,
            boxShadow: '0 0 0 2px rgba(92,184,204,0.8), 0 0 0 4px rgba(92,184,204,0.2)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip */}
      <Tooltip
        step={step}
        rect={rect}
        stepIndex={stepIndex}
        total={STEPS.length}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
      />
    </>
  );
}

// ─── Public hook ─────────────────────────────────────────────────────────────
export function usePempalTour() {
  const [active, setActive]     = useState(false);
  const [stepIndex, setStep]    = useState(0);

  const start = useCallback(() => {
    setStep(0);
    setActive(true);
  }, []);

  const startIfFirst = useCallback(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      // Delay to let the page mount
      setTimeout(start, 1200);
    }
  }, [start]);

  const next = useCallback(() => {
    setStep(i => {
      if (i >= STEPS.length - 1) {
        localStorage.setItem(TOUR_KEY, '1');
        setActive(false);
        return 0;
      }
      return i + 1;
    });
  }, []);

  const prev = useCallback(() => {
    setStep(i => Math.max(0, i - 1));
  }, []);

  const skip = useCallback(() => {
    localStorage.setItem(TOUR_KEY, '1');
    setActive(false);
    setStep(0);
  }, []);

  return { active, stepIndex, start, startIfFirst, next, prev, skip };
}


// ─── Tour portal component ────────────────────────────────────────────────────
export default function PempalTour({ active, stepIndex, onNext, onPrev, onSkip }) {
  if (!active) return null;
  return createPortal(
    <TourOverlay stepIndex={stepIndex} onNext={onNext} onPrev={onPrev} onSkip={onSkip} />,
    document.body
  );
}
