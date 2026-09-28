// src/mocks/chatEngine.js
// ─────────────────────────────────────────────────────────────────────────────
// Port of the keyword-matching assistant that backed `POST /chat/`.
//
// Rules are (keyword patterns, response) pairs — first match wins. Responses
// only ever state facts that exist in the app or in the live context the
// caller passes in; real values are substituted through `injectContext`.
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_RULES = [
  {
    patterns: [/\bgm\b/, /gross.?margin/, /margin/],
    response:
      "GM% (Gross Margin %) measures **(effective selling price − cost) / effective selling price × 100**. " +
      "The plan's PCF threshold is **52.5%** — entries below that are flagged in the Audit tab. " +
      'You can compare GM% across periods, departments, and channels in the **Plan Explorer** section of the Summary tab.',
  },
  {
    patterns: [/\bpcf\b/],
    response:
      'PCF is the gross margin benchmark used in PEMPAL, set at **52.5%**. ' +
      "Every entry's effective selling price is evaluated against it — entries that fall below 52.5% GM " +
      'are highlighted in the Audit tab and require review before the plan is finalised. ' +
      'The PCF reference line is visible as an amber dashed line in the Plan Explorer chart.',
  },
  {
    patterns: [/\bdisc/, /discount/, /depth/],
    response:
      'Discount depth is calculated as **(1 − effective price / ticket price) × 100**. ' +
      'The **Discount Depth Distribution** chart in the Summary tab shows how entries are spread ' +
      'across discount buckets, and you can break it down by period, department, or channel using ' +
      'the toggle above the chart.',
  },
  {
    patterns: [/\baur\b/, /average.?unit.?retail/],
    response:
      '**AUR (Average Unit Retail)** is the average effective selling price across entries. ' +
      "It is computed from each entry's `effectivePx` — which depends on the entry type and offer value " +
      "relative to the product's ticket price. You can plot AUR by period or channel in the **Plan Explorer**.",
  },
  {
    patterns: [/how many.{0,20}entr/, /total.{0,10}entr/, /number.{0,10}entr/, /entr\w*\s+count/],
    response:
      'Your plan currently has **{entries} entries**. ' +
      'The breakdown by type is visible in the **Data Overview** section of the Summary tab, ' +
      'along with how they are distributed across channels.',
  },
  {
    patterns: [/product/, /catalog/, /sku/, /style/],
    response:
      'The catalog contains **{products} products**. ' +
      'Coverage — how many products have at least one entry — is shown in the **Data Overview** cards. ' +
      'Products with no entry in any period are listed as unplanned.',
  },
  {
    patterns: [/channel/, /\bstr\b/, /\bonl\b/, /\bono\b/, /store/, /online/],
    response:
      'Entries are split across the channels in your plan: **{channels}**. ' +
      'The channel breakdown — entry count and period activity per channel — is shown in ' +
      'the **Data Overview** section and in the **Channel Coverage** heatmap.',
  },
  {
    patterns: [/period/, /promo.?period/, /\bp\d\b/, /fiscal/],
    response:
      'Your plan covers **{periods}**. ' +
      'Period-level performance (GM%, AUR, discount depth) can be explored in the **Plan Explorer** ' +
      'by selecting *Promo Period* as the X axis.',
  },
  {
    patterns: [/entry.?type/, /bogo/, /pct.?off/, /price.?pt/, /mupp/, /ticket/],
    response:
      'PEMPAL supports 6 entry types:\n' +
      '- **PCT_OFF** — percentage off the ticket price\n' +
      '- **PRICE_PT** — a fixed effective price point\n' +
      '- **BOGO_FREE** — buy one, get one free\n' +
      '- **BOGO_50** — buy one, get one at 50% off\n' +
      '- **MUPP** — multiple-unit price point\n' +
      '- **TICKET** — full price (no promotion)\n\n' +
      'The entry type mix is shown in the **Data Overview** section of the Summary tab.',
  },
  {
    patterns: [/coverage/, /covered/, /uncovered/, /missing/, /unplanned/],
    response:
      'Coverage is the share of catalog products that have at least one entry in the plan. ' +
      'The **Data Overview** section shows entries by channel with period-activity dots, ' +
      'and the **Channel Coverage** heatmap highlights which product × channel combinations ' +
      'still need entries.',
  },
  {
    patterns: [/vintage/, /\bwp\b/, /\bmf\b/, /\bly\b/, /\bimwp\b/],
    response:
      'The Plan Explorer supports up to 4 vintages — **WP, MF, LY, IMWP** — ' +
      'but only shows the ones that have data in the selected dimension. ' +
      'Toggle them on/off using the chip buttons above the chart to compare versions side by side.',
  },
  {
    patterns: [/summar/, /overview/, /how.{0,15}plan/, /plan.{0,15}look/, /status/],
    response:
      "Here's a quick snapshot of your plan: **{entries} entries** across **{products} products**, " +
      'covering periods **{periods}** and channels **{channels}**. ' +
      'Head to the **Summary tab** for the full breakdown — Plan Performance charts, ' +
      'Data Overview stats, and the Plan Explorer are all there.',
  },
  {
    patterns: [/^h[ei]\b/, /\bhelp\b/, /what can you/, /what do you/],
    response:
      'I can help you with:\n' +
      '- **Plan metrics** — GM%, AUR, discount depth, PCF status\n' +
      '- **Entry details** — types, counts, channel and period breakdown\n' +
      '- **PEMPAL concepts** — entry types, PCF threshold, vintages\n' +
      '- **Navigating the app** — which tab or chart to use for a given question\n\n' +
      'Just ask about your plan data!',
  },
];

const OUT_OF_SCOPE = "I'm focused on your PEMPAL plan data — that question is outside my scope.";


export function chat({ message = '', context = null } = {}) {
  const lower = String(message).toLowerCase().trim();

  for (const rule of DEMO_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(lower))) {
      return injectContext(rule.response, context);
    }
  }
  return OUT_OF_SCOPE;
}


/** Replace {placeholders} with real values from the live context. */
function injectContext(response, context) {
  const ctx = context ?? {};
  const list = (value) => (Array.isArray(value) ? value.join(', ') : String(value ?? ''));

  return response
    .replaceAll('{entries}',  ctx.total_entries  != null ? String(ctx.total_entries)  : '—')
    .replaceAll('{products}', ctx.total_products != null ? String(ctx.total_products) : '—')
    .replaceAll('{periods}',  list(ctx.periods)  || '—')
    .replaceAll('{channels}', list(ctx.channels) || '—');
}
