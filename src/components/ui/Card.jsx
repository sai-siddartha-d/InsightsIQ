// src/components/ui/Card.jsx
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';

// Children can call useIsFullscreen() to adapt their layout when inside the portal
const FullscreenContext = createContext(false);
export const useIsFullscreen = () => useContext(FullscreenContext);

/**
 * A div that is flex-1 (fills fullscreen panel) when inside a Card portal,
 * or uses a fixed pixel height when rendered normally on the page.
 * Use this to wrap Recharts charts that need explicit pixel height normally
 * but should expand when fullscreened.
 */
export function FullscreenFlexDiv({ normalHeight, chartRef, className = '', children, ...rest }) {
  const isFullscreen = useIsFullscreen();
  return (
    <div
      ref={chartRef}
      style={isFullscreen ? undefined : { height: normalHeight }}
      className={isFullscreen ? `flex-1 min-h-0 ${className}` : className}
      {...rest}
    >
      {children}
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 0 2 2v3M16 21v-3a2 2 0 0 0 2-2h3"/>
    </svg>
  );
}

export default function Card({
  children, title, subtitle, action,
  padding = 'md', tone = 'default', className = '', fullscreen = false, ...rest
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const close = useCallback(() => setIsFullscreen(false), []);

  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFullscreen, close]);

  const paddings = { none: '', xs: 'p-3', sm: 'p-4', md: 'p-5', lg: 'p-6' };
  const tones = {
    default: 'bg-white border-neutral-200/80',
    subtle:  'bg-neutral-50 border-neutral-200/60',
    dark:    'bg-neutral-900 border-neutral-800 text-neutral-100',
  };

  const hasHeaderContent = title || subtitle || action;

  // `boxed` matches the h-7 bordered toolbar buttons when sitting next to an action bar
  const fsBtn = (boxed) => (
    <button
      onClick={() => setIsFullscreen(true)}
      title="View fullscreen"
      className={boxed
        ? 'h-7 w-7 shrink-0 flex items-center justify-center rounded-md border border-primary-200 bg-white text-primary-500 hover:text-primary-700 hover:bg-primary-50 hover:border-primary-300 transition-colors'
        : 'p-1 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded transition-colors'}
    >
      <ExpandIcon />
    </button>
  );
  const hasTitle = !!(title || subtitle);

  return (
    <>
      <div
        className={`rounded-xl border shadow-card ${tones[tone]} ${className}`}
        {...rest}
      >
        {/* Full header — when card has title / subtitle / action */}
        {hasHeaderContent && (
          <div className={`flex items-center justify-between gap-3 border-b ${title || subtitle ? 'px-5 py-3.5 border-neutral-100' : 'px-3 py-2 border-primary-100 bg-primary-50/40'}`}>
            {(title || subtitle) && (
              <div className="min-w-0">
                {title    && <h3 className="text-[13px] font-semibold text-neutral-900 tracking-tight leading-snug">{title}</h3>}
                {subtitle && <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{subtitle}</p>}
              </div>
            )}
            <div className={`flex items-center gap-2 ${hasTitle ? 'shrink-0' : 'flex-1 min-w-0'}`}>
              {action}
              {fullscreen && fsBtn(!!action)}
            </div>
          </div>
        )}
        {/* Slim teal expand bar — only when no title/subtitle/action but fullscreen is on.
            24px tall with a teal tint so it reads as intentional, not a blank row. */}
        {!hasHeaderContent && fullscreen && (
          <div className="flex items-center justify-end px-3 py-1 bg-primary-50 border-b border-primary-100">
            {fsBtn(false)}
          </div>
        )}
        <div className={paddings[padding]}>{children}</div>
      </div>

      {isFullscreen && createPortal(
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="bg-white rounded-2xl shadow-high w-[95vw] max-w-[1400px] h-[95vh] flex flex-col overflow-hidden animate-scale-in">
            <div className="px-5 py-3 border-b border-primary-100 bg-primary-50 flex items-start gap-3 flex-shrink-0">
              {(hasTitle || !action) && (
                <div className="min-w-0 self-center">
                  {title    && <h3 className="text-[15px] font-semibold text-neutral-900 tracking-tight leading-snug">{title}</h3>}
                  {subtitle && <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{subtitle}</p>}
                  {!hasTitle && <h3 className="text-[15px] font-semibold text-neutral-900">Fullscreen View</h3>}
                </div>
              )}
              {/* Untitled cards: the action bar is the header, so let it fill the row */}
              {action && (
                <div className={`flex items-center gap-2 min-h-[28px] ${hasTitle ? 'ml-auto shrink-0' : 'flex-1 min-w-0'}`}>
                  {action}
                </div>
              )}
              {/* Close stays pinned top-right, even when the action bar wraps */}
              <div className="ml-auto shrink-0 flex items-center pl-3 border-l border-primary-100">
                <button
                  onClick={close}
                  title="Close fullscreen (Esc)"
                  className="h-7 w-7 flex items-center justify-center rounded-md border border-primary-200 bg-white text-primary-500 hover:text-primary-700 hover:bg-primary-50 hover:border-primary-300 transition-colors"
                >
                  <CollapseIcon />
                </button>
              </div>
            </div>
            <FullscreenContext.Provider value={true}>
              <div className={`fullscreen-body flex-1 flex flex-col min-h-0 overflow-auto ${paddings[padding]}`}>
                {children}
              </div>
            </FullscreenContext.Provider>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
