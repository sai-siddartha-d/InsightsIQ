// src/components/ui/InsightsAssistPanel.jsx
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { pempalApi } from '../../services/api';
import { useInsights } from '../../context/InsightsContext';


// ─── Constants & helpers ──────────────────────────────────────────────────────
const PCF = 52.5;

function effectivePx(type, val, ticket) {
  if (!ticket) return 0;
  switch (type) {
    case 'PCT_OFF':   return ticket * (1 - (val ?? 0) / 100);
    case 'PRICE_PT':  return val ?? ticket;
    case 'BOGO_FREE': return ticket * 0.5;
    case 'BOGO_50':   return ticket * 0.75;
    case 'MUPP':      return val ?? ticket;
    default:          return ticket;
  }
}

const TYPE_LABELS = {
  PCT_OFF: 'Pct Off', PRICE_PT: 'Price Point',
  BOGO_FREE: 'BOGO Free', BOGO_50: 'BOGO 50',
  MUPP: 'MUPP', TICKET: 'Ticket',
};

const TAB_TITLES = {
  summary: 'Summary', promo: 'Promo Details', tod: 'TOD',
  audit: 'Audit', marketed: 'Marketed Rollup',
  fiscal: 'Fiscal Time', hier: 'Hierarchy', season: 'Season Code',
};

function pct(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0; }
function avg(arr)  { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }
function pl(n, w)  { return `${n} ${w}${n === 1 ? '' : 's'}`; }
function fmtList(items) {
  if (!items.length) return 'none';
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

// Build core metrics shared across all generators
function buildMetrics(entries, products, periods) {
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));
  const coveredIds = new Set(entries.map(e => e.product_id));
  const covered    = coveredIds.size;
  const coveragePct = pct(covered, products.length);

  const byCh   = {};
  entries.forEach(e => { if (e.channel) byCh[e.channel] = (byCh[e.channel] || 0) + 1; });
  const chList = Object.entries(byCh).sort((a, b) => b[1] - a[1]);

  const byType = {};
  entries.forEach(e => { byType[e.entry_type] = (byType[e.entry_type] || 0) + 1; });
  const typeList = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  const byPeriod = {};
  periods.forEach(p => { byPeriod[p.id] = 0; });
  entries.forEach(e => { if (e.period_id in byPeriod) byPeriod[e.period_id]++; });
  const activePeriods   = Object.keys(byPeriod).filter(k => byPeriod[k] > 0);
  const inactivePeriods = Object.keys(byPeriod).filter(k => byPeriod[k] === 0);

  // GM + discount depth per entry
  const gmData = [];
  entries.forEach(e => {
    const p = productMap[e.product_id];
    if (!p?.ticket || !p?.auc) return;
    const eff = effectivePx(e.entry_type, e.offer_value, p.ticket);
    if (eff <= 0) return;
    const gm       = (eff - p.auc) / eff * 100;
    const discDepth = (1 - eff / p.ticket) * 100;
    gmData.push({ gm, discDepth, entry: e, product: p, eff });
  });

  const flagged   = gmData.filter(d => d.gm < PCF);
  const avgGm     = avg(gmData.map(d => d.gm));
  const avgDisc   = avg(gmData.map(d => d.discDepth));
  const gmGap     = avgGm != null ? +(avgGm - PCF).toFixed(1) : null;
  const minGmItem = gmData.length ? gmData.reduce((a, b) => a.gm < b.gm ? a : b) : null;
  const maxGmItem = gmData.length ? gmData.reduce((a, b) => a.gm > b.gm ? a : b) : null;

  // Per-type GM averages
  const typeGm = {};
  gmData.forEach(d => {
    const t = d.entry.entry_type;
    typeGm[t] = typeGm[t] ?? [];
    typeGm[t].push(d.gm);
  });
  const typeAvgGm = Object.fromEntries(
    Object.entries(typeGm).map(([t, arr]) => [t, avg(arr)])
  );

  return {
    productMap, coveredIds, covered, coveragePct,
    chList, typeList, byPeriod, activePeriods, inactivePeriods,
    gmData, flagged, avgGm, avgDisc, gmGap,
    minGmItem, maxGmItem, typeAvgGm,
  };
}


// ─── Insight generators per tab ───────────────────────────────────────────────
// Each returns { heading, text, sub? }[] — sub is array of { heading, text }

function genSummary(entries, products, periods) {
  if (!entries.length) return [{
    heading: 'No Data Yet',
    text: `The plan has ${products.length} products across ${periods.length} periods, but no entries have been submitted. Start adding entries in the Promo Details tab to generate insights.`,
  }];

  const m = buildMetrics(entries, products, periods);
  const items = [];

  // 1. Overall Health
  const healthScore = [
    m.coveragePct >= 70,
    m.gmGap != null && m.gmGap >= 0,
    m.flagged.length === 0,
    m.activePeriods.length >= m.inactivePeriods.length,
  ].filter(Boolean).length;

  const healthLabel = healthScore >= 3 ? 'strong' : healthScore === 2 ? 'moderate' : 'needs attention';
  const coverageNote = m.coveragePct >= 80 ? 'near-complete catalog coverage' : m.coveragePct >= 50 ? 'partial catalog coverage' : 'low catalog coverage';
  const gmNote = m.gmGap == null ? '' : m.gmGap >= 5 ? ', with healthy margin headroom above PCF' : m.gmGap >= 0 ? ', with margins close to the PCF floor' : ', with average margin falling below PCF';

  items.push({
    heading: 'Overall Plan Health',
    text: `The PEMPAL plan is in ${healthLabel} shape — ${pl(entries.length, 'entry')} have been submitted, achieving ${coverageNote} at ${m.coveragePct}%${gmNote}. ${m.inactivePeriods.length > 0 ? `${pl(m.inactivePeriods.length, 'period')} still need entries.` : 'All periods are covered.'}`,
  });

  // 2. Coverage
  const covStatus = m.coveragePct >= 80 ? '▲ strong' : m.coveragePct >= 50 ? '▶ moderate' : '▼ low';
  items.push({
    heading: 'Catalog Coverage',
    text: `Coverage is ${covStatus} at ${m.coveragePct}% (${m.covered} of ${products.length} products).`,
    sub: [
      m.covered < products.length
        ? { heading: 'Gap', text: `${pl(products.length - m.covered, 'product')} remain unplanned. Prioritise these in the Promo Details tab — incomplete coverage risks leaving products without a promotional strategy.` }
        : { heading: 'Complete', text: 'Full catalog coverage achieved. All products have at least one entry in the plan.' },
    ],
  });

  // 3. Margin health
  if (m.gmData.length > 0) {
    const gmStatus = m.gmGap >= 5 ? '▲ healthy' : m.gmGap >= 0 ? '▶ tight' : '▼ below target';
    items.push({
      heading: 'Gross Margin Performance',
      text: `Average GM is ${gmStatus} at ${m.avgGm.toFixed(1)}% — ${Math.abs(m.gmGap)}% ${m.gmGap >= 0 ? 'above' : 'below'} the PCF threshold of ${PCF}%.`,
      sub: [
        m.flagged.length === 0
          ? { heading: 'Compliance', text: `All ${m.gmData.length} priced entries meet PCF. The plan is compliant as of now.` }
          : { heading: 'Risk', text: `${pl(m.flagged.length, 'entry')} (${pct(m.flagged.length, m.gmData.length)}%) fall below PCF. ${m.gmGap < 0 ? 'The overall average is also below threshold — broad pricing review needed.' : 'The average is above PCF but individual entries need correction in the Audit tab.'}` },
        m.maxGmItem ? { heading: 'Best GM', text: `Highest GM entry is ${TYPE_LABELS[m.maxGmItem.entry.entry_type] || m.maxGmItem.entry.entry_type} at ${m.maxGmItem.gm.toFixed(1)}%.` } : null,
      ].filter(Boolean),
    });
  }

  // 4. Offer strategy
  if (m.typeList.length > 0) {
    const topType = m.typeList[0];
    const topShare = pct(topType[1], entries.length);
    const strategyRead = topType[0] === 'PCT_OFF' ? 'price-led (discount-driven)'
      : topType[0] === 'PRICE_PT' ? 'value-anchored (fixed price point)'
      : topType[0].startsWith('BOGO') ? 'unit-driving (BOGO-led)'
      : 'mixed';
    items.push({
      heading: 'Offer Strategy',
      text: `The plan is ${strategyRead}, with ${TYPE_LABELS[topType[0]]} accounting for ${topShare}% of all entries.`,
      sub: m.typeList.length > 1 ? [{
        heading: 'Type Spread',
        text: `${pl(m.typeList.length, 'entry type')} in use: ${fmtList(m.typeList.map(([t]) => TYPE_LABELS[t] || t))}. ${m.typeList.length >= 4 ? 'Good variety in offer mechanics.' : 'Consider diversifying offer types to avoid over-reliance on one mechanic.'}`,
      }] : [],
    });
  }

  // 5. Channel balance
  if (m.chList.length > 0) {
    const topShare = pct(m.chList[0][1], entries.length);
    const balanced = topShare < 60;
    items.push({
      heading: 'Channel Distribution',
      text: `${m.chList[0][0]} leads with ${topShare}% of entries. ${balanced ? 'Distribution across channels is relatively balanced.' : `High concentration in ${m.chList[0][0]} — verify this reflects planned channel strategy rather than a planning gap.`}`,
      sub: m.chList.map(([ch, cnt]) => ({
        heading: ch,
        text: `${cnt} entries (${pct(cnt, entries.length)}%)${m.typeAvgGm ? ` — channel-specific GM data available in the Audit tab` : ''}.`,
      })),
    });
  }

  // 6. Discount depth
  if (m.avgDisc != null) {
    const discRead = m.avgDisc > 40 ? 'aggressive' : m.avgDisc > 20 ? 'moderate' : 'conservative';
    items.push({
      heading: 'Discount Depth',
      text: `Average discount depth is ${m.avgDisc.toFixed(1)}% — ${discRead} promotional activity. ${m.avgDisc > 40 ? 'Deep discounts may drive volume but compress margin — ensure PCF compliance holds.' : m.avgDisc < 15 ? 'Shallow discounts preserve ticket price integrity but may limit promotional appeal.' : 'Discount levels are in a healthy range for in-season promotions.'}`,
    });
  }

  return items;
}

function genAudit(entries, products) {
  if (!entries.length) return [{ heading: 'No Entries', text: 'No entries have been submitted yet. The audit will populate once entries are added.' }];

  const m = buildMetrics(entries, products, []);

  if (!m.gmData.length) return [{ heading: 'Incomplete Pricing Data', text: 'None of the current entries have both ticket price and AUC data available. Ensure products are configured with pricing data to run a PCF audit.' }];

  const items = [];
  const complianceRate = pct(m.gmData.length - m.flagged.length, m.gmData.length);
  const riskLevel = complianceRate >= 95 ? 'low risk' : complianceRate >= 75 ? 'moderate risk' : 'high risk';

  // 1. Compliance overview
  items.push({
    heading: 'PCF Compliance Overview',
    text: `${complianceRate}% of priced entries pass the ${PCF}% threshold — ${riskLevel}. ${m.gmData.length - m.flagged.length} entries pass, ${pl(m.flagged.length, 'entry')} ${m.flagged.length === 1 ? 'requires' : 'require'} review.`,
    sub: m.flagged.length > 0 ? [{
      heading: 'Action Required',
      text: `${m.flagged.length > 1 ? 'These entries need' : 'This entry needs'} pricing adjustments or margin approvals before the plan can be submitted for sign-off.`,
    }] : [{ heading: 'Status', text: 'No action required — all entries are PCF-compliant.' }],
  });

  // 2. GM spread
  const spread = +(m.maxGmItem.gm - m.minGmItem.gm).toFixed(1);
  const spreadRead = spread > 30 ? 'wide' : spread > 15 ? 'moderate' : 'tight';
  items.push({
    heading: 'Margin Spread Analysis',
    text: `GM ranges from ${m.minGmItem.gm.toFixed(1)}% to ${m.maxGmItem.gm.toFixed(1)}% — a ${spreadRead} ${spread}pp spread.`,
    sub: [
      { heading: 'Average', text: `${m.avgGm.toFixed(1)}% average GM, ${Math.abs(m.gmGap)}% ${m.gmGap >= 0 ? 'above' : 'below'} PCF floor.` },
      spread > 25 ? { heading: 'Variability', text: 'High variability suggests inconsistent pricing strategy across products or channels. Investigate outliers at both ends.' } : { heading: 'Consistency', text: 'Margin levels are relatively consistent, indicating a coherent pricing approach.' },
    ],
  });

  // 3. Highest risk entry
  if (m.minGmItem && m.minGmItem.gm < PCF) {
    const gap = +(PCF - m.minGmItem.gm).toFixed(1);
    const entryType = TYPE_LABELS[m.minGmItem.entry.entry_type] || m.minGmItem.entry.entry_type;
    items.push({
      heading: 'Highest Risk Entry',
      text: `The lowest GM entry is a ${entryType} at ${m.minGmItem.gm.toFixed(1)}% — ${gap}pp below PCF.`,
      sub: [
        { heading: 'Product', text: `Product ID ${m.minGmItem.entry.product_id}, channel ${m.minGmItem.entry.channel ?? '—'}, period ${m.minGmItem.entry.period_id ?? '—'}.` },
        { heading: 'Fix', text: `To bring this to PCF, the offer value needs to be adjusted to yield at least ${((m.minGmItem.product.ticket - m.minGmItem.product.auc) / m.minGmItem.product.ticket * 100).toFixed(1)}% effective GM at full ticket — or a margin exception is required.` },
      ],
    });
  }

  // 4. Type failure pattern
  if (m.flagged.length > 0) {
    const byType = {};
    m.flagged.forEach(f => { byType[f.entry.entry_type] = (byType[f.entry.entry_type] || 0) + 1; });
    const topFailType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
    const typeAvg = m.typeAvgGm[topFailType[0]];
    items.push({
      heading: 'Offer Type Pattern',
      text: `${TYPE_LABELS[topFailType[0]] || topFailType[0]} accounts for ${pl(topFailType[1], 'flagged entry')} (${pct(topFailType[1], m.flagged.length)}% of all flags)${typeAvg != null ? `, with an average GM of ${typeAvg.toFixed(1)}%` : ''}.`,
      sub: [{
        heading: 'Insight',
        text: typeAvg != null && typeAvg < PCF
          ? `This entry type is structurally below PCF on average — the current cost structure (AUC) may not support this offer mechanic. Consider switching to a less deep promotional type.`
          : `Most flags are concentrated in this type but the type averages above PCF — individual offer values may be too aggressive. Review the specific offer_value settings.`,
      }],
    });
  }

  // 5. Best performing type
  const bestType = Object.entries(m.typeAvgGm).sort((a, b) => b[1] - a[1])[0];
  if (bestType) {
    items.push({
      heading: 'Best Margin Mechanic',
      text: `${TYPE_LABELS[bestType[0]] || bestType[0]} delivers the highest average GM at ${bestType[1].toFixed(1)}% — ${bestType[1].toFixed(1) - PCF > 0 ? `${(bestType[1] - PCF).toFixed(1)}pp above PCF` : 'at or near PCF'}. ${m.flagged.length > 0 ? 'Shifting more entries to this type would reduce compliance risk.' : 'Maintaining this mechanic\'s share supports plan health.'}`,
    });
  }

  return items;
}

function genPromo(entries, products, periods) {
  if (!entries.length) return [{ heading: 'No Entries Yet', text: `${products.length} products are available to plan across ${periods.length} periods. Begin adding entries using the form above.` }];

  const m = buildMetrics(entries, products, periods);

  const withPricing = entries.filter(e => {
    const p = m.productMap[e.product_id];
    return p?.ticket && p?.auc;
  });
  const pricingRate = pct(withPricing.length, entries.length);

  // Multi-channel products
  const productChannels = {};
  entries.forEach(e => {
    productChannels[e.product_id] = productChannels[e.product_id] ?? new Set();
    if (e.channel) productChannels[e.product_id].add(e.channel);
  });
  const multiChannel = Object.entries(productChannels).filter(([, s]) => s.size > 1);

  const items = [];

  // 1. Submission progress
  const progressLabel = m.coveragePct >= 80 ? '▲ advanced' : m.coveragePct >= 50 ? '▶ in progress' : '▼ early stage';
  items.push({
    heading: 'Submission Progress',
    text: `Plan submission is ${progressLabel} — ${m.covered} of ${products.length} products covered (${m.coveragePct}%). ${pl(entries.length, 'entry')} recorded across ${pl(m.activePeriods.length, 'period')} and ${pl(m.chList.length, 'channel')}.`,
    sub: m.inactivePeriods.length > 0 ? [{
      heading: 'Missing Periods',
      text: `No entries yet for ${fmtList(m.inactivePeriods)} — fill these to complete the fiscal calendar.`,
    }] : [{ heading: 'Status', text: 'All periods have at least one entry.' }],
  });

  // 2. Pricing data completeness
  items.push({
    heading: 'Pricing Data Completeness',
    text: `${pricingRate}% of entries have full pricing data (ticket + AUC) available for GM% calculation.`,
    sub: pricingRate < 100 ? [{
      heading: 'Impact',
      text: `${pl(entries.length - withPricing.length, 'entry')} cannot be audited for PCF compliance until the underlying products have both ticket price and AUC configured.`,
    }] : [{ heading: 'Data Quality', text: 'All entries have complete pricing data — the Audit tab will show full GM% coverage.' }],
  });

  // 3. Best vs worst type by GM
  const sorted = Object.entries(m.typeAvgGm).sort((a, b) => b[1] - a[1]);
  if (sorted.length >= 2) {
    items.push({
      heading: 'Margin by Entry Type',
      text: `${TYPE_LABELS[sorted[0][0]]} delivers the best margin at ${sorted[0][1].toFixed(1)}% avg GM. ${TYPE_LABELS[sorted[sorted.length - 1][0]]} has the lowest at ${sorted[sorted.length - 1][1].toFixed(1)}%.`,
      sub: [{
        heading: 'Recommendation',
        text: `${sorted[sorted.length - 1][1] < PCF ? `${TYPE_LABELS[sorted[sorted.length - 1][0]]} entries average below PCF — consider whether this mechanic is viable for the current cost structure.` : 'All entry types average above PCF — offer mechanics are well-matched to product cost structure.'}`,
      }],
    });
  }

  // 4. Multi-channel products
  if (multiChannel.length > 0) {
    items.push({
      heading: 'Cross-Channel Products',
      text: `${pl(multiChannel.length, 'product')} ${multiChannel.length === 1 ? 'is' : 'are'} planned across multiple channels — this represents ${pct(multiChannel.length, products.length)}% of the catalog.`,
      sub: [{ heading: 'Note', text: 'Ensure cross-channel offer values are consistent or deliberately differentiated per channel strategy.' }],
    });
  }

  return items;
}

function genTod(entries, products, periods) {
  if (!entries.length) return [{ heading: 'Empty Table', text: 'No entries to display in the TOD view. Submit entries to see the detailed breakdown.' }];

  const m = buildMetrics(entries, products, periods);

  // Per-period per-channel density
  const grid = {};
  entries.forEach(e => {
    const k = `${e.period_id}|${e.channel}`;
    grid[k] = (grid[k] || 0) + 1;
  });
  const gridSorted = Object.entries(grid).sort((a, b) => b[1] - a[1]);
  const densest    = gridSorted[0];
  const sparsest   = gridSorted[gridSorted.length - 1];

  const items = [];

  items.push({
    heading: 'Table Overview',
    text: `The TOD shows ${pl(entries.length, 'entry')} across ${pl(Object.keys(grid).length, 'period–channel combination')}, out of a possible ${pl(periods.length * m.chList.length, 'combination')}.`,
    sub: [{
      heading: 'Density',
      text: `${pct(Object.keys(grid).length, periods.length * Math.max(m.chList.length, 1))}% of period–channel cells are populated. ${Object.keys(grid).length < periods.length * m.chList.length ? 'Empty cells indicate gaps in promotional coverage.' : 'Full cell coverage achieved.'}`,
    }],
  });

  if (densest) {
    const [pid, ch] = densest[0].split('|');
    items.push({
      heading: 'Highest Concentration',
      text: `Period ${pid} × ${ch} has the most entries (${densest[1]}), accounting for ${pct(densest[1], entries.length)}% of the plan. ${densest[1] / entries.length > 0.3 ? 'High concentration in one cell — verify this is intentional and not a data entry issue.' : 'Concentration is within a normal range.'}`,
    });
  }

  // Period imbalance
  const periodCounts = Object.entries(m.byPeriod).sort((a, b) => b[1] - a[1]);
  if (periodCounts.length >= 2 && periodCounts[0][1] > 0) {
    const ratio = periodCounts[0][1] / Math.max(periodCounts[periodCounts.length - 1][1], 1);
    items.push({
      heading: 'Period Balance',
      text: `${periodCounts[0][0]} has the most entries (${periodCounts[0][1]}), while ${periodCounts[periodCounts.length - 1][0]} has the least (${periodCounts[periodCounts.length - 1][1]}).`,
      sub: [{
        heading: ratio > 3 ? 'Imbalance Detected' : 'Balance',
        text: ratio > 3
          ? `Entry count varies ${ratio.toFixed(1)}× between periods — this level of imbalance may indicate uneven promotional investment across the fiscal calendar.`
          : 'Entry counts are reasonably balanced across periods.',
      }],
    });
  }

  return items;
}

function genMarketed(entries, products, periods) {
  if (!entries.length) return [{ heading: 'No Data', text: 'No entries to roll up. Add entries in the Promo Details tab first.' }];

  const m = buildMetrics(entries, products, periods);
  const items = [];

  const covPct = m.coveragePct;
  items.push({
    heading: 'Rollup Summary',
    text: `${pl(entries.length, 'marketed entry')} rolled up across ${pl(m.chList.length, 'channel')} and ${pl(m.activePeriods.length, 'active period')}, covering ${covPct}% of the catalog.`,
    sub: m.chList.map(([ch, cnt]) => ({
      heading: ch,
      text: `${cnt} marketed offers (${pct(cnt, entries.length)}% of total rollup).`,
    })),
  });

  if (m.avgGm != null) {
    items.push({
      heading: 'Marketed GM Performance',
      text: `Across all marketed offers, average GM is ${m.avgGm.toFixed(1)}% — ${m.gmGap >= 0 ? `${m.gmGap}pp above PCF` : `${Math.abs(m.gmGap)}pp below PCF`}. ${m.flagged.length > 0 ? `${m.flagged.length} marketed entries are PCF non-compliant.` : 'All marketed entries are PCF-compliant.'}`,
    });
  }

  if (m.inactivePeriods.length > 0) {
    items.push({
      heading: 'Rollup Gaps',
      text: `${pl(m.inactivePeriods.length, 'period')} has no marketed offers: ${fmtList(m.inactivePeriods)}. These periods will appear empty in the rollup view.`,
    });
  }

  return items;
}

function genFiscal(entries, periods) {
  if (!periods.length) return [{ heading: 'No Periods', text: 'No fiscal periods have been configured for this plan.' }];

  const byPeriod = {};
  periods.forEach(p => { byPeriod[p.id] = 0; });
  entries.forEach(e => { if (e.period_id in byPeriod) byPeriod[e.period_id]++; });

  const sorted   = Object.entries(byPeriod).sort(([a], [b]) => a.localeCompare(b));
  const active   = sorted.filter(([, v]) => v > 0);
  const inactive = sorted.filter(([, v]) => v === 0);
  const peak     = sorted.reduce((a, b) => b[1] > a[1] ? b : a, ['—', 0]);
  const items    = [];

  items.push({
    heading: 'Fiscal Calendar Coverage',
    text: `${pl(active.length, 'period')} of ${periods.length} ${active.length === 1 ? 'has' : 'have'} entries — ${pct(active.length, periods.length)}% of the fiscal calendar is planned.`,
    sub: inactive.length > 0 ? [{
      heading: 'Unplanned Periods',
      text: `${fmtList(inactive.map(([k]) => k))} ${inactive.length === 1 ? 'has' : 'have'} no entries. These need to be filled before the plan can be considered complete.`,
    }] : [{ heading: 'Status', text: 'All fiscal periods have at least one entry.' }],
  });

  if (entries.length > 0) {
    // Front-loading analysis
    const midIndex  = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midIndex).reduce((s, [, v]) => s + v, 0);
    const secondHalf = sorted.slice(midIndex).reduce((s, [, v]) => s + v, 0);
    const frontLoaded = firstHalf > secondHalf * 1.5;
    const backLoaded  = secondHalf > firstHalf * 1.5;

    items.push({
      heading: 'Entry Distribution Shape',
      text: frontLoaded
        ? `The plan is front-loaded — ${firstHalf} entries in the first half vs ${secondHalf} in the second. This indicates heavy early-season promotional activity.`
        : backLoaded
        ? `The plan is back-loaded — ${secondHalf} entries in the second half vs ${firstHalf} in the first. Promotional activity increases toward the end of the season.`
        : `Entries are relatively evenly distributed across periods (${firstHalf} first half, ${secondHalf} second half), indicating a balanced promotional cadence.`,
    });

    if (peak[1] > 0) {
      items.push({
        heading: 'Peak Period',
        text: `${peak[0]} has the highest entry count at ${peak[1]} entries (${pct(peak[1], entries.length)}% of the plan). This is the most promotional period in the calendar.`,
      });
    }
  }

  return items;
}

function genHier(entries, products) {
  if (!products.length) return [{ heading: 'No Products', text: 'No products are available in the catalog.' }];

  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  // Department coverage
  const deptMap = {};
  products.forEach(p => {
    if (!p.department) return;
    deptMap[p.department] = deptMap[p.department] ?? { total: 0, covered: new Set(), gms: [] };
    deptMap[p.department].total++;
  });
  entries.forEach(e => {
    const p = productMap[e.product_id];
    if (!p?.department) return;
    deptMap[p.department]?.covered.add(e.product_id);
    if (p.ticket && p.auc) {
      const eff = effectivePx(e.entry_type, e.offer_value, p.ticket);
      if (eff > 0) deptMap[p.department]?.gms.push((eff - p.auc) / eff * 100);
    }
  });

  const deptList = Object.entries(deptMap)
    .map(([dept, d]) => ({
      dept,
      total:    d.total,
      covered:  d.covered.size,
      covPct:   pct(d.covered.size, d.total),
      avgGm:    avg(d.gms),
    }))
    .sort((a, b) => b.total - a.total);

  const items = [];

  if (!deptList.length) return [{ heading: 'No Department Data', text: 'Products do not have department attributes configured.' }];

  const overallCovPct = pct(new Set(entries.map(e => e.product_id)).size, products.length);
  items.push({
    heading: 'Department Coverage Summary',
    text: `The catalog spans ${pl(deptList.length, 'department')} with ${pl(products.length, 'product')} total. Overall coverage is ${overallCovPct}%.`,
    sub: deptList.map(d => ({
      heading: d.dept,
      text: `${d.covered} of ${d.total} products planned (${d.covPct}%)${d.avgGm != null ? ` — avg GM ${d.avgGm.toFixed(1)}%` : ''}.`,
    })),
  });

  const weakest = [...deptList].sort((a, b) => a.covPct - b.covPct)[0];
  const strongest = [...deptList].sort((a, b) => b.covPct - a.covPct)[0];
  if (weakest && weakest.covPct < 100) {
    items.push({
      heading: 'Weakest Department',
      text: `${weakest.dept} has the lowest coverage at ${weakest.covPct}% (${weakest.covered} of ${weakest.total} products). Prioritising this department would have the largest positive impact on overall plan completeness.`,
    });
  }
  if (strongest && strongest !== weakest) {
    items.push({
      heading: 'Strongest Department',
      text: `${strongest.dept} leads with ${strongest.covPct}% coverage${strongest.avgGm != null ? ` and ${strongest.avgGm.toFixed(1)}% average GM` : ''}.`,
    });
  }

  // Best GM department
  const deptsByGm = deptList.filter(d => d.avgGm != null).sort((a, b) => b.avgGm - a.avgGm);
  if (deptsByGm.length >= 2) {
    items.push({
      heading: 'Margin by Department',
      text: `${deptsByGm[0].dept} delivers the best margin at ${deptsByGm[0].avgGm.toFixed(1)}% avg GM. ${deptsByGm[deptsByGm.length - 1].dept} is lowest at ${deptsByGm[deptsByGm.length - 1].avgGm.toFixed(1)}%.`,
      sub: [{
        heading: deptsByGm[deptsByGm.length - 1].avgGm < PCF ? 'Risk' : 'Note',
        text: deptsByGm[deptsByGm.length - 1].avgGm < PCF
          ? `${deptsByGm[deptsByGm.length - 1].dept} averages below PCF — this department's entries should be reviewed in the Audit tab.`
          : 'All departments average above the PCF threshold.',
      }],
    });
  }

  return items;
}

function genSeason(entries, products) {
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  const pSeasonMap = {};
  products.forEach(p => {
    const sc = p?.season_code ?? p?.seasonCode ?? null;
    if (!sc) return;
    pSeasonMap[sc] = (pSeasonMap[sc] || 0) + 1;
  });

  const eSeasonMap = {};
  const seasonGm   = {};
  entries.forEach(e => {
    const p  = productMap[e.product_id];
    const sc = p?.season_code ?? p?.seasonCode ?? null;
    if (!sc) return;
    eSeasonMap[sc] = (eSeasonMap[sc] || 0) + 1;
    if (p.ticket && p.auc) {
      const eff = effectivePx(e.entry_type, e.offer_value, p.ticket);
      if (eff > 0) {
        seasonGm[sc] = seasonGm[sc] ?? [];
        seasonGm[sc].push((eff - p.auc) / eff * 100);
      }
    }
  });

  const items = [];
  const pSeasonList = Object.entries(pSeasonMap).sort((a, b) => b[1] - a[1]);
  const eSeasonList = Object.entries(eSeasonMap).sort((a, b) => b[1] - a[1]);

  if (!pSeasonList.length) return [{ heading: 'No Season Data', text: 'Products do not have season code attributes configured. Assign season codes to products to enable this view.' }];

  items.push({
    heading: 'Season Code Catalog',
    text: `The catalog spans ${pl(pSeasonList.length, 'season code')}. ${pSeasonList[0][0]} is the largest at ${pct(pSeasonList[0][1], products.length)}% of products (${pSeasonList[0][1]}).`,
    sub: pSeasonList.map(([sc, cnt]) => ({
      heading: sc,
      text: `${cnt} products (${pct(cnt, products.length)}% of catalog).`,
    })),
  });

  if (eSeasonList.length > 0) {
    items.push({
      heading: 'Entries by Season Code',
      text: `${pl(entries.length, 'entry')} spread across ${pl(eSeasonList.length, 'season code')}.`,
      sub: eSeasonList.map(([sc, cnt]) => {
        const gAvg = avg(seasonGm[sc] ?? []);
        return {
          heading: sc,
          text: `${cnt} entries (${pct(cnt, entries.length)}%)${gAvg != null ? ` — avg GM ${gAvg.toFixed(1)}%${gAvg < PCF ? ' ▼ below PCF' : ' ▲'}` : ''}.`,
        };
      }),
    });

    const unseasonedProducts = products.filter(p => !(p?.season_code ?? p?.seasonCode));
    if (unseasonedProducts.length > 0) {
      items.push({ heading: 'Missing Season Codes', text: `${pl(unseasonedProducts.length, 'product')} lack a season code and will not appear in the Season Code breakdown.` });
    }
  } else if (entries.length > 0) {
    items.push({ heading: 'Season Code Coverage', text: 'None of the current entries can be mapped to a season code — ensure products have season codes assigned.' });
  }

  return items;
}

const TAB_GENERATORS = {
  summary:  (e, p, pr) => genSummary(e, p, pr),
  promo:    (e, p, pr) => genPromo(e, p, pr),
  tod:      (e, p, pr) => genTod(e, p, pr),
  audit:    (e, p)     => genAudit(e, p),
  marketed: (e, p, pr) => genMarketed(e, p, pr),
  fiscal:   (e, _, pr) => genFiscal(e, pr),
  hier:     (e, p)     => genHier(e, p),
  season:   (e, p)     => genSeason(e, p),
};


// ─── Insight list renderer ────────────────────────────────────────────────────
function InsightList({ items }) {
  if (!items.length) return <p className="text-[11px] text-neutral-400">No insights available.</p>;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-neutral-100 bg-neutral-50/80 overflow-hidden">
          <div className="px-3 pt-2.5 pb-2">
            <div className="flex items-start gap-2">
              <span className="mt-[4px] w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-neutral-800 leading-snug">{item.heading}</p>
                <p className="text-[10.5px] text-neutral-600 leading-relaxed mt-0.5">{item.text}</p>
              </div>
            </div>
            {item.sub?.length > 0 && (
              <div className="mt-2 ml-3.5 space-y-1">
                {item.sub.map((s, j) => (
                  <div key={j} className="flex gap-1.5 items-start bg-white rounded border border-neutral-100 px-2 py-1.5">
                    <span className="mt-[4px] w-1 h-1 rounded-full border border-neutral-300 flex-shrink-0" />
                    <p className="text-[10px] text-neutral-600 leading-relaxed min-w-0">
                      <strong className="font-medium text-neutral-700">{s.heading}:</strong>{' '}{s.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


// ─── LY / LLY reference section ──────────────────────────────────────────────
const _IAP_LLY_OFFS = [-2.1, 1.3, -0.8, 1.7, -1.5, 0.6, -1.2, 2.0, -0.4, 1.1];
function _iapSample(base, idx) {
  if (base == null) return null;
  return +(base + _IAP_LLY_OFFS[((idx % 10) + 10) % 10]).toFixed(1);
}

function LyLlyRefSection({ tabId, metrics }) {
  if (!metrics || metrics.covered === 0) return null;

  const seed = tabId.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  const s = seed % 10;

  const lyGm    = _iapSample(metrics.avgGm,         s);
  const llyGm   = _iapSample(metrics.avgGm,    (s + 4) % 10);
  const lyDisc  = _iapSample(metrics.avgDisc,  (s + 2) % 10);
  const llyDisc = _iapSample(metrics.avgDisc,  (s + 6) % 10);
  const lyCov   = Math.max(0, Math.min(100, Math.round(metrics.coveragePct + (_IAP_LLY_OFFS[(s + 1) % 10] * 2))));
  const llyCov  = Math.max(0, Math.min(100, Math.round(metrics.coveragePct + (_IAP_LLY_OFFS[(s + 5) % 10] * 2))));

  const rows = [
    { label: 'Avg GM%',    cur: metrics.avgGm  != null ? metrics.avgGm.toFixed(1)  + '%' : '—', ly: lyGm   != null ? lyGm   + '%' : '—', lly: llyGm  != null ? llyGm  + '%' : '—' },
    { label: 'Coverage',   cur: metrics.coveragePct + '%', ly: lyCov + '%',  lly: llyCov + '%' },
    { label: 'Disc Depth', cur: metrics.avgDisc != null ? metrics.avgDisc.toFixed(1) + '%' : '—', ly: lyDisc != null ? lyDisc.toFixed(1) + '%' : '—', lly: llyDisc != null ? llyDisc.toFixed(1) + '%' : '—' },
  ];

  return (
    <div className="mt-4 rounded-xl border border-neutral-100 overflow-hidden">
      <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-neutral-600">Year-over-Year Reference</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span className="text-[9px] text-emerald-600 font-medium">LY</span>
          <span className="w-2 h-2 rounded-full bg-violet-400 inline-block ml-0.5" />
          <span className="text-[9px] text-violet-600 font-medium">LLY</span>
        </div>
        <span className="text-[8.5px] text-neutral-400 italic">sample data</span>
      </div>
      <div className="p-2.5 bg-white">
        <div className="grid grid-cols-4 gap-1 text-[9px] font-semibold mb-1.5 px-2">
          <span className="text-neutral-400">Metric</span>
          <span className="text-neutral-600 text-center">CY</span>
          <span className="text-emerald-600 text-center">LY</span>
          <span className="text-violet-600 text-center">LLY</span>
        </div>
        <div className="space-y-1">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-4 gap-1 rounded border border-neutral-100 bg-neutral-50/50 px-2 py-1.5 text-[9.5px]">
              <span className="text-neutral-500">{r.label}</span>
              <span className="text-neutral-700 font-medium text-center tabular-nums">{r.cur}</span>
              <span className="text-emerald-600 text-center tabular-nums">{r.ly}</span>
              <span className="text-violet-600 text-center tabular-nums">{r.lly}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── PEMPAL content ───────────────────────────────────────────────────────────
function PempalContent({ tabId }) {
  const [loadState, setLoadState] = useState('loading');
  const [entries,   setEntries]   = useState([]);
  const [products,  setProducts]  = useState([]);
  const [periods,   setPeriods]   = useState([]);
  const [copied,    setCopied]    = useState(false);

  useEffect(() => {
    setLoadState('loading');
    Promise.all([
      pempalApi.getEntries().catch(() => []),
      pempalApi.getProducts().catch(() => []),
      pempalApi.getPeriods().catch(() => []),
    ]).then(([e, p, pr]) => {
      setEntries(e ?? []);
      setProducts(p ?? []);
      setPeriods(pr ?? []);
      setLoadState('ready');
    }).catch(() => setLoadState('error'));
  }, []);

  const items = useMemo(() => {
    if (loadState !== 'ready') return [];
    const gen = TAB_GENERATORS[tabId] ?? TAB_GENERATORS.summary;
    return gen(entries, products, periods);
  }, [loadState, tabId, entries, products, periods]);

  const metrics = useMemo(() => {
    if (loadState !== 'ready' || !entries.length) return null;
    return buildMetrics(entries, products, periods);
  }, [loadState, entries, products, periods]);

  const handleCopy = () => {
    const text = items.map(item => {
      const lines = [`• ${item.heading}: ${item.text}`];
      item.sub?.forEach(s => lines.push(`  ◦ ${s.heading}: ${s.text}`));
      return lines.join('\n');
    }).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loadState === 'loading') {
    return (
      <div className="space-y-3.5">
        {[70, 90, 55, 80, 65].map((w, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2 rounded bg-neutral-100 animate-pulse w-1/3" />
            <div className="h-2 rounded bg-neutral-100 animate-pulse" style={{ width: `${w}%` }} />
            <div className="h-2 rounded bg-neutral-100 animate-pulse" style={{ width: `${w - 15}%` }} />
          </div>
        ))}
      </div>
    );
  }

  if (loadState === 'error') {
    return <p className="text-[11px] text-neutral-400 text-center pt-6">Could not load plan data.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <span className="text-[11px] font-semibold text-neutral-600">
            {TAB_TITLES[tabId] ?? 'Insights'} — Key Insights
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          title="Copy to clipboard"
          className="flex items-center gap-1 text-[9.5px] text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          {copied
            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="h-px bg-neutral-100 mb-3" />

      <InsightList items={items} />
      <LyLlyRefSection tabId={tabId} metrics={metrics} />
    </div>
  );
}


// ─── Generic page content ─────────────────────────────────────────────────────
const GENERIC = {
  '/': 'The Dashboard is your central navigation hub, showing all available modules and their status. Navigate to a module to see page-specific insights.',
  '/modules/krypton': 'Krypton is the pre-season investment planning tool. This module is in placeholder status — insights are not yet available.',
  '/modules/simple-suite': 'Simple Suite is a pre-season and in-season planning workbench. This module is in placeholder status — insights are not yet available.',
};

function GenericContent({ pathname }) {
  const body = GENERIC[pathname] ?? 'Navigate to the PEMPAL module to see live plan insights.';
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span className="text-[11px] font-semibold text-neutral-600">Page Summary</span>
      </div>
      <div className="h-px bg-neutral-100 mb-3" />
      <p className="text-[11px] text-neutral-500 leading-relaxed">{body}</p>
    </div>
  );
}


// ─── Panel shell ──────────────────────────────────────────────────────────────
export default function InsightsAssistPanel({ open, onClose, pathname }) {
  const { tab: insightsTab } = useInsights();
  const isPempal  = pathname === '/modules/pempal' || pathname.startsWith('/modules/pempal/');
  const activeTab = (isPempal && insightsTab?.module === 'pempal') ? insightsTab.tab : 'summary';

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const tabLabel = isPempal ? (TAB_TITLES[activeTab] ?? 'Summary') : null;

  const panel = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.18)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 220ms ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, height: '100%', width: 340,
          zIndex: 9999,
          background: '#fff',
          borderLeft: '1px solid #e4e4e7',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 270ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div
          style={{ background: 'linear-gradient(135deg, #1B4F9C 0%, #163F82 60%, #112F68 100%)', flexShrink: 0 }}
          className="flex items-center gap-2 px-4 py-3"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          <span className="text-[12.5px] font-semibold text-white flex-1 leading-none">Insights Assist</span>
          <span className="text-[9px] font-bold text-primary-200 bg-white/10 border border-white/20 px-1.5 py-0.5 rounded-full tracking-wide">BETA</span>
          {tabLabel && (
            <span className="text-[9.5px] text-primary-200 bg-white/10 border border-white/15 px-1.5 py-0.5 rounded-full ml-0.5">{tabLabel}</span>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            style={{
              cursor: 'pointer', background: 'none', border: 'none',
              padding: '4px', borderRadius: '5px',
              color: 'rgba(255,255,255,0.55)',
              display: 'flex', alignItems: 'center', marginLeft: 4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* AI disclaimer — with background */}
        <div
          style={{ flexShrink: 0, background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}
          className="px-4 py-2 flex items-center gap-1.5"
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-[10px] text-amber-700 font-medium">AI can make mistakes, please verify before use.</p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          {open && (
            isPempal
              ? <PempalContent key={activeTab} tabId={activeTab} />
              : <GenericContent pathname={pathname} />
          )}
        </div>

        {/* Footer */}
        <div
          style={{ flexShrink: 0 }}
          className="px-4 py-2.5 border-t border-neutral-100 flex items-center justify-between"
        >
          <p className="text-[9px] text-neutral-300 italic">Based on live plan data</p>
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] px-2.5 py-1 rounded-md border border-neutral-200 text-neutral-400 hover:bg-neutral-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
