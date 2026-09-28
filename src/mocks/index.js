// src/mocks/index.js
// ─────────────────────────────────────────────────────────────────────────────
// Entry point for the mock backend.
//
// Importing this module installs a small console helper on `window` so anyone
// demoing the build can inspect or reset the dataset without opening devtools'
// storage panel. It is the escape hatch after using "Reset All" on the Audit
// tab, which — faithfully to the original API — wipes the working plan.
// ─────────────────────────────────────────────────────────────────────────────

import * as store from './store';
import * as engine from './pempalEngine';

export { store, engine };

export function installMockConsoleHelpers() {
  if (typeof window === 'undefined') return;

  window.insightsiqMock = {
    /** Restore the full demo dataset (products, periods, pre-filled plan). */
    reseed: () => {
      store.reseed();
      return 'Demo plan restored. Reload the page to see it.';
    },
    /** Current plan state, as the API would return it. */
    snapshot: () => ({
      products: engine.listProducts(),
      periods: engine.listPeriods(),
      entries: engine.listEntries(),
      summary: engine.getSummary(),
      audit: engine.getAudit(),
    }),
    /** Sign out and clear every key this demo writes to localStorage. */
    signOut: () => {
      ['accessToken', 'refreshToken', 'user'].forEach((k) => localStorage.removeItem(k));
      return 'Signed out. Reload the page.';
    },
  };

  if (import.meta.env.DEV) {
    console.info(
      '%c[InsightsIQ mock]%c running without a backend — try insightsiqMock.reseed()',
      'color:#5B8DD9;font-weight:bold',
      'color:inherit',
    );
  }
}
