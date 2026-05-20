/** Chart columns: display label + DB time string (admin format). */
const CHART_SLOTS = [
  { label: '01 AM', time: '01:00 AM' },
  { label: '01:30 AM', time: '01:30 AM' },
  { label: '02 AM', time: '02:00 AM' },
  { label: '02:30 AM', time: '02:30 AM' },
  { label: '03 AM', time: '03:00 AM' },
  { label: '03:30 AM', time: '03:30 AM' },
  { label: '04 AM', time: '04:00 AM' },
  { label: '04:30 AM', time: '04:30 AM' },
  { label: '05 AM', time: '05:00 AM' },
  { label: '05:30 AM', time: '05:30 AM' },
  { label: '06 AM', time: '06:00 AM' },
  { label: '06:30 AM', time: '06:30 AM' },
  { label: '07 AM', time: '07:00 AM' },
  { label: '07:30 AM', time: '07:30 AM' },
  { label: '08 AM', time: '08:00 AM' },
  { label: '08:30 AM', time: '08:30 AM' },
  { label: '09 AM', time: '09:00 AM' },
  { label: '09:30 AM', time: '09:30 AM' },
  { label: '10 AM', time: '10:00 AM' },
  { label: '10:30 AM', time: '10:30 AM' },
  { label: '11 AM', time: '11:00 AM' },
  { label: '11:30 AM', time: '11:30 AM' },
  { label: '12 PM', time: '12:00 PM' },
  { label: '12:30 PM', time: '12:30 PM' },
  { label: '01 PM', time: '01:00 PM' },
  { label: '01:30 PM', time: '01:30 PM' },
  { label: '02 PM', time: '02:00 PM' },
  { label: '02:30 PM', time: '02:30 PM' },
  { label: '03 PM', time: '03:00 PM' },
  { label: '03:30 PM', time: '03:30 PM' },
  { label: '04 PM', time: '04:00 PM' },
  { label: '04:30 PM', time: '04:30 PM' }
];

const CHART_HEADERS = ['DATE', ...CHART_SLOTS.map(s => s.label)];

function normalizeTime(timeStr) {
  const match = (timeStr || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return (timeStr || '').trim();
  const hour = parseInt(match[1], 10).toString().padStart(2, '0');
  return `${hour}:${match[2]} ${match[3].toUpperCase()}`;
}

function formatChartDate(isoDate) {
  const [y, m, d] = (isoDate || '').split('-');
  if (!y || !m || !d) return isoDate || '';
  return `${d}-${m}-${y}`;
}

function formatResultValue(value) {
  if (!value || String(value).toLowerCase() === 'wait..') return '—';
  return String(value).trim();
}

module.exports = {
  CHART_SLOTS,
  CHART_HEADERS,
  normalizeTime,
  formatChartDate,
  formatResultValue
};
