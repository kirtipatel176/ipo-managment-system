import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MoneyFlowChartData } from '../useDashboardMetrics';

interface MoneyFlowProps {
  data: MoneyFlowChartData[];
  formatCurrency: (val: number) => string;
}

export const MoneyFlow: React.FC<MoneyFlowProps> = ({ data, formatCurrency }) => {
  // Find the first month with activity to create a windowed view
  const firstActiveIndex = data.findIndex(d => d.invested > 0 || d.released > 0 || d.sales > 0);
  const windowedData = firstActiveIndex !== -1 ? data.slice(Math.max(0, firstActiveIndex - 1)) : data.slice(-6); // fallback to last 6 months

  return (
    <div className="bento-card p-6 h-full flex flex-col group">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Capital flow</h2>
          <p className="text-sm text-text-secondary mt-0.5 font-medium">Invested, released, and sales over time</p>
        </div>
      </div>

      {windowedData.every(d => d.invested === 0 && d.released === 0 && d.sales === 0) ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[250px] text-center border border-dashed border-border-color rounded-xl">
          <p className="text-text-secondary mb-2">No capital flow activity yet</p>
        </div>
      ) : (
        <div className="h-[300px] w-full mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={windowedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReleased" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis 
                dataKey="period" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '0.5px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Area 
                type="monotone" 
                dataKey="invested" 
                name="Invested"
                stroke="#6366f1" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorInvested)" 
              />
              <Area 
                type="monotone" 
                dataKey="released" 
                name="Released"
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorReleased)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
