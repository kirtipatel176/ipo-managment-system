import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ActionRequiredProps {
  actions: Array<{ id: string; message: string; type: 'INFO' | 'WARNING' | 'SUCCESS' | 'DANGER'; link: string }>;
}

export const ActionRequired: React.FC<ActionRequiredProps> = ({ actions }) => {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map(action => {
        let Icon = Info;
        let colorClass = 'text-accent-blue bg-accent-blue/10 border-accent-blue/20';
        
        if (action.type === 'WARNING') {
          Icon = AlertTriangle;
          colorClass = 'text-amber-600 bg-amber-500/10 border-amber-500/20';
        } else if (action.type === 'DANGER') {
          Icon = AlertCircle;
          colorClass = 'text-accent-red bg-accent-red/10 border-accent-red/20';
        } else if (action.type === 'SUCCESS') {
          Icon = CheckCircle2;
          colorClass = 'text-accent-green bg-accent-green/10 border-accent-green/20';
        }

        return (
          <Link
            key={action.id}
            to={action.link}
            className={`flex items-start gap-3 p-3 rounded-xl border ${colorClass} transition-all duration-300 hover:-translate-y-1 hover:shadow-md relative overflow-hidden group`}
            style={{ borderRadius: '12px', borderWidth: '0.5px' }}
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <Icon size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-tight">{action.message}</p>
          </Link>
        );
      })}
    </div>
  );
};
