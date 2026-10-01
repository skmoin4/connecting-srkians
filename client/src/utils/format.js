export const cn = (...classes) => classes.flat().filter(Boolean).join(' ');

// Event/FDFS dates are stored as calendar days (UTC midnight) — format them in UTC so the day
// never shifts for viewers in other timezones.
export const formatDate = (d, opts = {}) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC', ...opts }) : '';

export const formatDateLong = (d) => formatDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const dayMonth = (d) => {
  if (!d) return { day: '--', month: '---' };
  const date = new Date(d);
  return {
    day: date.toLocaleDateString('en-IN', { day: '2-digit', timeZone: 'UTC' }),
    month: date.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
  };
};

export const formatTime = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const d = new Date(2000, 0, 1, h, m || 0);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

export const timeAgo = (d) => {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const compact = (n) => (typeof n === 'number' ? new Intl.NumberFormat('en-IN', { notation: n >= 10000 ? 'compact' : 'standard' }).format(n) : '0');

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'S';

export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export const instagramUrl = (handle) => (handle ? `https://instagram.com/${String(handle).replace(/^@/, '')}` : null);

export const whatsappUrl = (number, text) => {
  if (!number) return null;
  let digits = String(number).replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`; // default to India country code
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

export const locationLine = (...parts) =>
  parts
    .map((p) => (typeof p === 'string' ? p : p?.name))
    .filter(Boolean)
    .join(', ');

export const googleCalendarUrl = ({ title, date, startTime, endTime, details, location }) => {
  const base = new Date(date);
  const ymd = base.toISOString().slice(0, 10).replace(/-/g, '');
  const t = (hhmm) => (hhmm ? hhmm.replace(':', '') + '00' : null);
  const dates = startTime ? `${ymd}T${t(startTime)}/${ymd}T${t(endTime) || t(startTime)}` : `${ymd}/${ymd}`;
  const p = new URLSearchParams({ action: 'TEMPLATE', text: title, dates, details: details || '', location: location || '' });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
};
