import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { mapPerson, mapApplication, mapTransaction, mapIpo, mapDematAccount } from '../../lib/mappers';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { User, CreditCard, FileText, Hash, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const PersonDetails: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const personId = id ? parseInt(id, 10) : null;
  const [activeTab, setActiveTab] = useState<'profile' | 'applications' | 'transactions'>('profile');

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
        { data: dematsData },
      ] = await Promise.all([
        supabase.from('people').select('*').eq('id', personId).single(),
        supabase.from('applications').select('*').eq('applicant_person_id', personId),
        supabase.from('transactions').select('*').or(`from_person_id.eq.${personId},to_person_id.eq.${personId}`),
        supabase.from('ipos').select('*'),
        supabase.from('allocations').select('*').eq('current_holder_id', personId).eq('current_holder_type', 'PERSON').eq('status', 'ACTIVE'),
        supabase.from('holdings').select('*').eq('person_id', personId),
        supabase.from('sales').select('*').eq('person_id', personId),
        supabase.from('demat_accounts').select('*').eq('holder_person_id', personId),
      ]);

      const person = personData ? mapPerson(personData) : null;
      const apps = (appsData || []).map(mapApplication);
      const txs = (txsData || []).map(mapTransaction);
      const ipos = (iposData || []).map(mapIpo);
      const demats = (dematsData || []).map(mapDematAccount);
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
        person, applications: populatedApps, transactions: populatedTxs, demats,
        totalSent, totalReturned, ipoBlocked, unallocated, invested,
        currentlyHeld, pendingProfit, totalRealizedProfit
      };
    },
    enabled: !!personId,
  });

  if (!personId) return null;
  if (isLoading || !data) return (
    <div className="flex h-full w-full items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-blue/20 border-t-accent-blue" />
    </div>
  );

  const { person, applications, transactions, demats, totalSent, totalReturned, currentlyHeld, ipoBlocked, pendingProfit, totalRealizedProfit } = data;
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  const formatCurrencyFull = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);

  return (
    <div className="space-y-6 pb-10 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/people')}
          className="p-2 rounded-xl hover:bg-black/5 transition-colors text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{person?.fullName}</h1>
          <p className="mt-1 text-text-secondary">Detailed breakdown of associated accounts and ledger.</p>
        </div>
      </div>
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
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'profile' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
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
        {activeTab === 'profile' && (
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-bg-secondary/30 p-5 rounded-2xl border border-border-color space-y-4">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <User size={16} className="text-accent-blue" />
                  Personal Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-text-secondary">Full Name</div>
                    <div className="text-sm font-medium text-text-primary">{person?.fullName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary">PAN Card</div>
                    <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                      <CreditCard size={14} className="text-text-tertiary" />
                      {person?.panNumber || 'Not provided'}
                    </div>
                  </div>
                  {user && person?.notes && (
                    <div>
                      <div className="text-xs text-text-secondary">Notes</div>
                      <div className="text-sm font-medium text-text-primary flex items-start gap-2 mt-1">
                        <FileText size={14} className="text-text-tertiary mt-0.5 shrink-0" />
                        <span className="whitespace-pre-wrap">{person.notes}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-bg-secondary/30 p-5 rounded-2xl border border-border-color space-y-4">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Hash size={16} className="text-accent-blue" />
                  Demat Accounts ({demats.length})
                </h3>
                {demats.length === 0 ? (
                  <div className="text-sm text-text-secondary py-4 text-center">No Demat accounts linked.</div>
                ) : (
                  <div className="space-y-3">
                    {demats.map(demat => (
                      <div key={demat.id} className="p-3 bg-white/50 rounded-xl border border-black/5 flex items-start justify-between">
                        <div>
                          <div className="text-sm font-bold text-text-primary">{demat.brokerName}</div>
                          <div className="text-xs text-text-secondary font-mono mt-0.5">{demat.dematId || 'No ID'}</div>
                          {demat.notes && <div className="text-[10px] text-text-tertiary mt-1">{demat.notes}</div>}
                        </div>
                        <Badge variant={demat.isActive ? 'success' : 'default'}>
                          {demat.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
    </div>
  );
};
