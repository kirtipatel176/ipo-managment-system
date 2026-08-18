import React from 'react';
import { Card } from '../../../components/ui/Card';
import type { DashboardMetrics } from '../useDashboardMetrics';
import { Activity, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  metrics: DashboardMetrics;
}

export const ActionRequired: React.FC<Props> = ({ metrics }) => {
  const navigate = useNavigate();
  if (!metrics.actions || metrics.actions.length === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Activity size={16} className="text-accent-orange" />
        <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Action Required</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.actions.map(action => {
          const isWarning = action.type === 'WARNING';
          const isSuccess = action.type === 'SUCCESS';
          return (
            <Card 
              key={action.id} 
              className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${isWarning ? 'border-l-accent-orange' : isSuccess ? 'border-l-accent-green' : 'border-l-accent-blue'} p-4 bg-white`} 
              onClick={() => action.link && navigate(action.link)}
            >
              <div className="flex items-start gap-3">
                {isWarning && <AlertCircle size={18} className="text-accent-orange shrink-0 mt-0.5" />}
                {isSuccess && <CheckCircle2 size={18} className="text-accent-green shrink-0 mt-0.5" />}
                {!isWarning && !isSuccess && <Info size={18} className="text-accent-blue shrink-0 mt-0.5" />}
                <p className="text-sm font-medium text-text-primary leading-tight">{action.message}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
