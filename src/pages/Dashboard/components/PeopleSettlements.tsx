import React from 'react';
import { Users, Clock } from 'lucide-react';
import type { CommandCenterMetrics } from '../useDashboardMetrics';

interface PeopleSettlementsProps {
  data: CommandCenterMetrics['peopleSettlements'];
  formatCurrency: (val: number) => string;
}

export const PeopleSettlements: React.FC<PeopleSettlementsProps> = ({ data, formatCurrency }) => {
  const activeSettlements = data.filter(p => p.outstanding !== 0);

  return (
    <div className="bento-card p-6 h-full flex flex-col group">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-text-secondary" />
          <h2 className="text-lg font-semibold text-text-primary">People & Settlements</h2>
        </div>
      </div>

      <div className="flex-1">
        {activeSettlements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center border border-dashed border-border-color rounded-xl p-4 bg-bg-secondary/50">
            <p className="text-text-secondary mb-1 font-medium">No outstanding settlements</p>
            <p className="text-xs text-text-secondary/70">All friend funding is settled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeSettlements.map(person => (
              <div 
                key={person.personId} 
                className="flex items-center justify-between p-3 rounded-xl border border-white/40 bg-white/40 backdrop-blur-md hover:bg-white/80 hover:shadow-premium transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-blue/10 to-accent-blue/20 text-accent-blue flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-105 transition-transform duration-300">
                    {person.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-text-primary group-hover:text-accent-blue transition-colors duration-300">{person.name}</h3>
                    {person.agingDays > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-text-secondary mt-0.5">
                        <Clock size={10} />
                        <span>{person.agingDays} days outstanding</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold tabular-nums ${person.outstanding > 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                    {person.outstanding > 0 ? 'Owens you ' : 'You owe '}
                    {formatCurrency(Math.abs(person.outstanding))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
