import React from 'react';
import { Card } from '../../../components/ui/Card';
import type { DashboardMetrics } from '../useDashboardMetrics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Props {
  metrics: DashboardMetrics;
  formatCurrency: (v: number) => string;
}

export const PnLAnalytics: React.FC<Props> = ({ metrics, formatCurrency }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Gainers / Losers */}
      <Card className="flex flex-col h-full">
        <h3 className="font-semibold text-text-primary flex items-center gap-2 mb-4 text-sm">
          <TrendingUp size={16} className="text-accent-blue" /> Performance Extremes
        </h3>
        <div className="space-y-4 flex-1 flex flex-col justify-center">
          <div>
            <h4 className="text-[10px] uppercase font-bold text-text-tertiary mb-2">Top Gainers</h4>
            <div className="space-y-2">
              {metrics.topGainers.length === 0 && <p className="text-xs text-text-tertiary">No gainers yet</p>}
              {metrics.topGainers.map((g, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">{g.ipoName}</span>
                  <div className="flex items-center gap-2 text-accent-green">
                    <ArrowUpRight size={14} />
                    <span className="text-sm font-bold">{g.pnlPercent.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-black/5 mt-4">
            <h4 className="text-[10px] uppercase font-bold text-text-tertiary mb-2">Top Losers</h4>
            <div className="space-y-2">
              {metrics.topLosers.length === 0 && <p className="text-xs text-text-tertiary">No losers yet</p>}
              {metrics.topLosers.map((l, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">{l.ipoName}</span>
                  <div className="flex items-center gap-2 text-accent-red">
                    <ArrowDownRight size={14} />
                    <span className="text-sm font-bold">{l.pnlPercent.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* P&L Bar Chart */}
      <Card className="lg:col-span-2 flex flex-col h-[300px]">
        <div className="mb-4">
          <h3 className="font-semibold text-text-primary text-sm">Monthly Profit & Loss</h3>
          <p className="text-xs text-text-tertiary mt-1">Realized profit tracking over time</p>
        </div>
        <div className="flex-1 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.pnlChart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
              <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#999' }} tickFormatter={v => '₹' + (v/1000) + 'k'} />
              <Tooltip 
                cursor={{ fill: '#00000005' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                formatter={(value: any, name: any) => [formatCurrency(value), name]}
              />
              <Bar 
                dataKey="profit" 
                name="Profit" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={40}
              >
                {
                  metrics.pnlChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'} />
                  ))
                }
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
