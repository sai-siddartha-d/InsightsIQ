import { describe, it, expect } from 'vitest';
import {
  entryKey, parseEntryKey, entriesToMap,
  countFilledForChannel, filterProducts, buildSubmitPayload,
} from '../promoDetailsHelpers';


const products = [
  { id: 'CC10001', name: 'Tee',     department: 'Tops',    ticket: 39 },
  { id: 'CC10002', name: 'Legging', department: 'Bottoms', ticket: 79 },
  { id: 'CC10003', name: 'Hoodie',  department: 'Outer',   ticket: 89 },
];

const periods = [
  { id: 'P1', label: 'Mar 11', type: 'Standard' },
  { id: 'P2', label: 'Mar 17', type: 'TOD' },
];


describe('entryKey', () => {
  it('composes a colon-separated key', () => {
    expect(entryKey('CC10001', 'STR', 'P1')).toBe('CC10001:STR:P1');
  });

  it('handles different channels and periods', () => {
    expect(entryKey('CC10002', 'ONL', 'P3')).toBe('CC10002:ONL:P3');
  });
});


describe('parseEntryKey', () => {
  it('parses a key back into its three parts', () => {
    expect(parseEntryKey('CC10001:STR:P1')).toEqual({
      product_id: 'CC10001', channel: 'STR', period_id: 'P1',
    });
  });

  it('round-trips a key', () => {
    const parts = parseEntryKey(entryKey('CC10001', 'ONL', 'P3'));
    expect(parts.product_id).toBe('CC10001');
    expect(parts.channel).toBe('ONL');
    expect(parts.period_id).toBe('P3');
  });
});


describe('entriesToMap', () => {
  it('converts an array of API entries into a keyed map', () => {
    const entries = [
      { product_id: 'CC10001', channel: 'STR', period_id: 'P1', entry_type: 'PCT_OFF', offer_value: '30' },
      { product_id: 'CC10002', channel: 'ONL', period_id: 'P2', entry_type: 'TICKET',  offer_value: null },
    ];
    const map = entriesToMap(entries);
    expect(Object.keys(map)).toHaveLength(2);
    expect(map['CC10001:STR:P1']).toEqual({ entry_type: 'PCT_OFF', offer_value: '30' });
  });

  it('normalizes null offer_value to empty string', () => {
    const map = entriesToMap([
      { product_id: 'CC10001', channel: 'STR', period_id: 'P1', entry_type: 'TICKET', offer_value: null },
    ]);
    expect(map['CC10001:STR:P1'].offer_value).toBe('');
  });

  it('handles an empty array', () => {
    expect(entriesToMap([])).toEqual({});
  });
});


describe('countFilledForChannel', () => {
  const map = {
    'CC10001:STR:P1': { entry_type: 'PCT_OFF', offer_value: '30' },
    'CC10002:STR:P2': { entry_type: 'PCT_OFF', offer_value: '20' },
    'CC10001:ONL:P1': { entry_type: 'PCT_OFF', offer_value: '25' },
    'CC10003:STR:P1': { entry_type: '',        offer_value: ''   },
  };

  it('counts filled entries for STR', () => {
    expect(countFilledForChannel(map, 'STR')).toBe(2);
  });

  it('counts filled entries for ONL', () => {
    expect(countFilledForChannel(map, 'ONL')).toBe(1);
  });

  it('returns 0 for an unused channel', () => {
    expect(countFilledForChannel(map, 'ONO')).toBe(0);
  });

  it('returns 0 for an empty map', () => {
    expect(countFilledForChannel({}, 'STR')).toBe(0);
  });

  it('excludes entries with empty entry_type from the count', () => {
    expect(countFilledForChannel(map, 'STR')).toBe(2);
  });
});


describe('filterProducts', () => {
  const baseArgs = {
    products, periods,
    entriesMap: {},
    activeChannel: 'STR',
    filterDept: 'all',
    filterFill: 'all',
    search: '',
  };

  it('returns all products when no filters applied', () => {
    expect(filterProducts(baseArgs)).toHaveLength(3);
  });

  it('filters by department', () => {
    const result = filterProducts({ ...baseArgs, filterDept: 'Tops' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('CC10001');
  });

  it('filters by search term in name', () => {
    const result = filterProducts({ ...baseArgs, search: 'tee' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Tee');
  });

  it('filters by search term in product ID', () => {
    const result = filterProducts({ ...baseArgs, search: 'CC10002' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('CC10002');
  });

  it('search is case-insensitive', () => {
    expect(filterProducts({ ...baseArgs, search: 'TEE'    })).toHaveLength(1);
    expect(filterProducts({ ...baseArgs, search: 'Hoodie' })).toHaveLength(1);
  });

  it('search with no match returns empty', () => {
    expect(filterProducts({ ...baseArgs, search: 'nonexistent' })).toHaveLength(0);
  });

  it('filterFill=filled returns only products with entries on active channel', () => {
    const entriesMap = {
      'CC10001:STR:P1': { entry_type: 'PCT_OFF', offer_value: '30' },
    };
    const result = filterProducts({ ...baseArgs, entriesMap, filterFill: 'filled' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('CC10001');
  });

  it('filterFill=empty returns only products without entries on active channel', () => {
    const entriesMap = {
      'CC10001:STR:P1': { entry_type: 'PCT_OFF', offer_value: '30' },
    };
    const result = filterProducts({ ...baseArgs, entriesMap, filterFill: 'empty' });
    expect(result).toHaveLength(2);
    expect(result.map(p => p.id).sort()).toEqual(['CC10002', 'CC10003']);
  });

  it('filterFill considers only the active channel', () => {
    const entriesMap = {
      'CC10001:ONL:P1': { entry_type: 'PCT_OFF', offer_value: '30' },
    };
    const result = filterProducts({
      ...baseArgs, entriesMap, filterFill: 'empty', activeChannel: 'STR',
    });
    expect(result).toHaveLength(3);
  });

  it('multiple filters compose with AND semantics', () => {
    const result = filterProducts({
      ...baseArgs,
      filterDept: 'Bottoms',
      search:     'legging',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('CC10002');
  });
});


describe('buildSubmitPayload', () => {
  it('builds a payload from the filled entries', () => {
    const entriesMap = {
      'CC10001:STR:P1': { entry_type: 'PCT_OFF', offer_value: '30' },
      'CC10002:ONL:P2': { entry_type: 'TICKET',  offer_value: ''   },
    };
    const payload = buildSubmitPayload(entriesMap, products);
    expect(payload).toHaveLength(2);

    const tee = payload.find(p => p.product_id === 'CC10001');
    expect(tee).toEqual({
      product_id:   'CC10001',
      product_name: 'Tee',
      department:   'Tops',
      channel:      'STR',
      period_id:    'P1',
      entry_type:   'PCT_OFF',
      offer_value:  '30',
      notes:        null,
    });
  });

  it('excludes entries with empty entry_type', () => {
    const entriesMap = {
      'CC10001:STR:P1': { entry_type: 'PCT_OFF', offer_value: '30' },
      'CC10002:STR:P2': { entry_type: '',        offer_value: ''   },
    };
    const payload = buildSubmitPayload(entriesMap, products);
    expect(payload).toHaveLength(1);
    expect(payload[0].product_id).toBe('CC10001');
  });

  it('converts empty string offer_value to null', () => {
    const entriesMap = {
      'CC10001:STR:P1': { entry_type: 'TICKET', offer_value: '' },
    };
    const payload = buildSubmitPayload(entriesMap, products);
    expect(payload[0].offer_value).toBeNull();
  });

  it('handles missing products gracefully', () => {
    const entriesMap = {
      'CC99999:STR:P1': { entry_type: 'PCT_OFF', offer_value: '30' },
    };
    const payload = buildSubmitPayload(entriesMap, products);
    expect(payload).toHaveLength(1);
    expect(payload[0].product_name).toBe('');
    expect(payload[0].department).toBe('');
  });

  it('returns empty array when no entries are filled', () => {
    expect(buildSubmitPayload({}, products)).toEqual([]);
  });
});