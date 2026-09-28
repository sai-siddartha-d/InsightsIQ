import { describe, it, expect, beforeEach } from 'vitest';
import * as store from '../store';
import * as engine from '../pempalEngine';
import { SEED_PERIODS, SEED_PRODUCTS } from '../seedData';

const CHANNELS = ['STR', 'ONL', 'ONO'];

beforeEach(() => {
  localStorage.clear();
  store.reseed();
});


describe('reference data', () => {
  it('serves the full catalog and period list', () => {
    expect(engine.listProducts()).toHaveLength(SEED_PRODUCTS.length);
    expect(engine.listPeriods().map((p) => p.id)).toEqual(SEED_PERIODS.map((p) => p.id));
    expect(engine.listChannels().map((c) => c.id)).toEqual(CHANNELS);
  });

  it('ships a pre-filled working plan so the demo is never empty', () => {
    const entries = engine.listEntries();
    expect(entries.length).toBeGreaterThan(100);
    expect(entries.every((e) => e.entry_type)).toBe(true);
  });

  it('covers every entry type, so the offer-mix charts have shape', () => {
    const types = new Set(engine.listEntries().map((e) => e.entry_type));
    expect([...types].sort()).toEqual(
      ['BOGO_50', 'BOGO_FREE', 'MUPP', 'PCT_OFF', 'PRICE_PT', 'TICKET'],
    );
  });
});


describe('audit', () => {
  it('reports all five categories', () => {
    expect(engine.getAudit().map((f) => f.category)).toEqual([
      'Required', 'Invalid', 'TOD Not Deeper', 'Should be at Reg', 'Below PCF',
    ]);
  });

  it('seeds a plan with no blocking issues, so Submit succeeds out of the box', () => {
    const blocking = engine
      .getAudit()
      .filter((f) => ['Invalid', 'TOD Not Deeper'].includes(f.category))
      .reduce((sum, f) => sum + f.count, 0);
    expect(blocking).toBe(0);
  });

  it('seeds advisory flags, so the Audit tab is not empty', () => {
    const byCategory = Object.fromEntries(engine.getAudit().map((f) => [f.category, f.count]));
    expect(byCategory.Required).toBeGreaterThan(0);
    expect(byCategory['Should be at Reg']).toBeGreaterThan(0);
    expect(byCategory['Below PCF']).toBeGreaterThan(0);
  });

  it('flags a percentage outside 1–90 as Invalid', () => {
    engine.submitEntries([{
      product_id: 'CC10001', product_name: 'Performance Tee — Heather Grey',
      department: 'Womens Tops', channel: 'STR', period_id: 'P2',
      entry_type: 'PCT_OFF', offer_value: '95',
    }]);
    const invalid = engine.getAudit().find((f) => f.category === 'Invalid');
    expect(invalid.count).toBe(1);
    expect(invalid.items[0]).toMatchObject({ product_id: 'CC10001', channel: 'STR', period_id: 'P2' });
  });

  it('flags a TOD offer that does not beat the standard offer', () => {
    engine.submitEntries([
      { product_id: 'CC10001', product_name: 'x', department: 'Womens Tops', channel: 'STR', period_id: 'P2', entry_type: 'PCT_OFF', offer_value: '40' },
      { product_id: 'CC10001', product_name: 'x', department: 'Womens Tops', channel: 'STR', period_id: 'P1', entry_type: 'PCT_OFF', offer_value: '20' },
    ]);
    expect(engine.getAudit().find((f) => f.category === 'TOD Not Deeper').count).toBe(1);
  });
});


describe('offer maths', () => {
  it.each([
    ['TICKET',    null,  100],
    ['PCT_OFF',   '25',   75],
    ['PRICE_PT',  '60',   60],
    ['BOGO_FREE', null,   50],
    ['BOGO_50',   null,   75],
    ['MUPP',      null,   80],
  ])('prices %s correctly', (entry_type, offer_value, expected) => {
    expect(engine.effectivePrice({ entry_type, offer_value }, 100)).toBeCloseTo(expected);
  });

  it.each([
    ['PCT_OFF',   '30', 30],
    ['PRICE_PT',  '60', 40],
    ['BOGO_FREE', null, 50],
    ['BOGO_50',   null, 25],
    ['MUPP',      null, 20],
    ['TICKET',    null,  0],
  ])('derives depth for %s', (entry_type, offer_value, expected) => {
    expect(engine.depthOf({ entry_type, offer_value }, 100)).toBeCloseTo(expected);
  });
});


describe('summary', () => {
  it('returns the four headline metrics as formatted strings', () => {
    const metrics = engine.getSummary();
    expect(metrics.map((m) => m.label)).toEqual([
      'Plan Fill Rate', 'Working Plan GM%', 'Avg Discount Depth', 'Active Periods',
    ]);
    expect(metrics.find((m) => m.label === 'Active Periods').value).toBe(String(SEED_PERIODS.length));
    expect(metrics.find((m) => m.label === 'Working Plan GM%').value).toMatch(/^\d+(\.\d)?%$/);
  });

  it('moves when the plan changes', () => {
    const before = engine.getSummary().find((m) => m.label === 'Working Plan GM%').value;
    engine.submitEntries(
      engine.listEntries().map((e) => ({ ...e, entry_type: 'TICKET', offer_value: null })),
    );
    const after = engine.getSummary().find((m) => m.label === 'Working Plan GM%').value;
    expect(after).not.toBe(before);
  });
});


describe('aggregate endpoints', () => {
  it('builds the vintage summary with WP against MF / LY / LLY', () => {
    const rows = engine.getVintageSummary();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty('department');
      expect(row).toHaveProperty('wp_gm');
      expect(row).toHaveProperty('ly_gm');
      expect(row).toHaveProperty('lly_gm');
    }
    // MF targets are seeded for standard periods only.
    expect(rows.filter((r) => r.mf_gm != null).every((r) => ['P2', 'P4'].includes(r.period_id))).toBe(true);
  });

  it('builds the marketed rollup with one row per period and depth bands', () => {
    const rollup = engine.getMarketedRollup();
    expect(rollup.total_cc).toBe(SEED_PRODUCTS.length);
    expect(rollup.periods).toHaveLength(SEED_PERIODS.length);
    const [first] = rollup.periods;
    expect(first.channels.map((c) => c.channel)).toEqual(CHANNELS);
    expect(first.channels[0].depth_buckets.map((b) => b.level)).toEqual([70, 60, 50, 40, 30, 20, 10]);
  });

  it('cumulative rollup counts never shrink as bands get shallower', () => {
    for (const period of engine.getMarketedRollup().periods) {
      for (const channel of period.channels) {
        const counts = channel.depth_buckets.map((b) => b.cumulative.cc_count);
        for (let i = 1; i < counts.length; i += 1) {
          expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
        }
      }
    }
  });

  it('builds the fiscal timeline across periods, channels and departments', () => {
    const fiscal = engine.getFiscalTimeline();
    expect(fiscal.timeline).toHaveLength(SEED_PERIODS.length);
    expect(fiscal.channels).toEqual(CHANNELS);
    expect(fiscal.departments.length).toBeGreaterThan(0);
    const [row] = fiscal.timeline;
    expect(Object.keys(row.dept_breakdown)).toEqual(fiscal.departments);
    expect(Object.keys(row.dept_breakdown[fiscal.departments[0]])).toEqual(CHANNELS);
  });

  it('builds the hierarchy detail grouped by department with class rows', () => {
    const { rows } = engine.getHierarchyDetail();
    expect(rows.length).toBe(3 * CHANNELS.length * SEED_PERIODS.length);
    expect(rows[0].classes.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty('department');
  });

  it('builds the season code detail grouped by season code', () => {
    const { rows } = engine.getSeasonCodeDetail();
    expect(new Set(rows.map((r) => r.ssn_code))).toEqual(new Set(['FAL25', 'SPC25']));
    expect(rows[0].classes[0]).toHaveProperty('department');
  });

  it('builds the control dashboard with coverage and a GM health grid', () => {
    const control = engine.getControlDashboard();
    expect(control.total_entries).toBe(engine.listEntries().length);
    expect(control.coverage_pct).toBeGreaterThan(0);
    expect(control.coverage_pct).toBeLessThanOrEqual(100);
    expect(control.filled_slots).toBeLessThanOrEqual(control.total_slots);
    expect(control.heatmap.map((r) => r.channel)).toEqual(CHANNELS);
    expect(control.dept_gm_grid.length).toBe(3);
    expect(control.last_entry_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('reports channel coverage that sums to the entry count', () => {
    const coverage = engine.getChannelCoverage();
    expect(coverage.total_filled).toBe(engine.listEntries().length);
  });
});


describe('mutations', () => {
  it('saves entries as drafts without locking them', () => {
    const result = engine.submitEntries([{
      product_id: 'CC10002', product_name: 'x', department: 'Womens Tops',
      channel: 'STR', period_id: 'P2', entry_type: 'PCT_OFF', offer_value: '12',
    }], false);
    expect(result.locked).toBe(false);
    const saved = engine.listEntries().find((e) => e.product_id === 'CC10002' && e.channel === 'STR' && e.period_id === 'P2');
    expect(saved.offer_value).toBe('12');
    expect(saved.submitted).toBe(false);
  });

  it('locks entries on submit when the plan has no blocking issues', () => {
    const payload = [{
      product_id: 'CC10002', product_name: 'x', department: 'Womens Tops',
      channel: 'STR', period_id: 'P2', entry_type: 'PCT_OFF', offer_value: '12',
    }];
    const result = engine.submitEntries(payload, true);
    expect(result.blocking).toBe(0);
    expect(result.locked).toBe(true);
    expect(engine.listEntries().find((e) => e.product_id === 'CC10002' && e.period_id === 'P2' && e.channel === 'STR').submitted).toBe(true);
  });

  it('refuses to lock while a blocking issue exists', () => {
    const result = engine.submitEntries([{
      product_id: 'CC10002', product_name: 'x', department: 'Womens Tops',
      channel: 'STR', period_id: 'P2', entry_type: 'PCT_OFF', offer_value: '999',
    }], true);
    expect(result.blocking).toBeGreaterThan(0);
    expect(result.locked).toBe(false);
    expect(result.success).toBe(false);
  });

  it('creates and deletes periods, removing their entries', () => {
    const created = store.createPeriod({ label: 'Jul 1 – Jul 5', type: 'TOD' });
    expect(created.id).toBe('P6');
    expect(engine.listPeriods().map((p) => p.id)).toContain('P6');

    const before = engine.listEntries().length;
    expect(store.deletePeriod('P2')).toBe(true);
    expect(engine.listPeriods().map((p) => p.id)).not.toContain('P2');
    expect(engine.listEntries().length).toBeLessThan(before);
    expect(engine.listEntries().some((e) => e.period_id === 'P2')).toBe(false);
  });

  it('resets the plan but keeps the periods, matching the original API', () => {
    store.resetAll();
    expect(engine.listEntries()).toHaveLength(0);
    expect(engine.listPeriods().map((p) => p.id)).toEqual(SEED_PERIODS.map((p) => p.id));
  });

  it('persists edits across a store reload', () => {
    engine.submitEntries([{
      product_id: 'CC10003', product_name: 'x', department: 'Womens Bottoms',
      channel: 'ONL', period_id: 'P4', entry_type: 'PCT_OFF', offer_value: '42',
    }]);
    const raw = JSON.parse(localStorage.getItem('insightsiq.mock.plan.v1'));
    expect(raw.entries.find((e) => e.id === 'CC10003:ONL:P4').offer_value).toBe('42');
  });
});
