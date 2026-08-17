import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { TransactionEngine } from '../../engine/TransactionEngine';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ArrowUpRight, ArrowDownLeft, RefreshCcw, Landmark, User, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { mapBankAccount, mapPerson } from '../../lib/mappers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTransactionModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const submitting = useRef(false);
  const [txType, setTxType] = useState<'MONEY_SENT' | 'MONEY_RECEIVED' | 'SELF_TRANSFER'>('MONEY_SENT');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [utr, setUtr] = useState('');
  const [notes, setNotes] = useState('');
  
  const [fromBankId, setFromBankId] = useState(0);
  const [toBankId, setToBankId] = useState(0);
  const [personId, setPersonId] = useState(0);
  const [loading, setLoading] = useState(false);

  const { data: banks } = useQuery({
    queryKey: ['banksActive'],
    queryFn: async () => {
      const { data } = await supabase.from('bank_accounts').select('*').eq('is_active', true);
      return (data || []).map(mapBankAccount);
    }
  });

  const { data: people } = useQuery({
    queryKey: ['peopleActiveNotSelf'],
    queryFn: async () => {
      const { data } = await supabase.from('people').select('*').eq('is_active', true).eq('is_self', false);
      return (data || []).map(mapPerson);
    }
  });

  const resetForm = () => {
    setTxType('MONEY_SENT');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setUtr('');
    setNotes('');
    setFromBankId(0);
    setToBankId(0);
    setPersonId(0);
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetForm, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    try {
      if (txType === 'MONEY_SENT') {
        if (!fromBankId || !personId) throw new Error("Select a funding bank and a recipient person.");
        await TransactionEngine.sendMoneyToPerson(Number(amount), fromBankId, personId, date, utr, notes);
      } else if (txType === 'MONEY_RECEIVED') {
        if (!personId || !toBankId) throw new Error("Select the sender person and the receiving bank.");
        await TransactionEngine.receiveMoneyFromPerson(Number(amount), personId, toBankId, date, utr, notes);
      } else if (txType === 'SELF_TRANSFER') {
        if (!fromBankId || !toBankId) throw new Error("Select both sending and receiving banks.");
        await TransactionEngine.selfTransfer(fromBankId, toBankId, Number(amount), date, utr, notes);
      }
      toast.success('Transaction saved successfully.', 'Transaction Added');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      handleClose();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save transaction.', 'Transaction Error');
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  const isFormValid = () => {
    if (!amount || Number(amount) <= 0) return false;
    if (txType === 'MONEY_SENT' && (!fromBankId || !personId)) return false;
    if (txType === 'MONEY_RECEIVED' && (!personId || !toBankId)) return false;
    if (txType === 'SELF_TRANSFER' && (!fromBankId || !toBankId || fromBankId === toBankId)) return false;
    return true;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Manual Transaction">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">Transaction Type</label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { val: 'MONEY_SENT', label: 'Send Money', icon: ArrowUpRight, desc: 'Bank → Friend', color: 'text-accent-orange' },
              { val: 'MONEY_RECEIVED', label: 'Receive Money', icon: ArrowDownLeft, desc: 'Friend → Bank', color: 'text-accent-green' },
              { val: 'SELF_TRANSFER', label: 'Self Transfer', icon: RefreshCcw, desc: 'Bank → Bank', color: 'text-accent-blue' },
            ].map(opt => (
              <label key={opt.val} className={`relative flex cursor-pointer rounded-xl border p-3 shadow-sm transition-colors ${txType === opt.val ? 'border-accent-blue bg-accent-blue/5' : 'border-black/10 bg-white hover:bg-bg-secondary/50'}`}>
                <input type="radio" className="sr-only" checked={txType === opt.val} onChange={() => {
                  setTxType(opt.val as any);
                  setFromBankId(0); setToBankId(0); setPersonId(0);
                }} />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                    <opt.icon size={14} className={opt.color} /> {opt.label}
                  </span>
                  <span className="text-[10px] text-text-secondary">{opt.desc}</span>
                </div>
                {txType === opt.val && <CheckCircle2 size={14} className="absolute right-2 top-2 text-accent-blue" />}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-4 bg-bg-secondary/30 rounded-xl border border-black/5">
          {txType === 'MONEY_SENT' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">From (My Bank)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary"><Landmark size={14} /></div>
                  <select className="w-full pl-9 pr-3 py-2 bg-white border border-black/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue appearance-none"
                    value={fromBankId} onChange={e => setFromBankId(Number(e.target.value))} required>
                    <option value={0}>-- Select Bank --</option>
                    {banks?.map(b => <option key={b.id} value={b.id}>{b.accountName}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">To (Friend)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary"><User size={14} /></div>
                  <select className="w-full pl-9 pr-3 py-2 bg-white border border-black/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue appearance-none"
                    value={personId} onChange={e => setPersonId(Number(e.target.value))} required>
                    <option value={0}>-- Select Friend --</option>
                    {people?.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {txType === 'MONEY_RECEIVED' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">From (Friend)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary"><User size={14} /></div>
                  <select className="w-full pl-9 pr-3 py-2 bg-white border border-black/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue appearance-none"
                    value={personId} onChange={e => setPersonId(Number(e.target.value))} required>
                    <option value={0}>-- Select Friend --</option>
                    {people?.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">To (My Bank)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary"><Landmark size={14} /></div>
                  <select className="w-full pl-9 pr-3 py-2 bg-white border border-black/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue appearance-none"
                    value={toBankId} onChange={e => setToBankId(Number(e.target.value))} required>
                    <option value={0}>-- Select Bank --</option>
                    {banks?.map(b => <option key={b.id} value={b.id}>{b.accountName}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {txType === 'SELF_TRANSFER' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">From Bank</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary"><Landmark size={14} /></div>
                  <select className="w-full pl-9 pr-3 py-2 bg-white border border-black/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue appearance-none"
                    value={fromBankId} onChange={e => setFromBankId(Number(e.target.value))} required>
                    <option value={0}>-- Select Bank --</option>
                    {banks?.map(b => <option key={b.id} value={b.id}>{b.accountName}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">To Bank</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary"><Landmark size={14} /></div>
                  <select className="w-full pl-9 pr-3 py-2 bg-white border border-black/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue appearance-none"
                    value={toBankId} onChange={e => setToBankId(Number(e.target.value))} required>
                    <option value={0}>-- Select Bank --</option>
                    {banks?.map(b => <option key={b.id} value={b.id}>{b.accountName}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Amount (₹)</label>
            <Input 
              type="number" min="1" step="1" 
              placeholder="e.g. 15000"
              value={amount} onChange={e => setAmount(e.target.value)} required 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Date</label>
            <Input 
              type="date" 
              value={date} onChange={e => setDate(e.target.value)} required 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">UTR / Reference (Optional)</label>
            <Input 
              placeholder="e.g. UPI123456789"
              value={utr} onChange={e => setUtr(e.target.value)} 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Notes (Optional)</label>
            <Input 
              placeholder="e.g. Sent for XYZ IPO"
              value={notes} onChange={e => setNotes(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 mt-6">
          <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading || !isFormValid()}>
            {loading ? 'Processing...' : 'Save Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
