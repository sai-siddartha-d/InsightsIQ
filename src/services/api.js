// src/services/api.js
// ─────────────────────────────────────────────────────────────────────────────
// Static-demo API layer.
//
// This module keeps the exact surface the real client exposed — `authApi`,
// `pempalApi`, `chatApi` and `refreshAccessToken` — so no screen, tab or hook
// needed to change. What differs is underneath: instead of `fetch`ing a
// FastAPI service, every call resolves against the in-browser mock store in
// `src/mocks/`, after a short artificial delay so loading states still show.
//
// Nothing here touches the network. The build runs standalone on GitHub Pages.
// ─────────────────────────────────────────────────────────────────────────────

import * as auth from '../mocks/authEngine';
import { MockApiError } from '../mocks/authEngine';
import * as pempal from '../mocks/pempalEngine';
import { chat as runChat } from '../mocks/chatEngine';
import * as store from '../mocks/store';

// Simulated round-trip time, in ms. Set to 0 under test.
const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 160;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


// ─── Token helpers ───────────────────────────────────────────────────────────
function getAccessToken()  { return localStorage.getItem('accessToken'); }
function getRefreshToken() { return localStorage.getItem('refreshToken'); }

function setTokens(access, refresh) {
  if (access)  localStorage.setItem('accessToken', access);
  if (refresh) localStorage.setItem('refreshToken', refresh);
}

function clearAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}


// ─── Request wrapper ─────────────────────────────────────────────────────────
/**
 * Run a mock handler with the same contract the HTTP client had: a delay, an
 * auth check, and an `Error` carrying a readable message on failure.
 *
 * @param {Function} handler  Produces the response body.
 * @param {Object}   options
 * @param {boolean}  options.auth     Require a signed-in session (default true).
 * @param {number}   options.latency  Override the simulated delay.
 */
async function request(handler, { auth: needsAuth = true, latency = LATENCY_MS } = {}) {
  if (latency) await sleep(latency);

  if (needsAuth && !auth.userFromToken(getAccessToken())) {
    clearAuth();
    throw new Error('Session expired. Please sign in again.');
  }

  try {
    return handler();
  } catch (err) {
    if (err instanceof MockApiError && err.status === 401) clearAuth();
    throw err instanceof MockApiError ? new Error(err.message) : err;
  }
}


// ─── Refresh ─────────────────────────────────────────────────────────────────
/**
 * Kept for API compatibility — `useWebSocket` calls it on reconnect. Rotates
 * the local session tokens, or clears the session if there is nothing to
 * rotate.
 */
export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const pair = auth.refresh(refreshToken);
    setTokens(pair.access_token, pair.refresh_token);
    return pair.access_token;
  } catch {
    clearAuth();
    return null;
  }
}


// ─── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    request(() => {
      const data = auth.login(email, password);
      setTokens(data.access_token, data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    }, { auth: false, latency: 420 }),   // a beat longer, so the button spinner reads

  logout: () =>
    request(() => {
      clearAuth();
      return { detail: 'Logged out' };
    }, { auth: false, latency: 0 }),

  me: () => request(() => auth.me(getAccessToken())),
};


// ─── Pempal API ──────────────────────────────────────────────────────────────
export const pempalApi = {
  getProducts: () => request(() => pempal.listProducts()),
  getPeriods:  () => request(() => pempal.listPeriods()),
  getChannels: () => request(() => pempal.listChannels()),
  getEntries:  () => request(() => pempal.listEntries()),

  submit: (entries, lock = false) =>
    request(() => {
      auth.requirePlanner(getAccessToken(), 'submit entries');
      const result = pempal.submitEntries(entries, lock);
      store.emit('entries_changed', { submitted: result.submitted, success: result.success });
      return result;
    }, { latency: 340 }),

  clearAll: () =>
    request(() => {
      auth.requirePlanner(getAccessToken(), 'clear entries');
      const cleared = store.clearEntries();
      store.emit('entries_changed', { cleared });
      return { cleared };
    }),

  resetAll: () =>
    request(() => {
      auth.requirePlanner(getAccessToken(), 'reset the plan');
      const result = store.resetAll();
      store.emit('entries_changed', { reset: true });
      store.emit('periods_changed', { reset: true });
      return result;
    }),

  getAudit:   () => request(() => pempal.getAudit()),
  getSummary: () => request(() => pempal.getSummary()),

  createPeriod: (data) =>
    request(() => {
      auth.requirePlanner(getAccessToken(), 'create periods');
      const period = store.createPeriod(validatePeriod(data));
      store.emit('periods_changed', { action: 'created', id: period.id });
      return { id: period.id, label: period.label, type: period.type };
    }),

  deletePeriod: (periodId) =>
    request(() => {
      auth.requirePlanner(getAccessToken(), 'delete periods');
      if (!store.deletePeriod(periodId)) {
        throw new MockApiError(`Period ${periodId} not found.`, 404);
      }
      store.emit('periods_changed', { action: 'deleted', id: periodId });
      return { deleted: periodId };
    }),

  getChannelCoverage:      () => request(() => pempal.getChannelCoverage()),
  getChannelPeriodHeatmap: () => request(() => pempal.getChannelPeriodHeatmap()),
  getVintageSummary:       () => request(() => pempal.getVintageSummary()),
  getMarketedRollup:       () => request(() => pempal.getMarketedRollup()),
  getHierarchyDetail:      () => request(() => pempal.getHierarchyDetail()),
  getFiscalTimeline:       () => request(() => pempal.getFiscalTimeline()),
  getControlDashboard:     () => request(() => pempal.getControlDashboard()),
  getSeasonCodeDetail:     () => request(() => pempal.getSeasonCodeDetail()),
};


/** Mirrors the `PeriodCreate` schema plus the service-layer date rules. */
function validatePeriod({ label, type, start_date, end_date }) {
  const trimmed = String(label ?? '').trim();
  if (trimmed.length < 3 || trimmed.length > 100) {
    throw new MockApiError('Label must be between 3 and 100 characters.');
  }
  if (!['Standard', 'TOD'].includes(type)) {
    throw new MockApiError('Type must be either Standard or TOD.');
  }

  const start = new Date(start_date);
  const end   = new Date(end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new MockApiError('Start and end dates are required.');
  }
  if (end < start) {
    throw new MockApiError('End date must be on or after start date.');
  }
  if ((end - start) / 86_400_000 > 30) {
    throw new MockApiError('Periods longer than 30 days are not allowed.');
  }

  return { label: trimmed, type };
}


// ─── Chat API ────────────────────────────────────────────────────────────────
export const chatApi = {
  send: ({ message, history = [], context = null }) =>
    request(() => ({ response: runChat({ message, history, context }) }), { latency: 520 }),
};
