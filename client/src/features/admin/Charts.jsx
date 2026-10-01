import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/**
 * Chart rules (see dataviz method):
 *  - one series per chart, in gold — validated ≥3:1 against the ink-900 surface. Crimson and gold
 *    are NOT CVD-separable (deutan ΔE < 10), so they never share a chart.
 *  - 2px line, recessive grid/axes, one y-axis, crosshair tooltip; text uses ink tokens, not series color.
 */
const SERIES = '#d4a24c';
const GRID = 'rgba(255,255,255,0.06)';
const AXIS = '#7c7c86';

const shortDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function TooltipBox({ active, payload, label, unit, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-xs shadow-xl">
      <p className="text-fog-400">{labelFormatter ? labelFormatter(label) : label}</p>
      <p className="mt-0.5 font-semibold text-fog-100">
        {payload[0].value.toLocaleString('en-IN')} {unit}
      </p>
    </div>
  );
}

export function TrendChart({ title, data = [], unit = '', height = 220 }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <figure className="card p-4 sm:p-5">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-fog-100">{title}</span>
        <span className="text-xs text-fog-400">
          {total.toLocaleString('en-IN')} in period
        </span>
      </figcaption>
      <div style={{ height }} role="img" aria-label={`${title}: ${total} total over ${data.length} days`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id={`fill-${title.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES} stopOpacity={0.25} />
                <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1 }} content={<TooltipBox unit={unit} labelFormatter={shortDate} />} />
            <Area type="monotone" dataKey="count" stroke={SERIES} strokeWidth={2} fill={`url(#fill-${title.replace(/\W/g, '')})`} activeDot={{ r: 4, stroke: '#111113', strokeWidth: 2 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

/** Horizontal ranking bars (magnitude, single hue). */
export function RankBars({ title, data = [], valueKey, labelKey = 'name', unit = '' }) {
  const height = Math.max(120, data.length * 34);
  return (
    <figure className="card p-4 sm:p-5">
      <figcaption className="mb-3 text-sm font-semibold text-fog-100">{title}</figcaption>
      {data.length === 0 ? (
        <p className="text-sm text-fog-400">No data yet.</p>
      ) : (
        <div style={{ height }} role="img" aria-label={`${title}: ${data.map((d) => `${d[labelKey]} ${d[valueKey]}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap={8}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey={labelKey} width={110} tick={{ fill: '#c8c8cf', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<TooltipBox unit={unit} />} />
              <Bar dataKey={valueKey} fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}
