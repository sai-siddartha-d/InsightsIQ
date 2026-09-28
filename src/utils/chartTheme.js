// src/utils/chartTheme.js
export const CHART_COLORS = {
  primary:      '#5B8DD9',  // cornflower blue (main brand, single-series charts)
  primaryLight: '#93B4E8',  // soft light blue
  accent:       '#4A78C4',  // medium blue (secondary series)
  accentLight:  '#8AB4E8',  // light blue
  success:      '#7EC8A4',  // soft sage green
  warning:      '#D4651A',  // muted burnt orange (no yellow)
  danger:       '#F87171',  // soft coral-red
  info:         '#B8A5D4',  // soft lavender
  neutral:      '#94A3B8',  // slate blue-gray
  neutralLight: '#D4D4D8',
};


// Each entry type gets a clearly distinct hue — easy to tell apart at a glance
export const TYPE_COLORS = {
  TICKET:    '#94A3B8',  // slate blue-gray — neutral
  PCT_OFF:   '#5B8DD9',  // cornflower blue  — most common, on-brand
  PRICE_PT:  '#4A78C4',  // medium blue      — clearly different
  BOGO_FREE: '#7EC8A4',  // sage green       — fresh, distinct
  BOGO_50:   '#B8A5D4',  // soft lavender    — purple family
  MUPP:      '#6982C4',  // indigo-blue      — cool, distinct
};


export const TYPE_LABELS = {
  TICKET: 'Ticket', PCT_OFF: '% Off', PRICE_PT: 'Price Point',
  BOGO_FREE: 'BOGO Free', BOGO_50: 'BOGO 50', MUPP: 'MUPP',
};


// Shared chart-element styles — passed to all Recharts components
export const CHART_AXIS_STYLE = {
  fontSize: 11,
  fill: '#71717A',
  fontFamily: 'DM Sans, sans-serif',
};


export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'white',
  border: '1px solid #C4D3EC',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px',
  color: '#1A2A4A',
  boxShadow: '0 4px 8px -2px rgba(27, 79, 156, 0.08), 0 2px 4px -1px rgba(27, 79, 156, 0.04)',
  fontFamily: 'DM Sans, sans-serif',
};

// Pass to <Tooltip itemStyle={}> and <Tooltip labelStyle={}> for full dark text coverage
export const CHART_TOOLTIP_ITEM_STYLE = { color: '#1A2A4A', fontWeight: 500 };
export const CHART_TOOLTIP_LABEL_STYLE = { color: '#163F82', fontWeight: 600, marginBottom: 2 };