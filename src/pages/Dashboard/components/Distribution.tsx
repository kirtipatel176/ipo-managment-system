import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DistributionProps {
  data: Array<{ name: string; value: number; color: string }>;
  formatCurrency: (val: number) => string;
}

export const Distribution: React.FC<DistributionProps> = ({ data, formatCurrency }) => {
  return (
    <div className="bento-card p-6 group">
      <h2 className="text-lg font-bold text-text-primary mb-1 tracking-tight">Asset distribution</h2>
      <p className="text-sm text-text-secondary mb-6 font-medium">Current allocation of funds</p>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] text-center border border-dashed border-border-color rounded-xl bg-bg-secondary/50">
          <p className="text-text-secondary mb-2 font-medium">No active assets</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: '0.5px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2">
            {data.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-text-secondary">{item.name}</span>
                </div>
                <span className="font-medium">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
