import React from 'react';
import { Card } from '../../../components/ui/Card';
import type { DashboardMetrics } from '../useDashboardMetrics';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface Props {
  metrics: DashboardMetrics;
  formatCurrency: (v: number) => string;
}

export const Distribution: React.FC<Props> = ({ metrics, formatCurrency }) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-black/10 shadow-premium rounded-lg text-sm z-50">
          <p className="font-semibold text-text-primary mb-1">{payload[0].name}</p>
          <p className="text-accent-blue font-bold">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Asset Distribution */}
      <Card className="h-[320px] flex flex-col">
        <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2 mb-2">
          <PieChartIcon size={16} className="text-accent-purple" /> Asset Distribution
        </h3>
        <div className="flex-1 relative w-full h-full flex">
          <div className="w-1/2 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.investmentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {metrics.investmentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 flex flex-col justify-center gap-3 pr-4">
            {metrics.investmentBreakdown.map(item => (
              <div key={item.name} className="flex flex-col">
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} /> {item.name}
                </div>
                <span className="font-semibold text-sm text-text-primary ml-3.5">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Demat Distribution */}
      <Card className="h-[320px] flex flex-col">
        <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2 mb-2">
          <PieChartIcon size={16} className="text-accent-orange" /> Broker Allocation
        </h3>
        <div className="flex-1 relative w-full h-full flex">
          {metrics.dematDistribution.length > 0 ? (
            <>
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.dematDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="current"
                      stroke="none"
                    >
                      {metrics.dematDistribution.map((_, index) => {
                        const colors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#6366f1'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 flex flex-col justify-center gap-3 pr-4 overflow-y-auto">
                {metrics.dematDistribution.map((item, index) => {
                  const colors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#6366f1'];
                  return (
                    <div key={item.accountId} className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[index % colors.length] }} /> 
                        <span className="truncate">{item.name}</span>
                      </div>
                      <span className="font-semibold text-sm text-text-primary ml-3.5">{formatCurrency(item.current)}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-text-tertiary">
              No allocation data available.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
