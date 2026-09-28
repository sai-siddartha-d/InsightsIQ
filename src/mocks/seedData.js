// src/mocks/seedData.js
// ─────────────────────────────────────────────────────────────────────────────
// Static demo dataset for the backend-free build.
//
// This mirrors the reference data the FastAPI service seeded into Postgres
// (products, promo periods, MF/LY/LLY plan vintages, demo users) and adds a
// pre-filled working plan so every screen has realistic content on first load.
//
// Everything here is deterministic — no randomness, no network, no clock
// dependence beyond the "last edited" timestamp. Edit the tables below to
// reshape the demo.
// ─────────────────────────────────────────────────────────────────────────────

export const CHANNELS = [
  { id: 'STR', name: 'Stores',      description: 'Physical retail locations.' },
  { id: 'ONL', name: 'Online',      description: 'Omni-online (athleta.com).' },
  { id: 'ONO', name: 'Online Only', description: 'Online-exclusive product.' },
];

export const CHANNEL_IDS = CHANNELS.map((c) => c.id);

export const DEPARTMENTS = ['Womens Tops', 'Womens Bottoms', 'Outerwear'];


// ─── Products (catalog reference data) ───────────────────────────────────────
export const SEED_PRODUCTS = [
  { id: 'CC10001', name: 'Performance Tee — Heather Grey', department: 'Womens Tops',    class_name: 'Performance Tee',   ticket: 39.0,  auc: 14.0, air: 39.0,  inventory_units: 450, last_week_sales: 85,  woh: 5.3,  ssn_code: 'FAL25', isd: 'Jan 15', mdd: 'Jun 30' },
  { id: 'CC10002', name: 'Performance Tee — Navy',         department: 'Womens Tops',    class_name: 'Performance Tee',   ticket: 39.0,  auc: 14.0, air: 39.0,  inventory_units: 120, last_week_sales: 45,  woh: 2.7,  ssn_code: 'FAL25', isd: 'Jan 15', mdd: 'Jun 30' },
  { id: 'CC10003', name: 'Yoga Legging — Black',           department: 'Womens Bottoms', class_name: 'Yoga Legging',      ticket: 79.0,  auc: 29.0, air: 79.0,  inventory_units: 310, last_week_sales: 120, woh: 2.6,  ssn_code: 'FAL25', isd: 'Feb 1',  mdd: 'Jul 15' },
  { id: 'CC10004', name: 'Yoga Legging — Olive',           department: 'Womens Bottoms', class_name: 'Yoga Legging',      ticket: 79.0,  auc: 29.0, air: 79.0,  inventory_units: 680, last_week_sales: 55,  woh: 12.4, ssn_code: 'FAL25', isd: 'Feb 1',  mdd: 'Jul 15' },
  { id: 'CC10005', name: 'Sport Bra — White',              department: 'Womens Tops',    class_name: 'Sport Bra',         ticket: 49.0,  auc: 17.0, air: 49.0,  inventory_units: 200, last_week_sales: 60,  woh: 3.3,  ssn_code: 'SPC25', isd: 'Mar 1',  mdd: 'Aug 1'  },
  { id: 'CC10006', name: 'Sport Bra — Black',              department: 'Womens Tops',    class_name: 'Sport Bra',         ticket: 49.0,  auc: 17.0, air: 49.0,  inventory_units: 95,  last_week_sales: 70,  woh: 1.4,  ssn_code: 'SPC25', isd: 'Mar 1',  mdd: 'Aug 1'  },
  { id: 'CC10007', name: 'Running Short — Black',          department: 'Womens Bottoms', class_name: 'Running Short',     ticket: 54.0,  auc: 19.0, air: 54.0,  inventory_units: 175, last_week_sales: 88,  woh: 2.0,  ssn_code: 'SPC25', isd: 'Mar 1',  mdd: 'Aug 1'  },
  { id: 'CC10008', name: 'Running Short — Coral',          department: 'Womens Bottoms', class_name: 'Running Short',     ticket: 54.0,  auc: 19.0, air: 54.0,  inventory_units: 520, last_week_sales: 35,  woh: 14.9, ssn_code: 'SPC25', isd: 'Mar 1',  mdd: 'Aug 1'  },
  { id: 'CC10009', name: 'Pullover Hoodie — Charcoal',     department: 'Outerwear',      class_name: 'Pullover Hoodie',   ticket: 89.0,  auc: 34.0, air: 89.0,  inventory_units: 290, last_week_sales: 50,  woh: 5.8,  ssn_code: 'FAL25', isd: 'Feb 15', mdd: 'Sep 1'  },
  { id: 'CC10010', name: 'Pullover Hoodie — Forest',       department: 'Outerwear',      class_name: 'Pullover Hoodie',   ticket: 89.0,  auc: 34.0, air: 89.0,  inventory_units: 410, last_week_sales: 30,  woh: 13.7, ssn_code: 'FAL25', isd: 'Feb 15', mdd: 'Sep 1'  },
  { id: 'CC10011', name: 'Track Jacket — Sky',             department: 'Outerwear',      class_name: 'Track Jacket',      ticket: 99.0,  auc: 38.0, air: 99.0,  inventory_units: 155, last_week_sales: 65,  woh: 2.4,  ssn_code: 'SPC25', isd: 'Mar 15', mdd: 'Sep 15' },
  { id: 'CC10012', name: 'Track Jacket — Black',           department: 'Outerwear',      class_name: 'Track Jacket',      ticket: 99.0,  auc: 38.0, air: 99.0,  inventory_units: 88,  last_week_sales: 72,  woh: 1.2,  ssn_code: 'SPC25', isd: 'Mar 15', mdd: 'Sep 15' },
  { id: 'CC10013', name: 'Yoga Tank — Heather Grey',       department: 'Womens Tops',    class_name: 'Yoga Tank',         ticket: 34.0,  auc: 12.0, air: 34.0,  inventory_units: 340, last_week_sales: 40,  woh: 8.5,  ssn_code: 'FAL25', isd: 'Jan 20', mdd: 'Jul 1'  },
  { id: 'CC10014', name: 'Compression Tight — Black',      department: 'Womens Bottoms', class_name: 'Compression Tight', ticket: 89.0,  auc: 33.0, air: 89.0,  inventory_units: 210, last_week_sales: 95,  woh: 2.2,  ssn_code: 'FAL25', isd: 'Feb 1',  mdd: 'Jul 15' },
  { id: 'CC10015', name: 'Wind Shell — Navy',              department: 'Outerwear',      class_name: 'Wind Shell',        ticket: 119.0, auc: 48.0, air: 119.0, inventory_units: 560, last_week_sales: 20,  woh: 28.0, ssn_code: 'FAL25', isd: 'Feb 10', mdd: 'Aug 15' },
  { id: 'CC10016', name: 'Performance Tee — White',        department: 'Womens Tops',    class_name: 'Performance Tee',   ticket: 39.0,  auc: 14.0, air: 39.0,  inventory_units: 75,  last_week_sales: 90,  woh: 0.8,  ssn_code: 'SPC25', isd: 'Mar 1',  mdd: 'Jun 30' },
];


// ─── Promo periods ───────────────────────────────────────────────────────────
export const SEED_PERIODS = [
  { id: 'P1', label: 'May 8 – May 10',  type: 'TOD',      display_order: 0 },
  { id: 'P2', label: 'May 11 – May 23', type: 'Standard', display_order: 1 },
  { id: 'P3', label: 'May 22 – May 24', type: 'TOD',      display_order: 2 },
  { id: 'P4', label: 'May 25 – Jun 8',  type: 'Standard', display_order: 3 },
  { id: 'P5', label: 'Jun 6 – Jun 8',   type: 'TOD',      display_order: 4 },
];


// ─── Plan vintages (MF / LY / LLY benchmarks) ────────────────────────────────
// Base monthly-forecast (target) GM% and discount depth per dept × channel.
const MF_BASE = {
  'Womens Tops':    { STR: [56.0, 22.0], ONL: [54.0, 28.0], ONO: [51.0, 32.0] },
  'Womens Bottoms': { STR: [54.0, 24.0], ONL: [52.0, 30.0], ONO: [50.0, 34.0] },
  'Outerwear':      { STR: [58.0, 18.0], ONL: [56.0, 24.0], ONO: [54.0, 28.0] },
};

// Last-year (LY) actual GM% per dept × channel.
const LY_BASE = {
  'Womens Tops':    { STR: 45.0, ONL: 43.5, ONO: 36.0 },
  'Womens Bottoms': { STR: 44.0, ONL: 42.5, ONO: 35.0 },
  'Outerwear':      { STR: 47.0, ONL: 45.5, ONO: 44.0 },
};

// Per-period seasonality so each period reads differently.
const PERIOD_GM_OFFSET   = { P1: 0.6, P2: 1.4, P3: -0.7, P4: 0.5, P5: -1.0, P6: -0.3 };
const PERIOD_DISC_OFFSET = { P1: 2.5, P2: -1.0, P3: 3.5, P4: 0.5, P5: 3.0, P6: 1.5 };

const LLY_GM_DROP = 2.0;   // LLY sits ~2 pts below LY
const LY_DISC_UP  = 3.5;
const LLY_DISC_UP = 2.0;

// The MF target applies to STANDARD periods only — TOD events are supplemental
// deep-discount windows and are not measured against the monthly forecast.
const STD_PERIOD_IDS = new Set(SEED_PERIODS.filter((p) => p.type === 'Standard').map((p) => p.id));

function buildSeedVintages() {
  const rows = [];
  for (const dept of DEPARTMENTS) {
    for (const ch of CHANNEL_IDS) {
      const [mfGm0, mfDisc0] = MF_BASE[dept][ch];
      const lyGm0 = LY_BASE[dept][ch];
      for (const period of SEED_PERIODS) {
        const pid   = period.id;
        const gOff  = PERIOD_GM_OFFSET[pid] ?? 0;
        const dOff  = PERIOD_DISC_OFFSET[pid] ?? 0;
        const mfDisc  = round1(mfDisc0 + dOff);
        const lyGm    = round1(lyGm0 + gOff);
        const llyGm   = round1(lyGm - LLY_GM_DROP);
        const lyDisc  = round1(mfDisc + LY_DISC_UP);
        const llyDisc = round1(lyDisc + LLY_DISC_UP);

        const vintages = [
          ['LY', lyGm, lyDisc],
          ['LLY', llyGm, llyDisc],
        ];
        if (STD_PERIOD_IDS.has(pid)) {
          vintages.unshift(['MF', round1(mfGm0 + gOff), mfDisc]);
        }
        for (const [vt, gm, disc] of vintages) {
          rows.push({
            id: `${vt}:${dept}:${ch}:${pid}`,
            vintage_type: vt,
            department: dept,
            channel: ch,
            period_id: pid,
            gm_pct: gm,
            disc_pct: disc,
            aur: null,
          });
        }
      }
    }
  }
  return rows;
}

export const SEED_VINTAGES = buildSeedVintages();


// ─── Demo users ──────────────────────────────────────────────────────────────
// Passwords are plain text on purpose — there is no server to hash against and
// nothing here is a real credential. The login screen advertises them.
export const SEED_USERS = [
  { id: 'usr-demo-planner', email: 'demo@insightsiq.com',    name: 'Demo Planner', role: 'Planner', passwords: ['demo123'] },
  { id: 'usr-demo-manager', email: 'manager@insightsiq.com', name: 'Demo Manager', role: 'Manager', passwords: ['demo123', 'manager123'] },
];


// ─── Pre-filled working plan ─────────────────────────────────────────────────
// A compact, readable spec that expands into ~200 promo entries so the Summary,
// Audit, Rollup, Fiscal, Hierarchy and Season Code screens all have real shape
// on first load. Rules are declarative — tweak them here, not in the output.

// Baseline discount depth (% off ticket) per channel, before any adjustments.
const CHANNEL_PLAN = {
  STR: { stdDepth: 15, todDepth: 30 },  // stores stay shallow
  ONL: { stdDepth: 20, todDepth: 35 },  // omni-online a little deeper
  ONO: { stdDepth: null, todDepth: null }, // online-only runs BOGO offers instead
};

// Extra depth for slow-moving inventory (weeks-on-hand driven clearance).
function depthBonus(woh) {
  if (woh == null) return 0;
  if (woh >= 20) return 18;
  if (woh >= 12) return 12;
  if (woh >= 8)  return 6;
  return 0;
}

// Products that turn over in under two weeks stay at full ticket on the
// standard plan — discounting them would only erode margin.
const isFastSeller = (p) => p.woh != null && p.woh < 2.0;

// Later periods in the season go a little deeper than earlier ones.
const PERIOD_DEPTH_OFFSET = { P1: 0, P2: 0, P3: 3, P4: 5, P5: 6 };

// Deliberate demo gaps, so the Audit tab and coverage heatmap are not all-green:
//   • CC10013 has no standard-period offer anywhere  → one "Required" flag.
//   • Two fast sellers still carry a TOD offer       → "Should be at Reg" flags.
//   • Online Only does not carry Outerwear           → visible heatmap gaps.
//   • Stores sit out the final TOD event             → more heatmap texture.
const NO_STANDARD_PLAN     = new Set(['CC10013']);
const FAST_SELLERS_ON_TOD  = new Set(['CC10006', 'CC10012']);
const ONO_EXCLUDED_DEPTS   = new Set(['Outerwear']);
const CHANNEL_SKIPPED_TOD  = { STR: new Set(['P5']) };

const REASON_BY_BONUS = {
  18: 'Aged inventory — clearing ahead of MDD',
  12: 'Slow sell-through, WOH above plan',
  6:  'Building coverage on soft seller',
};

/** Effective selling price for an offer — mirrors the service-layer formula. */
export function effectivePrice(entryType, offerValue, ticket) {
  switch (entryType) {
    case 'TICKET':    return ticket;
    case 'PCT_OFF':   return ticket * (1 - (parseFloat(offerValue) || 0) / 100);
    case 'PRICE_PT':  return parseFloat(offerValue) || ticket;
    case 'BOGO_FREE': return ticket * 0.5;
    case 'BOGO_50':   return ticket * 0.75;
    case 'MUPP':      return ticket * 0.8;
    default:          return ticket;
  }
}

/** Turn a target discount depth into a believable retail price point. */
function pricePointFor(ticket, depthPct) {
  const raw = ticket * (1 - depthPct / 100);
  return (Math.round(raw) - 0.01).toFixed(2);
}

/** Decide the offer for one product × channel × period, or null for no entry. */
function planOffer(product, index, channel, period) {
  const isTod  = period.type === 'TOD';
  const bonus  = depthBonus(product.woh);
  const offset = PERIOD_DEPTH_OFFSET[period.id] ?? 0;

  if (channel === 'ONO' && ONO_EXCLUDED_DEPTS.has(product.department)) return null;
  if (CHANNEL_SKIPPED_TOD[channel]?.has(period.id)) return null;

  if (isTod) {
    if (NO_STANDARD_PLAN.has(product.id)) {
      // TOD-only style: no standard floor to clear, so a flat event offer.
      return { entry_type: 'PCT_OFF', offer_value: String(25 + offset) };
    }
    if (isFastSeller(product)) {
      // Only a couple of fast sellers get pulled into TOD events.
      if (!FAST_SELLERS_ON_TOD.has(product.id)) return null;
      return { entry_type: 'PCT_OFF', offer_value: String(20 + offset),
               reason: 'Event participation — merchant override' };
    }
    if (channel === 'ONO') return { entry_type: 'BOGO_FREE', offer_value: null };
    return {
      entry_type: 'PCT_OFF',
      offer_value: String(CHANNEL_PLAN[channel].todDepth + offset + bonus),
      reason: bonus ? REASON_BY_BONUS[bonus] : undefined,
    };
  }

  // ── Standard periods ──
  if (NO_STANDARD_PLAN.has(product.id)) return null;
  if (isFastSeller(product)) return { entry_type: 'TICKET', offer_value: null };
  if (channel === 'ONO') return { entry_type: 'BOGO_50', offer_value: null };

  const depth = CHANNEL_PLAN[channel].stdDepth + offset + bonus;

  // Higher-ticket styles are planned to a price point rather than a percentage.
  if (channel === 'ONL' && product.ticket >= 89) {
    return { entry_type: 'PRICE_PT', offer_value: pricePointFor(product.ticket, depth),
             reason: bonus ? REASON_BY_BONUS[bonus] : undefined };
  }
  // Every fourth style in stores runs as a multi-unit price point.
  if (channel === 'STR' && index % 4 === 0) {
    return { entry_type: 'MUPP', offer_value: null, quantity: 2 };
  }
  return {
    entry_type: 'PCT_OFF',
    offer_value: String(depth),
    reason: bonus ? REASON_BY_BONUS[bonus] : undefined,
  };
}

/**
 * Expand the plan spec into promo-entry records.
 * `now` is only used for the "last edited" timestamps the Control dashboard
 * surfaces — entries are staggered so the activity feed reads naturally.
 */
export function buildSeedEntries(now = Date.now()) {
  const entries = [];
  let ageMinutes = 38;   // most recent edit, minutes ago

  SEED_PRODUCTS.forEach((product, index) => {
    for (const channel of CHANNEL_IDS) {
      for (const period of SEED_PERIODS) {
        const offer = planOffer(product, index, channel, period);
        if (!offer) continue;
        entries.push({
          id: `${product.id}:${channel}:${period.id}`,
          product_id: product.id,
          product_name: product.name,
          department: product.department,
          channel,
          period_id: period.id,
          entry_type: offer.entry_type,
          offer_value: offer.offer_value ?? null,
          quantity: offer.quantity ?? null,
          notes: null,
          reason: offer.reason ?? null,
          submitted: false,
          updated_at: new Date(now - ageMinutes * 60_000).toISOString(),
        });
        ageMinutes += 1.5;
      }
    }
  });

  return entries;
}


function round1(n) {
  return Math.round(n * 10) / 10;
}
