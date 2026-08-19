import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { mapPerson, mapApplication, mapTransaction, mapIpo } from '../../lib/mappers';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  personId: number | null;
}

export const PersonDetailsModal: React.FC<Props> = ({ isOpen, onClose, personId }) => {
  const [activeTab, setActiveTab] = useState<'applications' | 'transactions'>('applications');

  const { data, isLoading } = useQuery({
    queryKey: ['personDetails', personId],
    queryFn: async () => {
      if (!personId) return null;

      const [
        { data: personData },
        { data: appsData },
        { data: txsData },
        { data: iposData },
        { data: allocsData },
        { data: holdingsData },
        { data: salesData },
      ] = await Promise.all([
        supabase.from('people').select('*').eq('id', personId).single(),
        supabase.from('applications').select('*').eq('applicant_person_id', personId),
        supabase.from('transactions').select('*').or(`from_person_id.eq.${personId},to_person_id.eq.${personId}`),
        supabase.from('ipos').select('*'),
        supabase.from('allocations').select('*').eq('current_holder_id', personId).eq('current_holder_type', 'PERSON').eq('status', 'ACTIVE'),
        supabase.from('holdings').select('*').eq('person_id', personId),
        supabase.from('sales').select('*').eq('person_id', personId),
      ]);

      const person = personData ? mapPerson(personData) : null;
      const apps = (appsData || []).map(mapApplication);
      const txs = (txsData || []).map(mapTransaction);
      const ipos = (iposData || []).map(mapIpo);
      const allocs = allocsData || [];
      const holdings = holdingsData || [];
      const sales = salesData || [];

      const populatedApps = apps.map(app => {
        const ipo = ipos.find(i => i.id === app.ipoId);
        return { ...app, ipo };
      }).reverse();

      const populatedTxs = txs.map(tx => {
        let ipoName = '-';
        if (tx.ipoId) {
          const ipo = ipos.find(i => i.id === tx.ipoId);
          if (ipo) ipoName = ipo.ipoName;
        }
        return { ...tx, ipoName };
      }).reverse();

      // Balance summary
      const sentTxs = txs.filter(t => t.toPersonId === personId && !!t.fromBankAccountId);
      const returnTxs = txs.filter(t => t.fromPersonId === personId && !!t.toBankAccountId);
      const totalSent = sentTxs.reduce((s, t) => s + t.amount, 0);
      const totalReturned = returnTxs.reduce((s, t) => s + t.amount, 0);

      const ipoBlocked = allocs.filter(a => a.purpose === 'IPO_BLOCKED').reduce((s, a) => s + a.amount, 0);
      const unallocated = allocs.filter(a => a.purpose === 'UNALLOCATED').reduce((s, a) => s + a.amount, 0);
      const invested = allocs.filter(a => a.purpose === 'INVESTED').reduce((s, a) => s + a.amount, 0);
      const currentlyHeld = ipoBlocked + unallocated + invested;

      const pendingProfit = holdings.reduce((s, h) => s + (h.unrealized_profit || 0), 0);
      const totalRealizedProfit = sales.reduce((s, s2) => s + (s2.our_profit_share || 0), 0);

      return {
        person, applications: populatedApps, transactions: populatedTxs,
        totalSent, totalReturned, ipoBlocked, unallocated, invested,
        currentlyHeld, pendingProfit, totalRealizedProfit
      };
    },
    enabled: !!personId,
  });

  if (!isOpen || !personId) return null;
  if (isLoading || !data) return (
    <Modal isOpen={isOpen} onClose={onClose} title="Loading..." className="max-w-4xl">
      <div className="p-8 text-center text-text-secondary">Loading details...</div>
    </Modal>
  );

  const { person, applications, transactions, totalSent, totalReturned, ipoBlocked, currentlyHeld, pendingProfit, totalRealizedProfit } = data;
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  const formatCurrencyFull = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${person?.fullName} - Details`} className="max-w-4xl">
      {/* Balance Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mx-4 my-3 p-3 rounded-xl bg-bg-secondary/50 border border-black/5">
        <div className="text-center">
          <div className="text-xs text-text-tertiary mb-1">Total Sent</div>
          <div className="text-sm font-bold text-text-primary">{formatCurrency(totalSent)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-text-tertiary mb-1">Returned</div>
          <div className="text-sm font-bold text-accent-green">{formatCurrency(totalReturned)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-text-tertiary mb-1">Still Held</div>
          <div className="text-sm font-bold text-accent-orange">{formatCurrency(currentlyHeld)}</div>
          {ipoBlocked > 0 && <div className="text-[10px] text-text-tertiary">₹{ipoBlocked.toLocaleString('en-IN')} blocked</div>}
        </div>
        <div className="text-center">
          <div className="text-xs text-text-tertiary mb-1">Profit</div>
          {pendingProfit !== 0 ? (
            <div className={`text-sm font-bold ${pendingProfit > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {formatCurrencyFull(pendingProfit)}
              <span className="text-[10px] font-normal text-text-tertiary ml-1">pending</span>
            </div>
          ) : totalRealizedProfit > 0 ? (
            <div className="text-sm font-bold text-accent-green">{formatCurrency(totalRealizedProfit)}</div>
          ) : (
            <div className="text-sm text-text-tertiary">—</div>
          )}
          {totalRealizedProfit > 0 && pendingProfit !== 0 && (
            <div className="text-[10px] text-text-tertiary">+{formatCurrency(totalRealizedProfit)} realized</div>
          )}
        </div>
      </div>

      <div className="flex border-b border-black/5 mb-4 px-2 pt-2">
        <button 
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'applications' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          onClick={() => setActiveTab('applications')}
        >
          Applications ({applications.length})
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transactions' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions ({transactions.length})
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {activeTab === 'applications' && (
          <Table>
            <TableHeader>
              <TableRow className="bg-bg-secondary/40 sticky top-0 z-10">
                <TableHead>IPO</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Lots</TableHead>
                <TableHead className="text-right">Blocked</TableHead>
                <TableHead className="text-right">Invested</TableHead>
                <TableHead className="text-right">Refund</TableHead>
                <TableHead className="text-center">Allotment</TableHead>
                <TableHead className="text-center">Money</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-text-secondary py-8">No applications found.</TableCell></TableRow>
              ) : applications.map(app => (
                <TableRow key={app.id} className="hover:bg-bg-secondary/20">
                  <TableCell className="font-medium text-text-primary">{app.ipo?.ipoName}</TableCell>
                  <TableCell>
                    {app.applicationType === 'OWN_DEMAT' ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue">Own</span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple">Friend</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">{app.appliedLots}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(app.blockedAmount)}</TableCell>
                  <TableCell className="text-right font-medium text-accent-green">{app.investmentAmount > 0 ? formatCurrency(app.investmentAmount) : '-'}</TableCell>
                  <TableCell className="text-right font-medium text-accent-orange">{app.refundAmount > 0 ? formatCurrency(app.refundAmount) : '-'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={app.allotmentStatus === 'FULL' ? 'success' : app.allotmentStatus === 'PARTIAL' ? 'warning' : app.allotmentStatus === 'NIL' ? 'danger' : 'info'}>
                      {app.allotmentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={app.moneyStatus === 'BLOCKED' ? 'warning' : app.moneyStatus === 'INVESTED' ? 'success' : 'default'}>
                      {app.moneyStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {activeTab === 'transactions' && (
          <Table>
            <TableHeader>
              <TableRow className="bg-bg-secondary/40 sticky top-0 z-10">
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>IPO</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-text-secondary py-8">No transactions found.</TableCell></TableRow>
              ) : transactions.map(tx => (
                <TableRow key={tx.id} className="hover:bg-bg-secondary/20">
                  <TableCell className="text-sm">{new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</TableCell>
                  <TableCell className="text-sm font-medium">{tx.transactionType.replace(/_/g, ' ')}</TableCell>
                  <TableCell>
                    {tx.fromPersonId === personId ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange">Sent Out</span>
                    ) : tx.toPersonId === personId ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green">Received In</span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary">Internal</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">{tx.ipoName}</TableCell>
                  <TableCell className="text-right font-semibold text-text-primary">{formatCurrency(tx.amount)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={tx.status === 'COMPLETED' ? 'success' : tx.status === 'FAILED' ? 'danger' : 'warning'}>
                      {tx.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Modal>
  );
};
