"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e8e3da',
      borderRadius: 3, padding: '8px 14px', boxShadow: 'none',
    }}>
      <p style={{ fontSize: 10, color: '#81796d', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#0b0b0b', fontVariantNumeric: 'tabular-nums', fontFamily: "'Inter', sans-serif" }}>
        ₹{Number(payload[0].value).toLocaleString('en-IN')}
      </p>
    </div>
  );
}

export function SalesChart({ data }) {
  if (!data?.length) {
    return (
      <div style={{ height: 240, display: 'grid', placeItems: 'center' }}>
        <p style={{ fontSize: 12, color: '#9c9489', fontFamily: "'Inter', sans-serif" }}>No data yet</p>
      </div>
    );
  }

  return (
    <div style={{ height: 240, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid
            vertical={false}
            stroke="#eeebe4"
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9c9489', fontSize: 9, fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em' }}
            dy={10}
            minTickGap={28}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9c9489', fontSize: 9, fontFamily: "'Inter', sans-serif" }}
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e8e3da', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#1a6b3a"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: '#1a6b3a', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
