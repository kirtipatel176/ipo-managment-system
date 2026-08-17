import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Activity, ArrowRightLeft, Landmark, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { mapJourneyEvent } from '../../lib/mappers';

export const Logs: React.FC = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['journey_events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journey_events')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data || []).map(mapJourneyEvent);
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-blue/20 border-t-accent-blue" />
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    if (type.includes('IPO')) return <Activity size={16} className="text-accent-purple" />;
    if (type.includes('MONEY') || type.includes('TRANSFER')) return <ArrowRightLeft size={16} className="text-accent-blue" />;
    if (type.includes('BANK')) return <Landmark size={16} className="text-accent-green" />;
    return <Users size={16} className="text-text-tertiary" />;
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">System Logs</h1>
        <p className="mt-1 text-text-secondary">
          Audit trail of all money movements and allocations.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="space-y-4">
          {logs?.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              No activity logs found.
            </div>
          ) : (
            logs?.map((log, index) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="flex gap-4 p-4 rounded-xl border border-black/5 bg-bg-secondary/20 hover:bg-bg-secondary/50 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-black/5">
                  {getEventIcon(log.eventType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-sm font-semibold text-text-primary">{log.eventType.replace(/_/g, ' ')}</h4>
                    <span className="text-xs text-text-tertiary whitespace-nowrap">
                      {new Date(log.date).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{log.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    {log.allocationId && (
                      <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-accent-blue/10 text-accent-blue">
                        Allocation: {log.allocationId}
                      </span>
                    )}
                    {log.transactionId && (
                      <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-accent-purple/10 text-accent-purple">
                        Transaction: {log.transactionId}
                      </span>
                    )}
                    {log.applicationId && (
                      <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-accent-green/10 text-accent-green">
                        Application: {log.applicationId}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
