import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus, Search, Filter, Building, User, Wallet, CreditCard,
  CheckCircle2, ChevronDown, ArrowRightLeft, Users, Landmark, Edit2, Trash2,
} from 'lucide-react';
import { db } from '../../db/schema';
import type { ApplicationType, FundingMethod } from '../../db/schema';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { TransactionEngine } from '../../engine/TransactionEngine';
import { Pagination } from '../../components/ui/Pagination';
import { useIPOFilter } from '../../hooks/useIPOFilter';
import { motion } from 'framer-motion';

// ── Allotment Modal ─────────────────────────────────────────────────────────
interface AllotmentModalProps {
  app: any;
  isOpen: boolean;
  onClose: () => void;
}

const AllotmentModal: React.FC<AllotmentModalProps> = ({ app, isOpen, onClose }) => {
  const [allottedLots, setAllottedLots] = useState(0);
  const [allotmentDate, setAllotmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Refund split state (FRIEND_DEMAT only)
  const [returnAmount, setReturnAmount] = useState(0);
  const [returnBankId, setReturnBankId] = useState(0);
  const [returnUtr, setReturnUtr] = useState('');
  const [retainAmount, setRetainAmount] = useState(0);
  const [reuseAmount, setReuseAmount] = useState(0);
  const [reuseIpoId, setReuseIpoId] = useState(0);

  const banks = useLiveQuery(() => db.bankAccounts.filter(b => b.isActive).toArray(), []);
  const openIpos = useLiveQuery(() => db.ipos.where('status').anyOf(['OPEN', 'UPCOMING', 'CLOSED']).toArray(), []);

  const blockedAmount = app?.blockedAmount ?? 0;
  const price = app?.ipoPrice ?? 0;
  const lotSize = app?.lotSizeSnapshot ?? 0;
  const investmentAmount = allottedLots * lotSize * price;
  const refundAmount = blockedAmount - investmentAmount;
  const isFriend = app?.applicationType === 'FRIEND_DEMAT';

  const refundSplitTotal = returnAmount + retainAmount + reuseAmount;
  const refundSplitValid = Math.abs(refundSplitTotal - refundAmount) < 0.01;

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFriend && refundAmount > 0 && !refundSplitValid) {
      alert(`Refund split must total ${fmt(refundAmount)}`);
      return;
    }
    setLoading(true);
    try {
      let refundActions = undefined;
      if (isFriend && refundAmount > 0) {
        refundActions = [];
        if (returnAmount > 0) {
          if (!returnBankId) { alert('Select a bank to return refund to.'); setLoading(false); return; }
          refundActions.push({ action: 'RETURN_TO_BANK' as const, amount: returnAmount, targetBankAccountId: returnBankId, utr: returnUtr || undefined });
        }
        if (retainAmount > 0) refundActions.push({ action: 'RETAIN_WITH_FRIEND' as const, amount: retainAmount });
        if (reuseAmount > 0) {
          if (!reuseIpoId) { alert('Select an IPO to reuse refund for.'); setLoading(false); return; }
          refundActions.push({ action: 'REUSE_FOR_IPO' as const, amount: reuseAmount, targetIpoId: reuseIpoId });
        }
      }

      await TransactionEngine.processAllotment(app.id!, allottedLots, refundActions, allotmentDate);
      onClose();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-set refund split defaults when refund amount changes
  useEffect(() => {
    setRetainAmount(refundAmount);
    setReturnAmount(0);
    setReuseAmount(0);
  }, [refundAmount]);

  if (!app) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Process Allotment — ${app.ipo?.ipoName}`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Summary banner */}
        <div className="rounded-xl bg-bg-secondary/60 p-4 border border-black/5 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-text-secondary">Application</span>
            <span className="font-medium text-text-primary">{app.applicationType === 'OWN_DEMAT' ? 'Own Demat' : 'Friend Demat'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Applicant</span>
            <span className="font-medium text-text-primary">{app.applicantPerson?.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Applied Lots</span>
            <span className="font-medium text-text-primary">{app.appliedLots} lots (₹{price} × {lotSize} shares)</span>
          </div>
          <div className="flex justify-between border-t border-black/5 pt-2">
            <span className="text-text-secondary">Blocked Amount</span>
            <span className="font-bold text-text-primary">{fmt(blockedAmount)}</span>
          </div>
        </div>

        {/* Allotment input */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">
            Lots Allotted <span className="text-text-tertiary text-xs">(0 = not allotted)</span>
          </label>
          <Input
            type="number" min={0} max={app.appliedLots}
            value={allottedLots}
            onChange={e => setAllottedLots(Math.min(app.appliedLots, Math.max(0, Number(e.target.value))))}
            required
          />
        </div>

        {/* Allotment date */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Allotment Date</label>
          <Input type="date" value={allotmentDate} onChange={e => setAllotmentDate(e.target.value)} />
        </div>

        {/* Auto-calculated amounts */}
        <div className="rounded-xl bg-bg-secondary/50 p-4 border border-black/5 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-text-secondary">Investment Amount</span>
            <span className={`font-bold ${investmentAmount > 0 ? 'text-accent-green' : 'text-text-tertiary'}`}>
              {fmt(investmentAmount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Refund Amount</span>
            <span className={`font-bold ${refundAmount > 0 ? 'text-accent-orange' : 'text-text-tertiary'}`}>
              {fmt(refundAmount)}
            </span>
          </div>
        </div>

        {/* OWN DEMAT — informational only */}
        {!isFriend && refundAmount > 0 && (
          <div className="rounded-xl border border-accent-blue/20 bg-accent-blue/5 p-4 text-sm">
            <div className="flex items-center gap-2 text-accent-blue font-medium mb-1">
              <Landmark size={15} />
              Own Demat — Block Released Automatically
            </div>
            <p className="text-text-secondary text-xs">
              {fmt(refundAmount)} will be released back to your bank automatically.
              No transaction required — this is a state change, not a money movement.
            </p>
          </div>
        )}

        {/* FRIEND DEMAT — 3-way refund split */}
        {isFriend && refundAmount > 0 && (
          <div className="space-y-4 pt-2 border-t border-black/5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Users size={15} className="text-accent-purple" />
                Refund Action — {fmt(refundAmount)}
              </h4>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${refundSplitValid ? 'text-accent-green bg-accent-green/10' : 'text-accent-red bg-accent-red/10'}`}>
                {fmt(refundSplitTotal)} / {fmt(refundAmount)}
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Split the refund across these 3 options. Total must equal {fmt(refundAmount)}.
            </p>

            {/* Return to Bank */}
            <div className="rounded-xl border border-black/10 p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Landmark size={14} className="text-accent-green" /> Return to My Bank
                </span>
                <Input
                  type="number" min={0} max={refundAmount}
                  value={returnAmount}
                  onChange={e => {
                    const v = Math.min(refundAmount, Number(e.target.value));
                    setReturnAmount(v);
                    setRetainAmount(Math.max(0, refundAmount - v - reuseAmount));
                  }}
                  className="w-32 text-right"
                />
              </div>
              {returnAmount > 0 && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/5">
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary">Deposit to Bank</label>
                    <select
                      className="w-full px-3 py-2 bg-bg-secondary border border-transparent rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent-blue appearance-none"
                      value={returnBankId}
                      onChange={e => setReturnBankId(Number(e.target.value))}
                    >
                      <option value={0}>-- Select Bank --</option>
                      {banks?.map(b => <option key={b.id} value={b.id}>{b.accountName}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary">UTR (Optional)</label>
                    <Input placeholder="UTR123" value={returnUtr} onChange={e => setReturnUtr(e.target.value)} className="text-xs" />
                  </div>
                </div>
              )}
            </div>

            {/* Retain with Friend */}
            <div className="rounded-xl border border-black/10 p-4 space-y-1 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <User size={14} className="text-accent-purple" /> Retain with Friend
                </span>
                <Input
                  type="number" min={0} max={refundAmount}
                  value={retainAmount}
                  onChange={e => {
                    const v = Math.min(refundAmount, Number(e.target.value));
                    setRetainAmount(v);
                  }}
                  className="w-32 text-right"
                />
              </div>
              <p className="text-xs text-text-secondary">No transaction created. Money stays with friend as unallocated balance.</p>
            </div>

            {/* Reuse for Next IPO */}
            <div className="rounded-xl border border-black/10 p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <ArrowRightLeft size={14} className="text-accent-blue" /> Reuse for Next IPO
                </span>
                <Input
                  type="number" min={0} max={refundAmount}
                  value={reuseAmount}
                  onChange={e => {
                    const v = Math.min(refundAmount, Number(e.target.value));
                    setReuseAmount(v);
                    setRetainAmount(Math.max(0, refundAmount - returnAmount - v));
                  }}
                  className="w-32 text-right"
                />
              </div>
              {reuseAmount > 0 && (
                <div className="pt-2 border-t border-black/5">
                  <label className="text-xs text-text-secondary mb-1 block">Select Next IPO</label>
                  <select
                    className="w-full px-3 py-2 bg-bg-secondary border border-transparent rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent-blue appearance-none"
                    value={reuseIpoId}
                    onChange={e => setReuseIpoId(Number(e.target.value))}
                  >
                    <option value={0}>-- Select IPO --</option>
                    {openIpos?.filter(i => i.id !== app.ipoId).map(i => (
                      <option key={i.id} value={i.id}>{i.ipoName}</option>
                    ))}
                  </select>
                </div>
              )}
              <p className="text-xs text-text-secondary">No transaction created. Internal allocation to next IPO.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            type="submit" variant="primary" disabled={loading}
          >
            {loading ? 'Processing...' : 'Process Allotment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Edit Application Modal ───────────────────────────────────────────────────
interface EditApplicationModalProps {
  app: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  setEditingApp: (app: any) => void;
}

const EditApplicationModal: React.FC<EditApplicationModalProps> = ({ app, isOpen, onClose, onSave, setEditingApp }) => {
  if (!app) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Application — ${app.ipo?.ipoName}`}>
      <form onSubmit={onSave} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Notes (Optional)</label>
          <Input 
            value={app.notes || ''} 
            onChange={e => setEditingApp({...app, notes: e.target.value})} 
            placeholder="Add any tracking notes..." 
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save Changes</Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Main Applications Component ─────────────────────────────────────────────
export const Applications: React.FC = () => {
  const { selectedIpoId, setSelectedIpoId } = useIPOFilter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [allotmentApp, setAllotmentApp] = useState<any>(null);
  const [editingApp, setEditingApp] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // New application form state
  const [step, setStep] = useState(1);
  const [appType, setAppType] = useState<ApplicationType>('FRIEND_DEMAT');
  const [ipoId, setIpoId] = useState(0);
  const [applicantPersonId, setApplicantPersonId] = useState(0);
  const [dematAccountId, setDematAccountId] = useState(0);
  const [fundingBankId, setFundingBankId] = useState(0);
  const [fundingMethod, setFundingMethod] = useState<FundingMethod>('NEW_MONEY');
  const [appliedLots, setAppliedLots] = useState(1);
  const [personAvailableBalance, setPersonAvailableBalance] = useState(0);
  const [bankAvailableBalance, setBankAvailableBalance] = useState(0);

  const ipos = useLiveQuery(() => db.ipos.where('status').anyOf(['UPCOMING', 'OPEN', 'CLOSED', 'ALLOTMENT_PENDING']).toArray(), []);
  const allIposForFilter = useLiveQuery(() => db.ipos.toArray(), []);
  const allPeople = useLiveQuery(() => db.people.filter(p => p.isActive).toArray(), []);
  const banks = useLiveQuery(() => db.bankAccounts.filter(b => b.isActive).toArray(), []);

  // People for selection: self for OWN, non-self for FRIEND
  const selfPeople = allPeople?.filter(p => p.isSelf) ?? [];
  const friendPeople = allPeople?.filter(p => !p.isSelf) ?? [];

  // Demat accounts for selected applicant
  const applicantDemats = useLiveQuery(async () => {
    if (!applicantPersonId) return [];
    return db.dematAccounts.where('holderPersonId').equals(applicantPersonId).filter(d => d.isActive).toArray();
  }, [applicantPersonId]);

  const applications = useLiveQuery(async () => {
    const apps = await db.applications.toArray();
    const populated = await Promise.all(apps.map(async app => {
      const ipo = await db.ipos.get(app.ipoId);
      const applicantPerson = await db.people.get(app.applicantPersonId);
      const demat = await db.dematAccounts.get(app.dematAccountId);
      const fundingBank = await db.bankAccounts.get(app.fundingBankAccountId);

      return { ...app, ipo, applicantPerson, demat, fundingBank };
    }));
    return populated.reverse();
  }, []);

  const filteredApplications = applications?.filter(app => {
    if (selectedIpoId && app.ipoId !== selectedIpoId) return false;
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      app.ipo?.ipoName?.toLowerCase().includes(s) ||
      app.applicantPerson?.fullName?.toLowerCase().includes(s) ||
      app.demat?.brokerName?.toLowerCase().includes(s) ||
      app.fundingBank?.accountName?.toLowerCase().includes(s)
    );
  }) ?? [];

  const paginated = filteredApplications.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedIpoId]);

  // Fetch person available balance when person changes
  useEffect(() => {
    if (applicantPersonId > 0 && appType === 'FRIEND_DEMAT') {
      TransactionEngine.getPersonBalance(applicantPersonId).then(b => {
        setPersonAvailableBalance(b.unallocated);
      });
    } else {
      setPersonAvailableBalance(0);
    }
  }, [applicantPersonId, appType]);

  // Fetch bank available balance when bank changes
  useEffect(() => {
    if (fundingBankId > 0) {
      TransactionEngine.getBankAvailableBalance(fundingBankId).then(setBankAvailableBalance);
    } else {
      setBankAvailableBalance(0);
    }
  }, [fundingBankId]);

  const selectedIpo = ipos?.find(i => i.id === ipoId);
  const totalRequired = selectedIpo ? selectedIpo.pricePerShare * selectedIpo.lotSize * appliedLots : 0;

  let newMoneyAmount = 0;
  let existingBalanceAmount = 0;

  if (appType === 'FRIEND_DEMAT') {
    if (fundingMethod === 'EXISTING_BALANCE') {
      existingBalanceAmount = Math.min(totalRequired, personAvailableBalance);
      newMoneyAmount = totalRequired - existingBalanceAmount;
    } else if (fundingMethod === 'MIXED') {
      existingBalanceAmount = Math.min(totalRequired, personAvailableBalance);
      newMoneyAmount = totalRequired - existingBalanceAmount;
    } else { // NEW_MONEY
      newMoneyAmount = totalRequired;
    }
  }

  const resetForm = () => {
    setStep(1); setAppType('FRIEND_DEMAT'); setIpoId(0);
    setApplicantPersonId(0); setDematAccountId(0); setFundingBankId(0);
    setFundingMethod('NEW_MONEY'); setAppliedLots(1);
  };

  const openEditModal = (app: any) => {
    setEditingApp({ ...app });
    setIsEditModalOpen(true);
  };

  const handleUpdateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp || !editingApp.id) return;
    await db.applications.update(editingApp.id, {
      notes: editingApp.notes,
      updatedAt: new Date().toISOString()
    });
    setIsEditModalOpen(false);
    setEditingApp(null);
  };

  const handleDeleteApp = (app: any) => {
    alert('Applications cannot be deleted directly because they are linked to financial transactions and ledger allocations. Please process refunds or use cancellation workflows to maintain ledger integrity.');
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipoId || !applicantPersonId || !dematAccountId || !fundingBankId) return;

    try {
      await TransactionEngine.applyForIPO({
        ipoId,
        applicantPersonId,
        dematAccountId,
        fundingBankAccountId: fundingBankId,
        applicationType: appType,
        fundingMethod: appType === 'OWN_DEMAT' ? 'OWN_BANK_BLOCK' : fundingMethod,
        appliedLots,
        newMoneyAmount,
        existingBalanceAmount,
        date: new Date().toISOString().split('T')[0],
      });

      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const fmt = (v: number = 0) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const getStatusBadge = (app: any) => {
    if (app.allotmentStatus === 'PENDING') return <Badge variant="info">Applied</Badge>;
    if (app.allotmentStatus === 'FULL') return <Badge variant="success">Allotted</Badge>;
    if (app.allotmentStatus === 'PARTIAL') return <Badge variant="warning">Partial</Badge>;
    if (app.allotmentStatus === 'NIL') return <Badge variant="danger">Not Allotted</Badge>;
    return <Badge variant="default">{app.allotmentStatus}</Badge>;
  };

  const getMoneyStatusBadge = (ms: string) => {
    switch (ms) {
      case 'BLOCKED':  return <Badge variant="warning">Blocked</Badge>;
      case 'INVESTED': return <Badge variant="success">Invested</Badge>;
      case 'RELEASED': return <Badge variant="default">Released</Badge>;
      case 'PARTIAL':  return <Badge variant="warning">Partial</Badge>;
      default: return <Badge variant="default">{ms}</Badge>;
    }
  };

  // Summary row calculations
  const summaryTotals = filteredApplications.reduce(
    (acc, app) => ({
      lots: acc.lots + app.appliedLots,
      blocked: acc.blocked + app.blockedAmount,
      invested: acc.invested + app.investmentAmount,
      refund: acc.refund + app.refundAmount,
    }),
    { lots: 0, blocked: 0, invested: 0, refund: 0 }
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Applications Master</h1>
          <p className="mt-1 text-text-secondary">
            Complete view of all IPO applications — Friend Demat and Own Demat.
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
          New Application
        </Button>
      </div>

      <Card noPadding className="overflow-hidden border border-black/5 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-black/5 p-4 md:flex-row md:items-center md:justify-between bg-bg-secondary/20">
          <div className="flex flex-1 items-center gap-3">
            <Input
              icon={<Search size={16} />}
              placeholder="Search by IPO, person, broker, bank..."
              className="max-w-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-tertiary">
                <Filter size={13} />
              </div>
              <select
                value={selectedIpoId ?? ''}
                onChange={e => setSelectedIpoId(e.target.value === '' ? null : Number(e.target.value))}
                className="pl-8 pr-7 py-2 rounded-xl bg-white border border-black/10 text-sm font-medium text-text-primary shadow-sm hover:border-accent-blue/40 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 transition-all appearance-none cursor-pointer"
              >
                <option value="">All IPOs</option>
                {allIposForFilter?.map(ipo => (
                  <option key={ipo.id} value={ipo.id}>{ipo.ipoName}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-text-tertiary">
                <ChevronDown size={13} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-text-secondary font-medium">
            <span className="flex items-center gap-1.5"><Users size={13} className="text-accent-purple" /> Friend Demat</span>
            <span className="flex items-center gap-1.5 ml-2"><Landmark size={13} className="text-accent-blue" /> Own Demat</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-bg-secondary/40 border-b border-black/5 text-text-tertiary">
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider sticky left-0 bg-bg-secondary/95 backdrop-blur z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">IPO & Applicant</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Demat</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Funding Bank</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-right">Lots</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-right">Blocked</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-right">Invested</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-right">Refund</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-center">Allotment</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-center">Money</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-text-secondary">
                    No applications found. Create one to get started.
                  </td>
                </tr>
              )}
              {paginated.map(app => (
                <motion.tr
                  key={app.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-bg-secondary/20 transition-colors group"
                >
                  <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-bg-primary transition-colors z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                    <div className="font-semibold text-text-primary">{app.ipo?.ipoName}</div>
                    <div className="text-xs text-text-secondary mt-0.5">{app.applicantPerson?.fullName}</div>
                  </td>
                  <td className="px-4 py-3">
                    {app.applicationType === 'OWN_DEMAT' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue">
                        <Landmark size={10} /> Own
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple">
                        <Users size={10} /> Friend
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-text-primary">{app.demat?.brokerName ?? '—'}</div>
                    <div className="text-xs text-text-tertiary mt-0.5 truncate max-w-[100px]">{app.demat?.dematId ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-text-primary">{app.fundingBank?.bankName ?? '—'}</div>
                    <div className="text-xs text-text-tertiary mt-0.5">{app.fundingBank?.accountName ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-medium text-text-primary">{app.appliedLots}</div>
                    {app.allottedLots > 0 && (
                      <div className="text-xs text-accent-green mt-0.5">{app.allottedLots} allotted</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-text-primary">{fmt(app.blockedAmount)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${app.investmentAmount > 0 ? 'text-accent-green' : 'text-text-tertiary'}`}>
                      {app.investmentAmount > 0 ? fmt(app.investmentAmount) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${app.refundAmount > 0 ? 'text-accent-orange' : 'text-text-tertiary'}`}>
                      {app.refundAmount > 0 ? fmt(app.refundAmount) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(app)}</td>
                  <td className="px-4 py-3 text-center">{getMoneyStatusBadge(app.moneyStatus)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {app.allotmentStatus === 'PENDING' && (
                        <Button size="sm" variant="outline" className="h-8 text-xs px-2"
                          onClick={() => setAllotmentApp(app)}>
                          Allotment
                        </Button>
                      )}
                      <button 
                        onClick={() => openEditModal(app)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-all hover:bg-accent-blue/10 hover:text-accent-blue"
                        title="Edit Notes"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteApp(app)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary transition-all hover:bg-accent-red/10 hover:text-accent-red"
                        title="Delete Application"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
            {filteredApplications.length > 0 && (
              <tfoot>
                <tr className="bg-bg-secondary/60 border-t-2 border-black/10 font-semibold text-sm">
                  <td className="px-4 py-3 sticky left-0 bg-bg-secondary/95 backdrop-blur z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] text-text-secondary" colSpan={4}>
                    Total ({filteredApplications.length} applications)
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-text-primary">{summaryTotals.lots} lots</td>
                  <td className="px-4 py-3 text-right font-bold text-text-primary">{fmt(summaryTotals.blocked)}</td>
                  <td className="px-4 py-3 text-right font-bold text-accent-green">{summaryTotals.invested > 0 ? fmt(summaryTotals.invested) : '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-accent-orange">{summaryTotals.refund > 0 ? fmt(summaryTotals.refund) : '—'}</td>
                  <td colSpan={3} className="px-4 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <Pagination
          currentPage={currentPage} pageSize={pageSize}
          totalItems={filteredApplications.length}
          onPageChange={setCurrentPage}
        />
      </Card>

      {/* New Application Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title="New IPO Application">
        <form onSubmit={handleApply} className="space-y-5">

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step >= s ? 'bg-accent-blue text-white' : 'bg-bg-secondary text-text-tertiary'}`}
                  onClick={() => step > s && setStep(s)}
                  style={{ cursor: step > s ? 'pointer' : 'default' }}
                >
                  {s}
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 rounded ${step > s ? 'bg-accent-blue' : 'bg-bg-tertiary'}`} />}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between text-xs text-text-tertiary -mt-2">
            <span>IPO & Type</span>
            <span className="mr-4">Accounts</span>
            <span>Lots & Summary</span>
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">Select IPO</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
                    <Building size={16} />
                  </div>
                  <select
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary border border-transparent rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue appearance-none cursor-pointer"
                    value={ipoId}
                    onChange={e => setIpoId(Number(e.target.value))}
                    required
                  >
                    <option value={0}>-- Select IPO --</option>
                    {ipos?.map(i => <option key={i.id} value={i.id}>{i.ipoName} (₹{i.pricePerShare} × {i.lotSize} = ₹{i.pricePerShare * i.lotSize}/lot)</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Application Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm transition-colors ${appType === 'FRIEND_DEMAT' ? 'border-accent-purple bg-accent-purple/5' : 'border-black/10 bg-white hover:bg-bg-secondary/50'}`}>
                    <input type="radio" className="sr-only" checked={appType === 'FRIEND_DEMAT'} onChange={() => { setAppType('FRIEND_DEMAT'); setApplicantPersonId(0); setDematAccountId(0); }} />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-text-primary flex items-center gap-2"><Users size={14} className="text-accent-purple" /> Friend Demat</span>
                      <span className="text-xs text-text-secondary">Money → Friend → IPO</span>
                    </div>
                    {appType === 'FRIEND_DEMAT' && <CheckCircle2 size={16} className="absolute right-3 top-3 text-accent-purple" />}
                  </label>
                  <label className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm transition-colors ${appType === 'OWN_DEMAT' ? 'border-accent-blue bg-accent-blue/5' : 'border-black/10 bg-white hover:bg-bg-secondary/50'}`}>
                    <input type="radio" className="sr-only" checked={appType === 'OWN_DEMAT'} onChange={() => { setAppType('OWN_DEMAT'); setApplicantPersonId(0); setDematAccountId(0); }} />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-text-primary flex items-center gap-2"><Landmark size={14} className="text-accent-blue" /> Own Demat</span>
                      <span className="text-xs text-text-secondary">My Bank → My IPO</span>
                    </div>
                    {appType === 'OWN_DEMAT' && <CheckCircle2 size={16} className="absolute right-3 top-3 text-accent-blue" />}
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="primary" disabled={!ipoId} onClick={() => setStep(2)}>
                  Next →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">
                  {appType === 'FRIEND_DEMAT' ? 'Friend (Applicant)' : 'Applicant (Self)'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary"><User size={16} /></div>
                  <select
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary border border-transparent rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue appearance-none cursor-pointer"
                    value={applicantPersonId}
                    onChange={e => { setApplicantPersonId(Number(e.target.value)); setDematAccountId(0); }}
                    required
                  >
                    <option value={0}>-- Select Person --</option>
                    {(appType === 'OWN_DEMAT' ? selfPeople : friendPeople)?.map(p => (
                      <option key={p.id} value={p.id}>{p.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {applicantPersonId > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Demat Account</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary"><CreditCard size={16} /></div>
                    <select
                      className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary border border-transparent rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue appearance-none cursor-pointer"
                      value={dematAccountId}
                      onChange={e => setDematAccountId(Number(e.target.value))}
                      required
                    >
                      <option value={0}>-- Select Demat --</option>
                      {applicantDemats?.map(d => (
                        <option key={d.id} value={d.id}>{d.brokerName}{d.dematId ? ` — ${d.dematId}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  {applicantDemats?.length === 0 && (
                    <p className="text-xs text-accent-orange">No demat accounts found for this person. Add one in Demat Accounts page.</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary">
                  Funding Bank (My Bank Account)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary"><Landmark size={16} /></div>
                  <select
                    className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary border border-transparent rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue appearance-none cursor-pointer"
                    value={fundingBankId}
                    onChange={e => setFundingBankId(Number(e.target.value))}
                    required
                  >
                    <option value={0}>-- Select Bank --</option>
                    {banks?.map(b => <option key={b.id} value={b.id}>{b.accountName} — {b.bankName}</option>)}
                  </select>
                </div>
                {fundingBankId > 0 && (
                  <p className="text-xs text-text-secondary">
                    Available: <span className={bankAvailableBalance > 0 ? 'text-accent-green font-semibold' : 'text-accent-red font-semibold'}>
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(bankAvailableBalance)}
                    </span>
                  </p>
                )}
              </div>

              {appType === 'FRIEND_DEMAT' && applicantPersonId > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-primary">Funding Method</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      { val: 'NEW_MONEY' as FundingMethod, label: 'New Transfer', desc: 'Send fresh money from bank' },
                      { val: 'EXISTING_BALANCE' as FundingMethod, label: 'Existing Balance', desc: `${personAvailableBalance > 0 ? '₹' + personAvailableBalance.toLocaleString('en-IN') + ' avail.' : 'No balance'}` },
                      { val: 'MIXED' as FundingMethod, label: 'Mixed', desc: 'Use balance + new transfer' },
                    ].map(opt => (
                      <label key={opt.val} className={`relative flex cursor-pointer rounded-xl border p-3 shadow-sm transition-colors ${fundingMethod === opt.val ? 'border-accent-blue bg-accent-blue/5' : 'border-black/10 bg-white'} ${opt.val !== 'NEW_MONEY' && personAvailableBalance <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input type="radio" className="sr-only" checked={fundingMethod === opt.val} disabled={opt.val !== 'NEW_MONEY' && personAvailableBalance <= 0} onChange={() => setFundingMethod(opt.val)} />
                        <div>
                          <span className="text-xs font-semibold text-text-primary block">{opt.label}</span>
                          <span className="text-xs text-text-tertiary">{opt.desc}</span>
                        </div>
                        {fundingMethod === opt.val && <CheckCircle2 size={14} className="absolute right-2 top-2 text-accent-blue" />}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>← Back</Button>
                <Button type="button" variant="primary" disabled={!applicantPersonId || !dematAccountId || !fundingBankId} onClick={() => setStep(3)}>
                  Next →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && selectedIpo && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary flex justify-between">
                  <span>Applied Lots</span>
                  <span className="text-text-secondary text-xs">
                    Required: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalRequired)}
                  </span>
                </label>
                <Input
                  type="number"
                  min={selectedIpo.minimumLots}
                  max={selectedIpo.maximumLots}
                  value={appliedLots}
                  onChange={e => setAppliedLots(Number(e.target.value))}
                  required
                />
              </div>

              {/* Summary */}
              <div className="rounded-xl bg-bg-secondary/50 p-4 border border-black/5 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-text-secondary">IPO</span><span className="font-medium">{selectedIpo.ipoName}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Type</span><span className="font-medium">{appType === 'FRIEND_DEMAT' ? 'Friend Demat' : 'Own Demat'}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Price × Lot</span><span className="font-medium">₹{selectedIpo.pricePerShare} × {selectedIpo.lotSize} shares</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Lots</span><span className="font-medium">{appliedLots}</span></div>
                <div className="flex justify-between border-t border-black/5 pt-2">
                  <span className="text-text-secondary font-medium">Total Required</span>
                  <span className="font-bold text-text-primary">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalRequired)}</span>
                </div>
                {appType === 'FRIEND_DEMAT' && (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-tertiary">From Existing Balance</span>
                      <span className="font-medium">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(existingBalanceAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-tertiary">New Transfer from Bank</span>
                      <span className={`font-bold ${newMoneyAmount > bankAvailableBalance ? 'text-accent-red' : 'text-text-primary'}`}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(newMoneyAmount)}</span>
                    </div>
                  </>
                )}
                {appType === 'OWN_DEMAT' && (
                  <div className="flex justify-between text-xs">
                    <span className="text-text-tertiary">Bank Available</span>
                    <span className={`font-medium ${bankAvailableBalance >= totalRequired ? 'text-accent-green' : 'text-accent-red'}`}>
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(bankAvailableBalance)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="ghost" onClick={() => setStep(2)}>← Back</Button>
                <Button
                  type="submit" variant="primary"
                  disabled={appliedLots < 1 || (appType === 'OWN_DEMAT' && totalRequired > bankAvailableBalance)}
                >
                  Submit Application
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Allotment Modal */}
      <AllotmentModal
        app={allotmentApp}
        isOpen={!!allotmentApp}
        onClose={() => setAllotmentApp(null)}
      />
      {/* Edit Application Modal */}
      <EditApplicationModal
        app={editingApp}
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingApp(null); }}
        onSave={handleUpdateApp}
        setEditingApp={setEditingApp}
      />
    </div>
  );
};
