export function entryKey(productId, channel, periodId) {
  return `${productId}:${channel}:${periodId}`;
}

export function parseEntryKey(key) {
  const [product_id, channel, period_id] = key.split(':');
  return { product_id, channel, period_id };
}

export function entriesToMap(entries) {
  const map = {};
  for (const e of entries) {
    map[entryKey(e.product_id, e.channel, e.period_id)] = {
      entry_type:  e.entry_type,
      offer_value: e.offer_value || '',
    };
  }
  return map;
}

export function countFilledForChannel(entriesMap, channel) {
  return Object.entries(entriesMap)
    .filter(([key, v]) => key.split(':')[1] === channel && v?.entry_type)
    .length;
}

export function filterProducts({ products, periods, entriesMap, activeChannel, filterDept, filterFill, search }) {
  return products.filter(p => {
    if (filterDept !== 'all' && p.department !== filterDept) return false;

    if (search) {
      const term = search.toLowerCase();
      const matchesName = p.name.toLowerCase().includes(term);
      const matchesId   = p.id.toLowerCase().includes(term);
      if (!matchesName && !matchesId) return false;
    }

    if (filterFill !== 'all') {
      const hasAnyEntry = periods.some(per =>
        entriesMap[entryKey(p.id, activeChannel, per.id)]?.entry_type
      );
      if (filterFill === 'filled' && !hasAnyEntry) return false;
      if (filterFill === 'empty'  &&  hasAnyEntry) return false;
    }

    return true;
  });
}

export function buildSubmitPayload(entriesMap, products) {
  return Object.entries(entriesMap)
    .filter(([, e]) => e?.entry_type)
    .map(([key, e]) => {
      const { product_id, channel, period_id } = parseEntryKey(key);
      const product = products.find(p => p.id === product_id);
      return {
        product_id,
        product_name: product?.name || '',
        department:   product?.department || '',
        channel,
        period_id,
        entry_type:  e.entry_type,
        offer_value: e.offer_value || null,
        notes:       null,
      };
    });
}