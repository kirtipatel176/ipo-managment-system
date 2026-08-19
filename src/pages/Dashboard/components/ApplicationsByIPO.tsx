import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { CommandCenterMetrics } from '../useDashboardMetrics';

interface ApplicationsByIPOProps {
  data: CommandCenterMetrics['applicationsByIPO'];
  formatCurrency: (val: number) => string;
}

export const ApplicationsByIPO: React.FC<ApplicationsByIPOProps> = ({ data, formatCurrency }) => {
  const [expandedIpos, setExpandedIpos] = useState<Set<number>>(new Set());

  const toggleExpand = (ipoId: number) => {
    const newExpanded = new Set(expandedIpos);
    if (newExpanded.has(ipoId)) {
      newExpanded.delete(ipoId);
    } else {
      newExpanded.add(ipoId);
    }
    setExpandedIpos(newExpanded);
  };

  if (data.length === 0) {
    return (
      <div className="bento-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">Applications by IPO</h2>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[150px] text-center border border-dashed border-border-color rounded-xl">
          <p className="text-text-secondary mb-2">No application data yet</p>
          <button className="px-4 py-2 bg-bg-secondary hover:bg-bg-tertiary rounded-lg text-sm transition-colors border border-border-color">
            Record your first transaction
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bento-card overflow-hidden">
      <div className="p-6 border-b border-black/5 bg-white/40 backdrop-blur-md flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Applications by IPO</h2>
          <p className="text-[11px] text-text-secondary mt-0.5 font-medium uppercase tracking-widest">Grouped summary of all applications</p>
        </div>
      </div>
      <div className="overflow-x-auto bg-white/40 backdrop-blur-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/50 text-text-secondary uppercase text-[10px] tracking-widest font-bold border-b border-black/5">
            <tr>
              <th className="px-6 py-4 w-8"></th>
              <th className="px-6 py-4">IPO Name</th>
              <th className="px-6 py-4 text-right">Applied Lots</th>
              <th className="px-6 py-4 text-right">Allotted Lots</th>
              <th className="px-6 py-4 text-right">Investment</th>
              <th className="px-6 py-4 text-right">Status Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {data.map((row) => (
              <React.Fragment key={row.ipoId}>
                <tr 
                  className="table-row-hover group"
                  onClick={() => toggleExpand(row.ipoId)}
                >
                  <td className="px-6 py-4 text-text-secondary group-hover:text-accent-blue transition-colors duration-300">
                    {expandedIpos.has(row.ipoId) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </td>
                  <td className="px-6 py-4 font-semibold text-text-primary group-hover:text-accent-blue transition-colors duration-300">{row.ipoName}</td>
                  <td className="px-6 py-4 text-right tabular-nums font-medium text-text-secondary">{row.appliedLots}</td>
                  <td className="px-6 py-4 text-right tabular-nums font-bold text-slate-800">{row.allottedLots}</td>
                  <td className="px-6 py-4 text-right tabular-nums font-medium text-text-secondary">{formatCurrency(row.investmentAmount)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 text-[11px] font-medium">
                      {Object.entries(row.statuses).map(([status, count]) => {
                        let colorClass = 'bg-bg-tertiary text-text-secondary';
                        if (status === 'FULL') colorClass = 'bg-accent-green/10 text-accent-green';
                        if (status === 'PARTIAL') colorClass = 'bg-accent-blue/10 text-accent-blue';
                        if (status === 'PENDING') colorClass = 'bg-amber-500/10 text-amber-600';
                        if (status === 'NIL') colorClass = 'bg-accent-red/10 text-accent-red';

                        const label = status === 'FULL' ? 'allotted' 
                          : status === 'PARTIAL' ? 'partial' 
                          : status === 'NIL' ? 'not allotted' 
                          : status.toLowerCase();

                        return (
                          <span key={status} className={`px-2 py-0.5 rounded ${colorClass}`}>
                            {count} {label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
                {expandedIpos.has(row.ipoId) && (
                  <tr className="bg-slate-50/50">
                    <td colSpan={6} className="p-0">
                      <div className="px-14 py-5 border-l-[3px] border-accent-blue ml-6 my-2 bg-white/70 backdrop-blur-md rounded-r-2xl shadow-sm">
                        <table className="w-full text-[13px] text-left">
                          <thead className="text-text-secondary border-b border-black/5">
                            <tr>
                              <th className="pb-3 font-bold tracking-widest uppercase text-[9px]">Applicant</th>
                              <th className="pb-3 font-bold tracking-widest uppercase text-[9px] text-right">Applied</th>
                              <th className="pb-3 font-bold tracking-widest uppercase text-[9px] text-right">Allotted</th>
                              <th className="pb-3 font-bold tracking-widest uppercase text-[9px] text-right">Amount</th>
                              <th className="pb-3 font-bold tracking-widest uppercase text-[9px] text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/5">
                            {row.applicants.map((app: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-100/50 transition-colors duration-200">
                                <td className="py-2.5 font-medium text-text-primary">{app.applicantName}</td>
                                <td className="py-2.5 text-right tabular-nums text-text-secondary">{app.appliedLots}</td>
                                <td className="py-2.5 text-right tabular-nums font-medium text-text-primary">{app.allottedLots}</td>
                                <td className="py-2.5 text-right tabular-nums text-text-secondary">{formatCurrency(app.investmentAmount || app.blockedAmount)}</td>
                                <td className="py-2.5 text-right">
                                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${app.allotmentStatus === 'FULL' ? 'bg-accent-green/10 text-accent-green' : app.allotmentStatus === 'PARTIAL' ? 'bg-accent-blue/10 text-accent-blue' : app.allotmentStatus === 'NIL' ? 'bg-accent-red/10 text-accent-red' : 'bg-amber-500/10 text-amber-600'}`}>
                                    {app.allotmentStatus}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
