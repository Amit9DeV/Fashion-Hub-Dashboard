"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export function SalesChart({ data }) {
  return (
    <div className="h-[250px] w-full text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c9963e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#c9963e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#81796d', fontSize: 10 }} 
            dy={10} 
            minTickGap={20}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#81796d', fontSize: 10 }} 
            tickFormatter={(value) => `₹${value}`} 
          />
          <CartesianGrid vertical={false} stroke="#f0ede7" strokeDasharray="3 3" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #dfd8cc', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ color: '#080909', fontWeight: 600 }}
            formatter={(value) => [`₹${value.toLocaleString()}`, "Revenue"]}
            labelStyle={{ color: '#706a61', fontSize: '12px', marginBottom: '4px' }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#c9963e" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
