import React from 'react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { ArrowDownLeft, ArrowUpRight, RefreshCcw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaction: any;
}

export const TransactionDetailsModal: React.FC<Props> = ({ isOpen, onClose, transaction }) => {
  if (!transaction) return null;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const getIcon = () => {
    switch(transaction.transactionType) {
      case 'MONEY_SENT': return <ArrowUpRight className="text-accent-orange" size={24} />;
      case 'MONEY_RECEIVED': return <ArrowDownLeft className="text-accent-green" size={24} />;
      default: return <RefreshCcw className="text-accent-blue" size={24} />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="p-2 sm:p-4">
        
        {/* Receipt Container */}
        <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-black/5 ring-1 ring-black/5">
          
          {/* Amount & Status Section */}
          <div className="relative p-8 pb-10 flex flex-col items-center justify-center bg-gradient-to-b from-bg-secondary/50 to-white text-center">
            <div className="absolute top-4 right-4">
              <Badge variant={transaction.status === 'COMPLETED' ? 'success' : transaction.status === 'PENDING' ? 'warning' : 'danger'}>
                {transaction.status}
              </Badge>
            </div>
            
            <div className="h-16 w-16 bg-white rounded-full shadow-sm border border-black/5 flex items-center justify-center mb-6">
              {getIcon()}
            </div>
            
            <span className="text-sm font-semibold text-text-tertiary uppercase tracking-widest mb-2">
              {transaction.transactionType.replace(/_/g, ' ')}
            </span>
            
            <span className="text-5xl font-bold text-text-primary tracking-tight">
              {formatCurrency(transaction.amount)}
            </span>
            <span className="mt-2 text-sm text-text-secondary font-medium">
              {new Date(transaction.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Transfer Flow */}
          <div className="px-8 py-6 bg-white border-t border-black/5 border-dashed relative">
             <div className="absolute left-0 top-0 w-4 h-4 -translate-x-2 -translate-y-2 rounded-full bg-white shadow-[inset_-2px_0_4px_rgba(0,0,0,0.04)] border-r border-black/5 z-10"></div>
             <div className="absolute right-0 top-0 w-4 h-4 translate-x-2 -translate-y-2 rounded-full bg-white shadow-[inset_2px_0_4px_rgba(0,0,0,0.04)] border-l border-black/5 z-10"></div>
             
             <div className="flex items-center justify-between gap-4">
               {/* From */}
               <div className="flex flex-col flex-1 bg-bg-secondary/30 p-4 rounded-2xl items-start">
                  <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider mb-1">From</span>
                  <span className="font-semibold text-text-primary text-sm line-clamp-2">{transaction.fromName || 'N/A'}</span>
               </div>
               
               {/* Arrow */}
               <div className="text-text-tertiary/40">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                   <path d="M5 12h14M12 5l7 7-7 7"/>
                 </svg>
               </div>

               {/* To */}
               <div className="flex flex-col flex-1 bg-bg-secondary/30 p-4 rounded-2xl items-end text-right">
                  <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider mb-1">To</span>
                  <span className="font-semibold text-text-primary text-sm line-clamp-2">{transaction.toName || 'N/A'}</span>
               </div>
             </div>
          </div>

          {/* Details List */}
          <div className="px-8 py-6 bg-white">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-text-tertiary font-medium">Reference / UTR</span>
                <span className="text-sm font-mono font-medium text-text-primary">{transaction.utr || '—'}</span>
              </div>
              
              {transaction.ipoName && transaction.ipoName !== '-' && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-text-tertiary font-medium">Related IPO</span>
                  <span className="text-sm font-medium text-text-primary">{transaction.ipoName}</span>
                </div>
              )}
              
              {transaction.notes && (
                <div className="flex justify-between items-start py-1">
                  <span className="text-sm text-text-tertiary font-medium mt-0.5">Notes</span>
                  <span className="text-sm font-medium text-text-primary text-right max-w-[60%]">{transaction.notes}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-text-tertiary font-medium">Transaction ID</span>
                <span className="text-sm font-mono text-text-tertiary">#{transaction.id.toString().padStart(6, '0')}</span>
              </div>
            </div>
          </div>

          {/* Money Flow Diagram */}
          {transaction.transactionType !== 'SELF_TRANSFER' && transaction.transactionType !== 'CHARGES' && (
            <div className="px-8 py-6 bg-bg-secondary/20 border-t border-black/5">
              <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-4 text-center">Money Flow Journey</h4>
              <div className="flex flex-col items-center gap-1">
                <div className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm border border-black/5 ${['MONEY_SENT', 'MONEY_RECEIVED'].includes(transaction.transactionType) ? 'bg-accent-blue/10 text-accent-blue' : 'bg-white text-text-secondary'}`}>
                  Bank Account
                </div>
                <div className="h-4 w-px bg-black/20"></div>
                <div className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm border border-black/5 ${['MONEY_SENT', 'MONEY_RECEIVED'].includes(transaction.transactionType) ? 'bg-accent-purple/10 text-accent-purple' : 'bg-white text-text-secondary'}`}>
                  Friend / Applicant
                </div>
                <div className="h-4 w-px bg-black/20"></div>
                <div className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm border border-black/5 ${transaction.ipoName && transaction.ipoName !== '-' ? 'bg-accent-orange/10 text-accent-orange' : 'bg-white text-text-secondary'}`}>
                  IPO Application
                </div>
                <div className="h-4 w-px bg-black/20"></div>
                <div className="flex gap-4">
                   <div className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm border border-black/5 ${transaction.transactionType === 'IPO_SELL' ? 'bg-accent-green/10 text-accent-green' : 'bg-white text-text-secondary'}`}>
                     Invested
                   </div>
                   <div className={`px-4 py-2 rounded-xl text-xs font-bold shadow-sm border border-black/5 ${transaction.transactionType === 'IPO_REFUND' ? 'bg-accent-blue/10 text-accent-blue' : 'bg-white text-text-secondary'}`}>
                     Released / Refund
                   </div>
                </div>
              </div>
            </div>
          )}
          
        </div>

        <div className="mt-6 flex justify-center w-full">
          <button onClick={onClose} className="px-8 py-2.5 bg-black text-white rounded-full text-sm font-semibold shadow-lg hover:bg-black/80 hover:-translate-y-0.5 transition-all">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
