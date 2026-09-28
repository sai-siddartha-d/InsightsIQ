// src/utils/exportPpt.js
import PptxGenJS from 'pptxgenjs';
import html2canvas from 'html2canvas';

// ─── Athleta theme constants (no leading #) ────────────────────────────────
const TEAL        = '024A62';
const TEAL_MED    = '3A8AA0';
const TEAL_LIGHT  = 'EBF3F5';
const TEAL_BORDER = 'C8DDE2';
const TEAL_DARK   = '012E3D';
const WHITE       = 'FFFFFF';
const DANGER      = 'BC0712';
const TEXT_DARK   = '1A3A42';
const TEXT_MUTED  = '7AA4AE';
const FONT        = 'Calibri'; // closest PPTX-safe match to DM Sans

// ─── Screenshot a DOM element as base64 PNG ───────────────────────────────
async function screenshotElement(el) {
  if (!el) return null;
  try {
    const canvas = await html2canvas(el, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

// ─── Add a full-width teal title bar to a slide ───────────────────────────
function addTitleBar(pptx, slide, title, subtitle = '') {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.72,
    fill: { color: TEAL },
  });
  slide.addText(title, {
    x: 0.4, y: 0.08, w: 12.5, h: 0.56,
    fontSize: 13, bold: true, color: WHITE,
    fontFace: FONT, valign: 'middle',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4, y: 0.76, w: 12.5, h: 0.32,
      fontSize: 10, color: TEAL_MED, fontFace: FONT,
    });
  }
}

// ─── Slide 1: Cover ────────────────────────────────────────────────────────
function addCoverSlide(pptx, { userName, dateStr }) {
  const slide = pptx.addSlide();
  slide.background = { color: TEAL };

  slide.addText('Athleta · Gap Inc.', {
    x: 0.6, y: 0.55, w: 12, h: 0.35,
    fontSize: 9, color: WHITE, fontFace: FONT, transparency: 40,
  });
  slide.addText('PEMPAL', {
    x: 0.6, y: 1.1, w: 10, h: 1.2,
    fontSize: 56, bold: true, color: WHITE, fontFace: FONT,
  });
  slide.addText('Planning Report', {
    x: 0.6, y: 2.3, w: 10, h: 0.6,
    fontSize: 24, color: 'D5E4E2', fontFace: FONT,
  });
  slide.addText('FY26 · In-Season Promotion Planning', {
    x: 0.6, y: 3.05, w: 10, h: 0.4,
    fontSize: 12, color: 'AAC8D0', fontFace: FONT,
  });
  slide.addText(`Exported ${dateStr} · ${userName}`, {
    x: 0.6, y: 6.9, w: 12, h: 0.35,
    fontSize: 9, color: WHITE, fontFace: FONT, transparency: 50,
  });
}

// ─── Slide 2: Key Metrics ──────────────────────────────────────────────────
function addKpiSlide(pptx, { metrics, workingPlanGm }) {
  const slide = pptx.addSlide();
  addTitleBar(pptx, slide, 'KEY METRICS', 'Current planning cycle at a glance');

  // Find metric values by label substring (case-insensitive)
  const find = (substr) => {
    const m = metrics.find(m => m.label?.toLowerCase().includes(substr.toLowerCase()));
    return m ? String(m.value) : '—';
  };

  const cards = [
    { label: 'Total Entries',  value: find('entries') },
    { label: 'Coverage',       value: find('coverage') },
    { label: '% Off Offers',   value: find('percent') },
    { label: 'Active Periods', value: find('periods') },
  ];

  // 2×2 grid
  const positions = [
    { x: 0.4, y: 1.2 }, { x: 6.9, y: 1.2 },
    { x: 0.4, y: 3.4 }, { x: 6.9, y: 3.4 },
  ];

  cards.forEach((card, i) => {
    const { x, y } = positions[i];
    slide.addShape(pptx.ShapeType.rect, {
      x, y, w: 5.9, h: 1.8,
      fill: { color: TEAL_LIGHT }, line: { color: TEAL_BORDER, width: 1 }, rectRadius: 0.1,
    });
    slide.addShape(pptx.ShapeType.rect, {
      x, y: y + 0.2, w: 0.07, h: 1.4,
      fill: { color: TEAL },
    });
    slide.addText(card.label.toUpperCase(), {
      x: x + 0.22, y: y + 0.25, w: 5.5, h: 0.35,
      fontSize: 8, bold: true, color: TEXT_MUTED, fontFace: FONT,
    });
    slide.addText(card.value, {
      x: x + 0.22, y: y + 0.65, w: 5.5, h: 0.9,
      fontSize: 36, bold: true, color: TEAL, fontFace: FONT,
    });
  });

  // Working Plan GM% — wide card at bottom
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 5.5, w: 12.5, h: 1.6,
    fill: { color: TEAL_LIGHT }, line: { color: TEAL_BORDER, width: 1 }, rectRadius: 0.1,
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 5.7, w: 0.07, h: 1.2,
    fill: { color: TEAL_MED },
  });
  slide.addText('WORKING PLAN GM%', {
    x: 0.62, y: 5.6, w: 11, h: 0.38,
    fontSize: 8, bold: true, color: TEXT_MUTED, fontFace: FONT,
  });
  slide.addText(workingPlanGm != null ? `${workingPlanGm}%` : '—', {
    x: 0.62, y: 5.98, w: 11, h: 0.9,
    fontSize: 38, bold: true, color: TEAL_MED, fontFace: FONT,
  });
}

// ─── Slide 3: Plan Status ──────────────────────────────────────────────────
function addPlanStatusSlide(pptx, { vintageRows }) {
  let onTarget = 0, watch = 0, offTarget = 0;
  vintageRows.forEach(r => {
    if (r.wp_gm == null || r.variance_to_pcf == null) return;
    if (r.variance_to_pcf >= 0)     onTarget++;
    else if (r.variance_to_pcf >= -2) watch++;
    else offTarget++;
  });

  const status = offTarget > 0 ? 'blocked' : watch > 0 ? 'caution' : 'go';
  const cfg = {
    go:      { icon: '✓', label: 'Plan On Track',           sub: 'All submitted entries meet or exceed the PCF brand GM% target.', fill: TEAL_LIGHT, border: TEAL_BORDER, color: TEAL },
    caution: { icon: '!', label: 'Review Before Submitting', sub: `${watch} dept·channel·period combination${watch===1?'':'s'} below PCF but within the ±2pt watch band.`, fill: 'F4F4F4', border: 'CCCCCC', color: '666666' },
    blocked: { icon: '✕', label: 'Action Required',          sub: `${offTarget} combination${offTarget===1?'':'s'} more than 2pts below PCF — submission is at risk.`, fill: 'FEF2F2', border: 'FCA5A5', color: DANGER },
  }[status];

  const slide = pptx.addSlide();
  addTitleBar(pptx, slide, 'PLAN STATUS', 'PCF brand GM% compliance assessment');

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 1.1, w: 12.5, h: 1.9,
    fill: { color: cfg.fill }, line: { color: cfg.border, width: 1.5 }, rectRadius: 0.12,
  });
  slide.addText(cfg.icon, {
    x: 0.65, y: 1.28, w: 0.75, h: 0.75,
    fontSize: 20, bold: true, color: WHITE, fontFace: FONT, align: 'center',
    fill: { color: cfg.color }, rectRadius: 0.375,
  });
  slide.addText(cfg.label, {
    x: 1.65, y: 1.2, w: 10.8, h: 0.55,
    fontSize: 16, bold: true, color: cfg.color, fontFace: FONT,
  });
  slide.addText(cfg.sub, {
    x: 1.65, y: 1.78, w: 10.8, h: 0.55,
    fontSize: 10, color: '555555', fontFace: FONT,
  });

  // Breakdown boxes
  [
    { label: 'On Target',  count: onTarget,  color: TEAL },
    { label: 'Watch Band', count: watch,     color: '888888' },
    { label: 'Off Target', count: offTarget, color: DANGER },
  ].forEach((b, i) => {
    const x = 0.4 + i * 4.4;
    slide.addShape(pptx.ShapeType.rect, {
      x, y: 3.3, w: 4.1, h: 2.4,
      fill: { color: TEAL_LIGHT }, line: { color: TEAL_BORDER, width: 1 }, rectRadius: 0.12,
    });
    slide.addText(String(b.count), {
      x: x + 0.1, y: 3.45, w: 3.9, h: 1.4,
      fontSize: 52, bold: true, color: b.color, fontFace: FONT, align: 'center',
    });
    slide.addText(b.label.toUpperCase(), {
      x: x + 0.1, y: 4.85, w: 3.9, h: 0.55,
      fontSize: 9, bold: true, color: TEXT_MUTED, fontFace: FONT, align: 'center',
    });
  });
}

// ─── Slide 4: Plan vs Target — native PPTX table ──────────────────────────
function addPlanVsTargetSlide(pptx, { filteredRows, scopeLabel }) {
  const slide = pptx.addSlide();
  addTitleBar(pptx, slide, 'PLAN VS TARGET — GM%', scopeLabel);

  if (filteredRows.length === 0) {
    slide.addText('No WP entries submitted yet.\nSubmit offers in Promo Details to populate WP GM%.', {
      x: 0.4, y: 2.5, w: 12.5, h: 1.2,
      fontSize: 13, color: TEXT_MUTED, fontFace: FONT, align: 'center',
    });
    return;
  }

  const varCellOpts = (v) => ({
    fontSize: 9, bold: true, fontFace: FONT, align: 'right',
    color: v == null ? TEXT_MUTED : v > 1 ? '059669' : v < -1 ? DANGER : TEXT_DARK,
    fill: { color: v == null ? WHITE : v > 1 ? TEAL_LIGHT : v < -1 ? 'FEF2F2' : 'F8F8F8' },
  });

  const tableRows = [
    // Header row
    ['Department','Period','WP GM%','MF GM%','vs MF','PCF GM%','vs PCF','LY GM%'].map(h => ({
      text: h,
      options: { fontSize: 8, bold: true, color: TEAL, fill: { color: TEAL_LIGHT }, align: 'left', fontFace: FONT },
    })),
    // Data rows
    ...filteredRows.map(r => [
      { text: r.department, options: { fontSize: 9, bold: true, color: TEXT_DARK, fontFace: FONT } },
      { text: r.period_id,  options: { fontSize: 9, color: TEXT_MUTED, fontFace: 'Courier New' } },
      { text: r.wp_gm  != null ? `${r.wp_gm.toFixed(1)}%`  : '—', options: { fontSize: 9, bold: true, color: TEAL, fontFace: FONT, align: 'right' } },
      { text: r.mf_gm  != null ? `${r.mf_gm.toFixed(1)}%`  : '—', options: { fontSize: 9, color: TEXT_DARK, fontFace: FONT, align: 'right' } },
      { text: r.variance_to_mf  != null ? `${r.variance_to_mf  > 0 ? '+':''}${r.variance_to_mf.toFixed(1)}`  : '—', options: varCellOpts(r.variance_to_mf) },
      { text: r.pcf_gm != null ? `${r.pcf_gm.toFixed(1)}%` : '—', options: { fontSize: 9, color: TEXT_DARK, fontFace: FONT, align: 'right' } },
      { text: r.variance_to_pcf != null ? `${r.variance_to_pcf > 0 ? '+':''}${r.variance_to_pcf.toFixed(1)}` : '—', options: varCellOpts(r.variance_to_pcf) },
      { text: r.ly_gm  != null ? `${r.ly_gm.toFixed(1)}%`  : '—', options: { fontSize: 9, color: TEXT_MUTED, fontFace: FONT, align: 'right' } },
    ]),
  ];

  slide.addTable(tableRows, {
    x: 0.4, y: 1.15, w: 12.5,
    rowH: 0.36,
    border: { pt: 1, color: TEAL_BORDER },
    fontFace: FONT,
  });
}

// ─── Slide 8: Channel Coverage Stats — native boxes ───────────────────────
function addChannelStatsSlide(pptx, { channelCoverage }) {
  const slide = pptx.addSlide();
  addTitleBar(pptx, slide, 'CHANNEL COVERAGE', 'Slot fill rate per channel across all periods');

  const channels = channelCoverage?.channels ?? [];
  const accentColors = [TEAL, TEAL_MED, '6AAABB'];

  channels.forEach((c, i) => {
    const x = 0.4 + i * 4.4;
    slide.addShape(pptx.ShapeType.rect, {
      x, y: 1.3, w: 4.1, h: 4.5,
      fill: { color: TEAL_LIGHT }, line: { color: TEAL_BORDER, width: 1 }, rectRadius: 0.15,
    });
    slide.addShape(pptx.ShapeType.rect, {
      x, y: 1.5, w: 0.1, h: 4.1,
      fill: { color: accentColors[i] ?? TEAL },
    });
    slide.addText(c.channel, {
      x: x + 0.3, y: 1.55, w: 3.7, h: 0.55,
      fontSize: 14, bold: true, color: accentColors[i] ?? TEAL, fontFace: FONT,
    });
    slide.addText(`${c.coverage}%`, {
      x: x + 0.3, y: 2.2, w: 3.7, h: 1.6,
      fontSize: 60, bold: true, color: accentColors[i] ?? TEAL, fontFace: FONT,
    });
    slide.addText(`${c.filled} / ${c.total} slots filled`, {
      x: x + 0.3, y: 3.9, w: 3.7, h: 0.5,
      fontSize: 10, color: TEXT_MUTED, fontFace: FONT,
    });
    slide.addText(c.channel === 'STR' ? 'Physical stores' : c.channel === 'ONL' ? 'Omni-online (athleta.com)' : 'Online-exclusive products', {
      x: x + 0.3, y: 4.55, w: 3.7, h: 0.5,
      fontSize: 9, color: TEXT_MUTED, fontFace: FONT, italic: true,
    });
  });
}

// ─── Slides 5–7, 9: Chart screenshot slides ───────────────────────────────
async function addChartSlide(pptx, { title, subtitle, imgData }) {
  const slide = pptx.addSlide();
  addTitleBar(pptx, slide, title, subtitle);

  if (imgData) {
    slide.addImage({
      data: imgData,
      x: 0.4, y: 1.1, w: 12.5, h: 6.0,
      sizing: { type: 'contain', w: 12.5, h: 6.0 },
    });
  } else {
    slide.addText('No data available for this chart.', {
      x: 0.4, y: 3.2, w: 12.5, h: 0.8,
      fontSize: 12, color: TEXT_MUTED, fontFace: FONT, align: 'center',
    });
  }
}

// ─── Slide 10: Appendix ───────────────────────────────────────────────────
function addAppendixSlide(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: TEAL_LIGHT };

  slide.addText('Notes & Definitions', {
    x: 0.6, y: 0.45, w: 12, h: 0.85,
    fontSize: 26, bold: true, color: TEAL, fontFace: FONT,
  });

  const defs = [
    ['WP GM%',   'Working Plan Gross Margin % — the GM% implied by the promotional offers submitted for a product.'],
    ['MF',       'Monthly Forecast — the GM% target set by finance for the planning period.'],
    ['PCF',      'Plan Confirmation Floor — the minimum brand GM% acceptable (currently 54.0% across departments).'],
    ['TOD',      'Time-of-Day — a promotional period valid only during specific hours; must be strictly deeper than its paired Standard period.'],
    ['Standard', 'A regular full-day promotional offer period.'],
    ['Coverage', 'The percentage of (product × channel × period) slots that have a submitted promotional offer.'],
    ['Variance', 'Difference between Working Plan and target. Positive (+) = above target. Negative (−) = below.'],
  ];

  defs.forEach(([term, def], i) => {
    const y = 1.4 + i * 0.72;
    slide.addText(term, {
      x: 0.6, y, w: 2.2, h: 0.58,
      fontSize: 10, bold: true, color: TEAL, fontFace: FONT, valign: 'top',
    });
    slide.addText(def, {
      x: 3.0, y, w: 10, h: 0.58,
      fontSize: 10, color: '444444', fontFace: FONT, valign: 'top',
    });
  });

  slide.addText('Generated by InsightsIQ · Athleta · Gap Inc.', {
    x: 0.6, y: 6.95, w: 12, h: 0.3,
    fontSize: 8, color: TEAL_MED, fontFace: FONT,
  });
}

// ─── Main entry point ─────────────────────────────────────────────────────
/**
 * @param {Object} opts
 * @param {'current'|'full'} opts.scope
 * @param {string}  opts.activeChannel
 * @param {string}  opts.activePeriodId
 * @param {string}  opts.activePeriodLabel
 * @param {string}  opts.userName
 * @param {{ offerMix: React.RefObject, heatmap: React.RefObject, deptCoverage: React.RefObject, periodDist: React.RefObject }} opts.chartRefs
 * @param {{ metrics: Array, vintageRows: Array, channelCoverage: Object, workingPlanGm: string|null }} opts.data
 * @returns {Promise<void>}
 */
export async function exportPempalPpt({ scope, activeChannel, activePeriodId, activePeriodLabel, userName, chartRefs, data }) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5 inches, 16:9

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const { metrics, vintageRows, channelCoverage, workingPlanGm } = data;

  // Filter vintage rows to scope
  const filteredVintageRows = scope === 'current'
    ? vintageRows.filter(r => r.channel === activeChannel && r.period_id === activePeriodId)
    : vintageRows;

  const scopeLabel = scope === 'current'
    ? `${activeChannel} · ${activePeriodId} — ${activePeriodLabel}`
    : 'All channels · All periods';

  // Screenshot charts in parallel
  const [offerMixImg, heatmapImg, deptCoverageImg, periodDistImg] = await Promise.all([
    screenshotElement(chartRefs.offerMix?.current),
    screenshotElement(chartRefs.heatmap?.current),
    screenshotElement(chartRefs.deptCoverage?.current),
    screenshotElement(chartRefs.periodDist?.current),
  ]);

  // Build all 10 slides
  addCoverSlide(pptx, { userName, dateStr });
  addKpiSlide(pptx, { metrics, workingPlanGm });
  addPlanStatusSlide(pptx, { vintageRows: filteredVintageRows });
  addPlanVsTargetSlide(pptx, { filteredRows: filteredVintageRows, scopeLabel });
  await addChartSlide(pptx, { title: 'OFFER MIX', subtitle: 'Distribution of entry types across all submitted offers', imgData: offerMixImg });
  await addChartSlide(pptx, { title: 'COVERAGE HEATMAP', subtitle: 'Channel × period slot fill rate — how submissions are spread', imgData: heatmapImg });
  await addChartSlide(pptx, { title: 'DEPARTMENT COVERAGE', subtitle: 'Percentage of products in each department with at least one entry', imgData: deptCoverageImg });
  addChannelStatsSlide(pptx, { channelCoverage });
  await addChartSlide(pptx, { title: 'ENTRIES PER PERIOD', subtitle: 'How submitted entries are distributed across planning periods', imgData: periodDistImg });
  addAppendixSlide(pptx);

  // Trigger browser download
  const tag = scope === 'current' ? `${activeChannel}_${activePeriodId}` : 'Full';
  await pptx.writeFile({ fileName: `Pempal_Report_${tag}_${dateStr.replace(/[\s,]/g, '_')}.pptx` });
}
