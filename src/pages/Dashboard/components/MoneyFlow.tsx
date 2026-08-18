import React from 'react';
import { Card } from '../../../components/ui/Card';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DashboardMetrics } from '../useDashboardMetrics';
import { Activity } from 'lucide-react';

interface Props {
  metrics: DashboardMetrics;
  formatCurrency: (v: number) => string;
}

export const MoneyFlow: React.FC<Props> = ({ metrics, formatCurrency }) => {
  return (
    <Card className="h-[360px] flex flex-col mb-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <Activity size={16} className="text-accent-blue" />
            Capital Flow
          </h3>
          <p className="text-xs text-text-tertiary mt-1">Monthly comparison of invested vs released capital</p>
        </div>
      </div>
      <div className="flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={metrics.moneyFlowChart} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="colorReleased" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
            <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#666' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#999' }} tickFormatter={v => '₹' + (v/1000) + 'k'} />
            <Tooltip 
              cursor={{ fill: '#00000005' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              formatter={(value: any, name: any) => [formatCurrency(value), name]}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Bar dataKey="invested" name="Invested" fill="url(#colorInvested)" radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Bar dataKey="released" name="Released" fill="url(#colorReleased)" radius={[4, 4, 0, 0]} maxBarSize={30} />
            <Line type="monotone" dataKey="sales" name="Sales" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
