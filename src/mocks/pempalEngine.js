// src/mocks/pempalEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// A faithful JavaScript port of the PEMPAL service layer that used to run on
// FastAPI. Every aggregate the UI reads — summary metrics, audit flags, the
// marketed rollup, fiscal timeline, hierarchy, season-code and control
// dashboards — is recomputed here from the local store.
//
// Deriving rather than hard-coding the responses is what keeps the demo alive:
// edit an offer in Promo Details and every chart, heatmap and flag moves with
// it, exactly as it did against the real service.
// ─────────────────────────────────────────────────────────────────────────────

import * as store from './store';

export const PCF_GM_FLOOR = 52.5;
const CHANNELS = ['STR', 'ONL', 'ONO'];

// Discount depth thresholds for the marketed rollup, highest to lowest.
const DEPTH_LEVELS = [70, 60, 50, 40, 30, 20, 10];


// ─── Shared maths ────────────────────────────────────────────────────────────
const num = (v) => {
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
};

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

function avg(list) {
  return list.length ? round1(list.reduce((a, b) => a + b, 0) / list.length) : null;
}

/** Discount depth (% off ticket) implied by an offer. */
export function depthOf(entry, ticket = 50.0) {
  switch (entry.entry_type) {
    case 'PCT_OFF':   return num(entry.offer_value) ?? 0;
    case 'PRICE_PT': {
      const v = num(entry.offer_value);
      if (v === null || !ticket) return 0;
      return Math.max(0, 100 * (1 - v / ticket));
    }
    case 'BOGO_FREE': return 50.0;
    case 'BOGO_50':   return 25.0;
    case 'MUPP':      return 20.0;
    default:          return 0.0;
  }
}

/** Effective selling price after the offer is applied. */
export function effectivePrice(entry, ticket) {
  switch (entry.entry_type) {
    case 'TICKET':    return ticket;
    case 'PCT_OFF':   return ticket * (1 - (num(entry.offer_value) ?? 0) / 100);
    case 'PRICE_PT':  return num(entry.offer_value) ?? ticket;
    case 'BOGO_FREE': return ticket * 0.5;
    case 'BOGO_50':   return ticket * 0.75;
    case 'MUPP':      return ticket * 0.8;
    default:          return ticket;
  }
}

/** GM% for an entry, or null when the product lacks the inputs to compute it. */
function gmPct(entry, product) {
  if (!product || product.auc == null || !product.ticket) return null;
  const eff = effectivePrice(entry, product.ticket);
  if (!(eff > 0)) return null;
  return ((eff - product.auc) / eff) * 100;
}


// ─── Read endpoints ──────────────────────────────────────────────────────────
export function listProducts() {
  return store.products.map((p) => ({
    id: p.id, name: p.name, department: p.department,
    class_name: p.class_name, ticket: p.ticket,
    auc: p.auc, air: p.air,
    inventory_units: p.inventory_units, last_week_sales: p.last_week_sales,
    woh: p.woh, ssn_code: p.ssn_code, isd: p.isd, mdd: p.mdd,
  }));
}

export function listPeriods() {
  return store.listPeriods().map((p) => ({ id: p.id, label: p.label, type: p.type }));
}

export function listChannels() {
  return store.channels.map((c) => ({ ...c }));
}

export function listEntries() {
  return store.listEntries().map(entryToDict);
}

function entryToDict(e) {
  return {
    product_id: e.product_id,
    product_name: e.product_name,
    department: e.department,
    channel: e.channel,
    period_id: e.period_id,
    entry_type: e.entry_type,
    offer_value: e.offer_value ?? null,
    quantity: e.quantity ?? null,
    notes: e.notes ?? null,
    reason: e.reason ?? null,
    submitted: Boolean(e.submitted),
  };
}


// ─── Validation / audit ──────────────────────────────────────────────────────
/**
 * Run the five compliance checks over a set of entries.
 * Counts are per-product; the representative channel/period on each item lets
 * the Audit tab jump straight to the offending cell in Promo Details.
 */
export function validateEntries(entries) {
  const periodLookup  = store.periodsById();
  const productLookup = store.productsById();
  const allProductIds = store.products.map((p) => p.id);

  // ── Invalid: bad offer values ──
  // PCT_OFF must be 1–90%. PRICE_PT must be > 0 and below ticket — a price at
  // or above ticket is not a markdown.
  const invalid = new Map();
  for (const entry of entries) {
    const prod = productLookup[entry.product_id];
    let bad = false;
    if (entry.entry_type === 'PCT_OFF') {
      const v = num(entry.offer_value ?? '0');
      bad = v === null || !(v >= 1 && v <= 90);
    } else if (entry.entry_type === 'PRICE_PT') {
      const price = num(entry.offer_value ?? '0');
      bad = price === null || price <= 0 || (prod?.ticket ? price >= prod.ticket : false);
    }
    if (bad && !invalid.has(entry.product_id)) {
      invalid.set(entry.product_id, [entry.channel, entry.period_id]);
    }
  }

  // ── TOD Not Deeper: a TOD offer must beat every standard offer ──
  const todNotDeeper = new Map();
  const byProductChannel = new Map();
  for (const entry of entries) {
    const key = `${entry.product_id}|${entry.channel}`;
    if (!byProductChannel.has(key)) byProductChannel.set(key, []);
    byProductChannel.get(key).push(entry);
  }
  for (const [key, group] of byProductChannel) {
    const pid    = key.split('|')[0];
    const ticket = productLookup[pid]?.ticket ?? 50.0;
    const todEntries = group.filter((e) => periodLookup[e.period_id]?.type === 'TOD');
    const stdEntries = group.filter((e) => periodLookup[e.period_id]?.type === 'Standard');
    for (const tod of todEntries) {
      const todDepth = depthOf(tod, ticket);
      if (stdEntries.some((std) => todDepth <= depthOf(std, ticket))) {
        if (!todNotDeeper.has(pid)) todNotDeeper.set(pid, [tod.channel, tod.period_id]);
        break;
      }
    }
  }

  // ── Required: products with no standard-period entry in any channel ──
  const stdPeriodIds = Object.values(periodLookup).filter((p) => p.type === 'Standard').map((p) => p.id);
  const submittedKeys = new Set(entries.map((e) => `${e.product_id}|${e.channel}|${e.period_id}`));
  const required = new Map();
  for (const pid of allProductIds) {
    const hasAny = CHANNELS.some((ch) =>
      stdPeriodIds.some((ppid) => submittedKeys.has(`${pid}|${ch}|${ppid}`)),
    );
    if (!hasAny) required.set(pid, [null, null]);
  }

  // ── Should be at Reg: high-velocity products (WOH < 2) carrying a promo ──
  const shouldAtReg = new Map();
  for (const entry of entries) {
    if (!entry.entry_type || entry.entry_type === 'TICKET') continue;
    const prod = productLookup[entry.product_id];
    if (prod?.woh != null && prod.woh < 2.0 && !shouldAtReg.has(entry.product_id)) {
      shouldAtReg.set(entry.product_id, [entry.channel, entry.period_id]);
    }
  }

  // ── Below PCF: effective GM% under the floor. Advisory, non-blocking. ──
  const belowPcf = new Map();
  for (const entry of entries) {
    const prod = productLookup[entry.product_id];
    if (!prod || prod.auc == null || !prod.ticket) continue;
    const gm = gmPct(entry, prod);
    if (gm !== null && gm < PCF_GM_FLOOR && !belowPcf.has(entry.product_id)) {
      belowPcf.set(entry.product_id, [entry.channel, entry.period_id]);
    }
  }

  const items = (map) =>
    [...map.entries()].map(([product_id, [channel, period_id]]) => ({ product_id, channel, period_id }));

  return [
    { category: 'Required',         count: required.size,     items: items(required) },
    { category: 'Invalid',          count: invalid.size,      items: items(invalid) },
    { category: 'TOD Not Deeper',   count: todNotDeeper.size, items: items(todNotDeeper) },
    { category: 'Should be at Reg', count: shouldAtReg.size,  items: items(shouldAtReg) },
    { category: 'Below PCF',        count: belowPcf.size,     items: items(belowPcf) },
  ];
}

export function getAudit() {
  return validateEntries(listEntries());
}

const BLOCKING_CATEGORIES = new Set(['Invalid', 'TOD Not Deeper']);


// ─── Write endpoint ──────────────────────────────────────────────────────────
/**
 * Persist entries and run the audit.
 * `lock = false` (Save) always leaves the entries as drafts. `lock = true`
 * (Submit) commits them only when the whole plan is clear of blocking issues.
 */
export function submitEntries(entries, lock = false) {
  store.bulkUpsertEntries(entries);

  const flags = validateEntries(listEntries());
  const blocking = flags
    .filter((f) => BLOCKING_CATEGORIES.has(f.category))
    .reduce((sum, f) => sum + f.count, 0);

  const locked = lock && blocking === 0;
  if (locked) store.setSubmitted(entries, true);

  return {
    success: blocking === 0,
    flags,
    submitted: entries.length,
    blocking,
    locked,
  };
}


// ─── Summary metrics ─────────────────────────────────────────────────────────
export function getSummary() {
  const entries    = store.listEntries();
  const periods    = store.listPeriods();
  const productMap = store.productsById();

  const productCount = store.products.length;
  const periodCount  = periods.length;
  const total        = entries.length;
  const coverage =
    productCount && periodCount ? round1((100 * total) / (productCount * periodCount * 3)) : 0;

  const gmValues = [];
  const discValues = [];
  for (const e of entries) {
    const prod = productMap[e.product_id];
    if (!prod || !prod.auc || !prod.ticket) continue;
    const eff = effectivePrice(e, prod.ticket);
    if (eff > 0) {
      gmValues.push(((eff - prod.auc) / eff) * 100);
      discValues.push((1 - eff / prod.ticket) * 100);
    }
  }

  const wpGm    = avg(gmValues);
  const avgDisc = avg(discValues);

  return [
    { label: 'Plan Fill Rate',     value: `${coverage}%` },
    { label: 'Working Plan GM%',   value: wpGm    !== null ? `${wpGm}%`    : '—' },
    { label: 'Avg Discount Depth', value: avgDisc !== null ? `${avgDisc}%` : '—' },
    { label: 'Active Periods',     value: String(periodCount) },
  ];
}


// ─── Vintage comparison ──────────────────────────────────────────────────────
export function getVintageSummary() {
  const vintageMap = store.vintagesByDeptChannelPeriod();
  const entries    = store.listEntries();
  const productMap = store.productsById();

  const wpAcc = new Map();
  for (const e of entries) {
    const prod = productMap[e.product_id];
    if (!prod || !prod.auc || !prod.ticket) continue;
    const eff = effectivePrice(e, prod.ticket);
    if (eff <= 0) continue;
    const key = store.vintageKey(prod.department, e.channel, e.period_id);
    if (!wpAcc.has(key)) wpAcc.set(key, []);
    wpAcc.get(key).push(((eff - prod.auc) / eff) * 100);
  }

  const result = [];
  for (const [key, vmap] of Object.entries(vintageMap)) {
    const [department, channel, period_id] = key.split('|');
    const wpGm  = avg(wpAcc.get(key) ?? []);
    const mfGm  = vmap.MF?.gm_pct ?? null;
    const lyGm  = vmap.LY?.gm_pct ?? null;
    const llyGm = vmap.LLY?.gm_pct ?? null;
    result.push({
      department, channel, period_id,
      mf_gm: mfGm, ly_gm: lyGm, lly_gm: llyGm, wp_gm: wpGm,
      variance_to_mf: wpGm && mfGm ? round1(wpGm - mfGm) : null,
    });
  }

  result.sort(
    (a, b) =>
      a.department.localeCompare(b.department) ||
      a.channel.localeCompare(b.channel) ||
      a.period_id.localeCompare(b.period_id),
  );
  return result;
}


// ─── Marketed rollup ─────────────────────────────────────────────────────────
function depthBand(depth) {
  return DEPTH_LEVELS.find((level) => depth >= level) ?? null;
}

function buildBucketCell(pidList, productMap, entryLookup, ch, pid, totalCc) {
  const gmVals = [];
  const deptData = new Map();

  for (const pidInner of pidList) {
    const prod = productMap[pidInner];
    if (!prod || !prod.auc || !prod.ticket) continue;
    const entry = entryLookup.get(`${pidInner}|${ch}|${pid}`);
    if (!entry) continue;
    const eff = effectivePrice(entry, prod.ticket);
    if (eff <= 0) continue;
    const gm = ((eff - prod.auc) / eff) * 100;
    gmVals.push(gm);
    if (!deptData.has(prod.department)) deptData.set(prod.department, { cc_count: 0, gm_vals: [] });
    const bucket = deptData.get(prod.department);
    bucket.cc_count += 1;
    bucket.gm_vals.push(gm);
  }

  const ccCount = pidList.length;
  return {
    cc_count: ccCount,
    pct_blended: totalCc ? round1((100 * ccCount) / totalCc) : 0,
    gm_pct: avg(gmVals),
    dept_breakdown: Object.fromEntries(
      [...deptData].map(([dept, v]) => [dept, { cc_count: v.cc_count, gm_pct: avg(v.gm_vals) }]),
    ),
  };
}

export function getMarketedRollup() {
  const entries    = store.listEntries();
  const periods    = store.listPeriods();
  const productMap = store.productsById();
  const totalCc    = store.products.length;

  const entryLookup = new Map(
    entries.map((e) => [`${e.product_id}|${e.channel}|${e.period_id}`, e]),
  );

  // period → channel → depth band → [product ids]
  const byPeriod = new Map();
  for (const e of entries) {
    const prod  = productMap[e.product_id];
    const depth = depthOf(e, prod?.ticket ?? 50.0);
    const band  = depthBand(depth);
    if (band === null) continue;
    const key = `${e.period_id}|${e.channel}|${band}`;
    if (!byPeriod.has(key)) byPeriod.set(key, []);
    byPeriod.get(key).push(e.product_id);
  }

  const periodRows = periods.map((period) => {
    const pid = period.id;
    const channels = CHANNELS.map((ch) => {
      const bandPids = (level) => byPeriod.get(`${pid}|${ch}|${level}`) ?? [];

      // All Promo — every product carrying any promo depth ≥ 10%.
      const allPromoPids = [...new Set(DEPTH_LEVELS.flatMap(bandPids))];
      const allPromo = buildBucketCell(allPromoPids, productMap, entryLookup, ch, pid, totalCc);

      let cumulPids = new Set();
      const depthBuckets = DEPTH_LEVELS.map((level) => {
        const exactPids = [...new Set(bandPids(level))];
        cumulPids = new Set([...cumulPids, ...exactPids]);
        const exactCell = buildBucketCell(exactPids, productMap, entryLookup, ch, pid, totalCc);
        const cumulCell = buildBucketCell([...cumulPids], productMap, entryLookup, ch, pid, totalCc);
        return {
          level,
          label: `${level}% off`,
          exact: exactCell,
          cumulative: {
            cc_count: cumulCell.cc_count,
            pct_blended: cumulCell.pct_blended,
            gm_pct: cumulCell.gm_pct,
          },
        };
      });

      return { channel: ch, all_promo: allPromo, depth_buckets: depthBuckets };
    });

    return {
      period_id: pid,
      period_label: period.label,
      period_type: period.type,
      channels,
    };
  });

  return { total_cc: totalCc, periods: periodRows };
}


// ─── Coverage ────────────────────────────────────────────────────────────────
export function getChannelCoverage() {
  const periods    = store.listPeriods();
  const entries    = store.listEntries();
  const totalSlots = store.products.length * periods.length;

  const counts = new Map();
  for (const e of entries) counts.set(e.channel, (counts.get(e.channel) ?? 0) + 1);

  const byChannel = CHANNELS.map((ch) => {
    const filled = counts.get(ch) ?? 0;
    return {
      channel: ch,
      filled,
      total: totalSlots,
      coverage: totalSlots ? round1((100 * filled) / totalSlots) : 0,
    };
  });

  return {
    channels: byChannel,
    total_slots: totalSlots,
    total_filled: byChannel.reduce((sum, c) => sum + c.filled, 0),
  };
}

export function getChannelPeriodHeatmap() {
  const periods       = store.listPeriods();
  const entries       = store.listEntries();
  const totalProducts = store.products.length;

  const counts = new Map();
  for (const e of entries) {
    const key = `${e.channel}|${e.period_id}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const matrix = CHANNELS.map((ch) => ({
    channel: ch,
    cells: periods.map((p) => {
      const count = counts.get(`${ch}|${p.id}`) ?? 0;
      return {
        period_id: p.id,
        period_label: p.label,
        period_type: p.type,
        count,
        total: totalProducts,
        coverage: totalProducts ? round1((100 * count) / totalProducts) : 0,
      };
    }),
  }));

  return {
    matrix,
    periods: periods.map((p) => ({ id: p.id, label: p.label, type: p.type })),
    channels: CHANNELS,
  };
}


// ─── Fiscal timeline ─────────────────────────────────────────────────────────
export function getFiscalTimeline() {
  const vintageMap = store.vintagesByDeptChannelPeriod();
  const entries    = store.listEntries();
  const products   = store.products;
  const periods    = store.listPeriods();
  const productMap = store.productsById();

  const depts = [...new Set(products.map((p) => p.department))].sort();

  const wpByDcp = new Map();
  for (const e of entries) {
    const prod = productMap[e.product_id];
    if (!prod || !prod.auc || !prod.ticket) continue;
    const eff = effectivePrice(e, prod.ticket);
    if (eff <= 0) continue;
    const key = store.vintageKey(e.department, e.channel, e.period_id);
    if (!wpByDcp.has(key)) wpByDcp.set(key, []);
    wpByDcp.get(key).push(((eff - prod.auc) / eff) * 100);
  }

  const entryLookup = new Map(
    entries.map((e) => [`${e.product_id}|${e.channel}|${e.period_id}`, e]),
  );

  const timeline = periods.map((period) => {
    const pid = period.id;

    const deptBreakdown = {};
    for (const dept of depts) {
      deptBreakdown[dept] = {};
      const deptProds = products.filter((p) => p.department === dept);

      for (const ch of CHANNELS) {
        const key   = store.vintageKey(dept, ch, pid);
        const vmap  = vintageMap[key] ?? {};
        const wpGm  = avg(wpByDcp.get(key) ?? []);
        const mfGm  = vmap.MF?.gm_pct ?? null;

        // Class-level breakdown for this dept × channel × period.
        const clsAcc = new Map();
        for (const prod of deptProds) {
          const cls   = prod.class_name || prod.name;
          const entry = entryLookup.get(`${prod.id}|${ch}|${pid}`);
          if (!entry || !prod.auc || !prod.ticket) continue;
          const eff = effectivePrice(entry, prod.ticket);
          if (eff <= 0) continue;
          if (!clsAcc.has(cls)) clsAcc.set(cls, []);
          clsAcc.get(cls).push(((eff - prod.auc) / eff) * 100);
        }

        deptBreakdown[dept][ch] = {
          wp_gm: wpGm,
          mf_gm: mfGm,
          ly_gm: vmap.LY?.gm_pct ?? null,
          lly_gm: vmap.LLY?.gm_pct ?? null,
          variance_to_mf: wpGm !== null && mfGm !== null ? round1(wpGm - mfGm) : null,
          class_breakdown: Object.fromEntries([...clsAcc].map(([cls, gms]) => [cls, avg(gms)])),
        };
      }
    }

    // Channel-level rollup across all departments.
    const channelSummary = {};
    for (const ch of CHANNELS) {
      const pick = (vt) =>
        depts
          .map((d) => vintageMap[store.vintageKey(d, ch, pid)]?.[vt]?.gm_pct)
          .filter((v) => v != null);

      const wpVals = depts.flatMap((d) => wpByDcp.get(store.vintageKey(d, ch, pid)) ?? []);
      const wpGm = avg(wpVals);
      const mfGm = avg(pick('MF'));

      channelSummary[ch] = {
        wp_gm: wpGm,
        mf_gm: mfGm,
        ly_gm: avg(pick('LY')),
        lly_gm: avg(pick('LLY')),
        entry_count: depts.filter((d) => (wpByDcp.get(store.vintageKey(d, ch, pid)) ?? []).length).length,
        variance_to_mf: wpGm !== null && mfGm !== null ? round1(wpGm - mfGm) : null,
      };
    }

    const oWp = avg(CHANNELS.map((ch) => channelSummary[ch].wp_gm).filter((v) => v != null));
    const oMf = avg(CHANNELS.map((ch) => channelSummary[ch].mf_gm).filter((v) => v != null));

    return {
      period_id: pid,
      period_label: period.label,
      period_type: period.type,
      overall_wp_gm: oWp,
      overall_mf_gm: oMf,
      overall_var_mf: oWp !== null && oMf !== null ? round1(oWp - oMf) : null,
      channels: channelSummary,
      dept_breakdown: deptBreakdown,
    };
  });

  return {
    periods: periods.map((p) => ({ id: p.id, label: p.label, type: p.type })),
    channels: CHANNELS,
    departments: depts,
    timeline,
  };
}


// ─── Hierarchy detail ────────────────────────────────────────────────────────
/**
 * Shared shape builder for the Hierarchy and Season Code rollups — both group
 * products one level up (department or season code), then break each
 * channel × period cell down by class.
 */
function buildGroupedRollup({ groupKey, groupField, includeClassDepartment, benchmarkDepts }) {
  const vintageMap = store.vintagesByDeptChannelPeriod();
  const entries    = store.listEntries();
  const products   = store.products;
  const periods    = store.listPeriods();

  const entryMap = new Map(
    entries.map((e) => [`${e.product_id}|${e.channel}|${e.period_id}`, e]),
  );

  const groups = new Map();
  for (const p of products) {
    const key = groupKey(p);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const rows = [];
  for (const groupName of [...groups.keys()].sort()) {
    const groupProds = [...groups.get(groupName)].sort(
      (a, b) =>
        a.department.localeCompare(b.department) ||
        (a.class_name || a.name).localeCompare(b.class_name || b.name) ||
        a.id.localeCompare(b.id),
    );
    const benchDepts = benchmarkDepts(groupProds);

    for (const ch of CHANNELS) {
      for (const period of periods) {
        const pid = period.id;

        const benchmark = (vt) => {
          const vals = benchDepts
            .map((d) => vintageMap[store.vintageKey(d, ch, pid)]?.[vt]?.gm_pct)
            .filter((v) => v != null);
          return benchDepts.length === 1 ? (vals[0] ?? null) : avg(vals);
        };
        const mfGm  = benchmark('MF');
        const lyGm  = benchmark('LY');
        const llyGm = benchmark('LLY');

        const classMap = new Map();
        for (const prod of groupProds) {
          const cls = prod.class_name || prod.name;
          if (!classMap.has(cls)) classMap.set(cls, []);
          classMap.get(cls).push(prod);
        }

        const classRows = [];
        const allWp = [];
        const allWoh = [];

        for (const clsName of [...classMap.keys()].sort()) {
          const clsProds = classMap.get(clsName);
          const clsWp = [], clsWoh = [], clsAuc = [], clsTkt = [];
          const clsEntryTypes = new Set();
          let clsEntryCount = 0;

          for (const prod of clsProds) {
            const entry = entryMap.get(`${prod.id}|${ch}|${pid}`);
            if (entry) {
              clsEntryCount += 1;
              clsEntryTypes.add(entry.entry_type);
              const eff = effectivePrice(entry, prod.ticket);
              if (eff > 0 && prod.auc) {
                const gm = ((eff - prod.auc) / eff) * 100;
                clsWp.push(gm);
                allWp.push(gm);
              }
            }
            if (prod.woh != null) { clsWoh.push(prod.woh); allWoh.push(prod.woh); }
            if (prod.auc != null) clsAuc.push(prod.auc);
            if (prod.ticket)      clsTkt.push(prod.ticket);
          }

          const clsDepts = [...new Set(clsProds.map((p) => p.department))].sort();
          classRows.push({
            class_name: clsName,
            ...(includeClassDepartment
              ? { department: clsDepts.length === 1 ? clsDepts[0] : clsDepts.join(', ') }
              : {}),
            cc_count: clsProds.length,
            entry_count: clsEntryCount,
            wp_gm: avg(clsWp),
            woh_avg: avg(clsWoh),
            auc_avg: clsAuc.length ? round2(clsAuc.reduce((a, b) => a + b, 0) / clsAuc.length) : null,
            ticket_avg: clsTkt.length ? round2(clsTkt.reduce((a, b) => a + b, 0) / clsTkt.length) : null,
            entry_types: [...clsEntryTypes].filter(Boolean).sort(),
          });
        }

        const wpGmAvg = avg(allWp);
        rows.push({
          [groupField]: groupName,
          channel: ch,
          period_id: pid,
          period_label: period.label,
          period_type: period.type,
          mf_gm: mfGm,
          ly_gm: lyGm,
          lly_gm: llyGm,
          wp_gm: wpGmAvg,
          woh_avg: avg(allWoh),
          variance_to_mf: wpGmAvg !== null && mfGm !== null ? round1(wpGmAvg - mfGm) : null,
          entry_count: classRows.reduce((sum, c) => sum + c.entry_count, 0),
          classes: classRows,
        });
      }
    }
  }

  return { rows, periods: periods.map((p) => ({ id: p.id, label: p.label, type: p.type })) };
}

export function getHierarchyDetail() {
  return buildGroupedRollup({
    groupKey: (p) => p.department,
    groupField: 'department',
    includeClassDepartment: false,
    benchmarkDepts: (prods) => [prods[0].department],
  });
}

export function getSeasonCodeDetail() {
  return buildGroupedRollup({
    groupKey: (p) => p.ssn_code || 'Unknown',
    groupField: 'ssn_code',
    includeClassDepartment: true,
    benchmarkDepts: (prods) => [...new Set(prods.map((p) => p.department))],
  });
}


// ─── Control dashboard ───────────────────────────────────────────────────────
export function getControlDashboard() {
  const entries    = store.listEntries();   // newest first
  const products   = store.products;
  const periods    = store.listPeriods();
  const vintageMap = store.vintagesByDeptChannelPeriod();
  const productMap = store.productsById();

  const stdPeriods    = periods.filter((p) => p.type === 'Standard');
  const stdPeriodIds  = new Set(stdPeriods.map((p) => p.id));
  const totalProducts = products.length;

  const lastEntryAt = entries.length ? (entries[0].updated_at ?? null) : null;

  // Coverage over standard periods only — TOD is supplemental.
  const totalSlots  = totalProducts * stdPeriods.length * CHANNELS.length;
  const filledKeys  = new Set(
    entries
      .filter((e) => stdPeriodIds.has(e.period_id))
      .map((e) => `${e.product_id}|${e.channel}|${e.period_id}`),
  );
  const filledSlots = filledKeys.size;

  // Channel × period heatmap across all periods.
  const entryCounts = new Map();
  for (const e of entries) {
    const key = `${e.channel}|${e.period_id}`;
    entryCounts.set(key, (entryCounts.get(key) ?? 0) + 1);
  }
  const heatmap = CHANNELS.map((ch) => ({
    channel: ch,
    cells: periods.map((p) => {
      const count = entryCounts.get(`${ch}|${p.id}`) ?? 0;
      return {
        period_id: p.id,
        period_label: p.label,
        period_type: p.type,
        count,
        total: totalProducts,
        pct: totalProducts ? round1((100 * count) / totalProducts) : 0,
      };
    }),
  }));

  // WP GM% accumulator per dept × channel × period.
  const wpAcc = new Map();
  for (const e of entries) {
    const prod = productMap[e.product_id];
    if (!prod || !prod.auc || !prod.ticket) continue;
    const eff = effectivePrice(e, prod.ticket);
    if (eff <= 0) continue;
    const key = store.vintageKey(prod.department, e.channel, e.period_id);
    if (!wpAcc.has(key)) wpAcc.set(key, []);
    wpAcc.get(key).push(((eff - prod.auc) / eff) * 100);
  }

  const depts = [...new Set(products.map((p) => p.department))].sort();
  const deptGmGrid = depts.map((dept) => ({
    department: dept,
    channels: CHANNELS.map((ch) => {
      const wpVals = [];
      const mfVals = [];
      for (const p of stdPeriods) {
        const key = store.vintageKey(dept, ch, p.id);
        wpVals.push(...(wpAcc.get(key) ?? []));
        const mf = vintageMap[key]?.MF?.gm_pct;
        if (mf != null) mfVals.push(mf);
      }
      const wpGm = avg(wpVals);
      const mfGm = avg(mfVals);
      return {
        channel: ch,
        wp_gm: wpGm,
        mf_gm: mfGm,
        variance: wpGm !== null && mfGm !== null ? round1(wpGm - mfGm) : null,
      };
    }),
  }));

  return {
    last_entry_at: lastEntryAt,
    total_entries: entries.length,
    total_slots: totalSlots,
    filled_slots: filledSlots,
    coverage_pct: totalSlots ? round1((100 * filledSlots) / totalSlots) : 0,
    product_count: totalProducts,
    period_count: periods.length,
    heatmap,
    periods: periods.map((p) => ({ id: p.id, label: p.label, type: p.type })),
    dept_gm_grid: deptGmGrid,
    departments: depts,
    channels: CHANNELS,
  };
}
