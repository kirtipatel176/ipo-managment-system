import React from 'react';
import { Sparkles } from 'lucide-react';

interface SmartInsightsProps {
  insights: string[];
}

export const SmartInsights: React.FC<SmartInsightsProps> = ({ insights }) => {
  return (
    <div className="bento-card p-6 h-full group">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue">
          <Sparkles size={16} />
        </div>
        <h2 className="text-lg font-bold text-text-primary tracking-tight">Smart insights</h2>
      </div>

      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div 
            key={idx} 
            className="p-3.5 bg-bg-secondary hover:bg-white rounded-xl text-sm text-text-primary leading-relaxed border border-border-color/50 shadow-sm transition-all duration-200"
          >
            {insight}
          </div>
        ))}
      </div>
    </div>
  );
};
