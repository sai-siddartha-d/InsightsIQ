// src/mocks/store.js
// ─────────────────────────────────────────────────────────────────────────────
// In-browser replacement for the Postgres database.
//
// Reference data (products, plan vintages, users, channels) lives in code and
// is never mutated. The mutable working plan — periods and promo entries — is
// persisted to localStorage so edits survive a page reload, exactly like the
// real backend persisted them.
//
// The store also plays the role the WebSocket manager used to: mutations emit
// `entries_changed` / `periods_changed` events, both to this tab and (via the
// browser `storage` event) to any other tab showing the demo.
// ─────────────────────────────────────────────────────────────────────────────

import {
  SEED_PRODUCTS,
  SEED_PERIODS,
  SEED_VINTAGES,
  SEED_USERS,
  CHANNELS,
  buildSeedEntries,
} from './seedData';

const STORAGE_KEY  = 'insightsiq.mock.plan.v1';
const BROADCAST_KEY = 'insightsiq.mock.broadcast';

// ─── Immutable reference data ────────────────────────────────────────────────
export const products = SEED_PRODUCTS;
export const vintages = SEED_VINTAGES;
export const users    = SEED_USERS;
export const channels = CHANNELS;


// ─── Mutable state ───────────────────────────────────────────────────────────
let state = null;

function freshState() {
  return {
    periods: SEED_PERIODS.map((p) => ({ ...p })),
    entries: buildSeedEntries(),
  };
}

function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.periods) && Array.isArray(parsed?.entries)) {
        state = parsed;
        return state;
      }
    }
  } catch {
    // Corrupt or unavailable storage — fall through to a fresh seed.
  }
  state = freshState();
  persist();
  return state;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private-browsing / quota errors: keep working from memory.
  }
}

/** Wipe persisted state and rebuild the demo dataset from the seed. */
export function reseed() {
  state = freshState();
  persist();
  emit('periods_changed', { reseeded: true });
  emit('entries_changed', { reseeded: true });
  return state;
}


// ─── Event bus (stands in for the backend WebSocket) ─────────────────────────
const listeners = new Set();

export function subscribe(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

/**
 * Publish an event. Delivery is deferred to a macrotask so callers observe the
 * same ordering they did with a real socket: the awaited response resolves
 * first, the broadcast lands just after.
 */
export function emit(type, payload = {}) {
  setTimeout(() => {
    for (const handler of [...listeners]) {
      try {
        handler(type, payload);
      } catch (err) {
        console.warn('[mock] event handler failed', err);
      }
    }
  }, 0);

  // Mirror to other tabs.
  try {
    localStorage.setItem(BROADCAST_KEY, JSON.stringify({ type, payload, at: Date.now() }));
  } catch {
    // Non-fatal.
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      state = null;   // another tab changed the plan — re-read on next access
      return;
    }
    if (event.key !== BROADCAST_KEY || !event.newValue) return;
    try {
      const { type, payload } = JSON.parse(event.newValue);
      for (const handler of [...listeners]) handler(type, payload);
    } catch {
      // Ignore malformed cross-tab messages.
    }
  });
}


// ─── Read accessors ──────────────────────────────────────────────────────────
/** Periods ordered the way the repository ordered them: display_order, then id. */
export function listPeriods() {
  return [...load().periods].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.id.localeCompare(b.id),
  );
}

export function periodsById() {
  return Object.fromEntries(listPeriods().map((p) => [p.id, p]));
}

/** Entries newest-edit-first, matching `ORDER BY updated_at DESC`. */
export function listEntries() {
  return [...load().entries].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
}

export function productsById() {
  return Object.fromEntries(products.map((p) => [p.id, p]));
}

/** {`${dept}|${channel}|${periodId}`: { MF: {...}, LY: {...}, LLY: {...} }} */
export function vintagesByDeptChannelPeriod() {
  const result = {};
  for (const v of vintages) {
    const key = vintageKey(v.department, v.channel, v.period_id);
    (result[key] ??= {})[v.vintage_type] = {
      gm_pct: v.gm_pct,
      disc_pct: v.disc_pct,
      aur: v.aur,
    };
  }
  return result;
}

export const vintageKey = (dept, channel, periodId) => `${dept}|${channel}|${periodId}`;


// ─── Write operations ────────────────────────────────────────────────────────
/** Insert or update entries by composite key. Always lands them as drafts. */
export function bulkUpsertEntries(payload) {
  if (!payload.length) return;
  const s   = load();
  const now = new Date().toISOString();
  const byId = new Map(s.entries.map((e) => [e.id, e]));

  for (const entry of payload) {
    const id = `${entry.product_id}:${entry.channel}:${entry.period_id}`;
    byId.set(id, {
      ...byId.get(id),
      ...entry,
      id,
      quantity: entry.quantity ?? null,
      notes: entry.notes ?? null,
      reason: entry.reason ?? null,
      submitted: false,
      updated_at: now,
    });
  }

  s.entries = [...byId.values()];
  persist();
}

/** Mark the given (product, channel, period) entries as committed/locked. */
export function setSubmitted(payload, value) {
  if (!payload.length) return;
  const s = load();
  const ids = new Set(payload.map((e) => `${e.product_id}:${e.channel}:${e.period_id}`));
  s.entries = s.entries.map((e) => (ids.has(e.id) ? { ...e, submitted: value } : e));
  persist();
}

export function clearEntries() {
  const s = load();
  const count = s.entries.length;
  s.entries = [];
  persist();
  return count;
}

/** Delete every entry and period, then re-seed periods — matches `/pempal/reset`. */
export function resetAll() {
  const s = load();
  const result = { entries: s.entries.length, periods: s.periods.length };
  s.entries = [];
  s.periods = SEED_PERIODS.map((p) => ({ ...p }));
  persist();
  return result;
}

export function createPeriod({ label, type }) {
  const s = load();
  const nums = s.periods
    .map((p) => (/^P\d+$/.test(p.id) ? parseInt(p.id.slice(1), 10) : 0));
  const nextNum = (nums.length ? Math.max(...nums) : 0) + 1;
  const period = {
    id: `P${nextNum}`,
    label,
    type,
    display_order: s.periods.length,
  };
  s.periods = [...s.periods, period];
  persist();
  return period;
}

/** Delete a period and its entries. Returns false when the id is unknown. */
export function deletePeriod(periodId) {
  const s = load();
  if (!s.periods.some((p) => p.id === periodId)) return false;
  s.periods = s.periods.filter((p) => p.id !== periodId);
  s.entries = s.entries.filter((e) => e.period_id !== periodId);
  persist();
  return true;
}
