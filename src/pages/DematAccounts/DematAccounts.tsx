import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, BookOpen, CreditCard, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { mapPerson, mapApplication, mapHolding } from '../../lib/mappers';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { motion } from 'framer-motion';
import { Pagination } from '../../components/ui/Pagination';
import { useAuth } from '../../contexts/AuthContext';
import { BlurOverlay } from '../../components/ui/BlurOverlay';

const BROKERS = ['Zerodha', 'Groww', 'Angel One', 'Upstox', 'ICICI Direct', 'HDFC Securities', 'Kotak Securities', 'SBI Securities', 'Motilal Oswal', 'Other'];

const BROKER_COLORS: Record<string, string> = {
  'Zerodha': 'bg-[#387ED1]/10 text-[#387ED1]',
  'Groww': 'bg-[#00D09C]/10 text-[#00A37E]',
  'Angel One': 'bg-[#E8141A]/10 text-[#E8141A]',
  'Upstox': 'bg-[#7B2FF7]/10 text-[#7B2FF7]',
  'ICICI Direct': 'bg-[#F7841B]/10 text-[#D47318]',
};

export const DematAccounts: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [form, setForm] = useState({
    holderPersonId: 0,
    brokerName: 'Zerodha',
    dematId: '',
    notes: '',
  });

  const openAddModal = () => {
    setEditingId(null);
    setForm({ holderPersonId: 0, brokerName: 'Zerodha', dematId: '', notes: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (d: any) => {
    setEditingId(d.id!);
    setForm({
      holderPersonId: d.holderPersonId,
      brokerName: d.brokerName,
      dematId: d.dematId || '',
      notes: d.notes || '',
    });
    setIsModalOpen(true);
  };

  const { data: peopleData } = useQuery({
    queryKey: ['peopleActive'],
    queryFn: async () => {
      const { data } = await supabase.from('people').select('*').eq('is_active', true);
      return (data || []).map(mapPerson);
    }
  });

  const { data: dematData, isLoading } = useQuery({
    queryKey: ['dematAccounts'],
    queryFn: async () => {
      const [
        { data: dData },
        { data: pData },
        { data: aData },
        { data: hData }
      ] = await Promise.all([
        supabase.from('demat_accounts').select('*').eq('is_active', true),
        supabase.from('people').select('*'),
        supabase.from('applications').select('*'),
        supabase.from('holdings').select('*')
      ]);

      const demats = dData || [];
      const people = (pData || []).map(mapPerson);
      const apps = (aData || []).map(mapApplication);
      const holdings = (hData || []).map(mapHolding);

      return demats.map(d => {
        const person = people.find(p => p.id === d.holder_person_id);
        const dApps = apps.filter(a => a.dematAccountId === d.id);
        const dHoldings = holdings.filter(h => h.dematAccountId === d.id);

        const appliedCount = dApps.length;
        const allottedCount = dApps.filter(a => a.allotmentStatus === 'FULL' || a.allotmentStatus === 'PARTIAL').length;
        const activeHoldings = dHoldings.length;
        const totalInvested = dHoldings.reduce((s, h) => s + h.shares * h.averageCost, 0);
        const currentValue = dHoldings.reduce((s, h) => s + h.currentValue, 0);
        const unrealizedPnL = dHoldings.reduce((s, h) => s + h.unrealizedProfit, 0);

        return {
          id: d.id,
          holderPersonId: d.holder_person_id,
          brokerName: d.broker_name,
          dematId: d.demat_id,
          notes: d.notes,
          isActive: d.is_active,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          person, appliedCount, allottedCount, activeHoldings, totalInvested, currentValue, unrealizedPnL
        };
      });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (d: any) => {
      const now = new Date().toISOString();
      if (d.id) {
        await supabase.from('demat_accounts').update({
          holder_person_id: d.holderPersonId,
          broker_name: d.brokerName,
          demat_id: d.dematId || null,
          notes: d.notes || null,
          updated_at: now,
        }).eq('id', d.id);
      } else {
        await supabase.from('demat_accounts').insert({
          holder_person_id: d.holderPersonId,
          broker_name: d.brokerName,
          demat_id: d.dematId || null,
          notes: d.notes || null,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dematAccounts'] });
      setIsModalOpen(false);
      setEditingId(null);
      setForm({ holderPersonId: 0, brokerName: 'Zerodha', dematId: '', notes: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await supabase.from('demat_accounts').update({
        is_active: false,
        updated_at: new Date().toISOString()
      }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dematAccounts'] });
    }
  });

  const filtered = dematData?.filter(d => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      d.person?.fullName.toLowerCase().includes(s) ||
      d.brokerName.toLowerCase().includes(s) ||
      d.dematId?.toLowerCase().includes(s)
    );
  }) ?? [];

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  React.useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.holderPersonId || !form.brokerName) return;
    saveMutation.mutate({ ...form, id: editingId });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this Demat account?')) {
      deleteMutation.mutate(id);
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const getBrokerClass = (broker: string) =>
    BROKER_COLORS[broker] ?? 'bg-accent-blue/10 text-accent-blue';

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-blue/20 border-t-accent-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Demat Accounts</h1>
          <p className="mt-1 text-text-secondary">
            Manage all Demat accounts. Each IPO application links to exactly one Demat account.
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openAddModal} disabled={!user}>
          Add Demat Account
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Accounts', value: dematData?.length ?? 0, color: 'blue', icon: <BookOpen size={18} /> },
          { label: 'With Holdings', value: dematData?.filter(d => d.activeHoldings > 0).length ?? 0, color: 'green', icon: <CreditCard size={18} /> },
          { label: 'Total Invested', value: fmt(dematData?.reduce((s, d) => s + d.totalInvested, 0) ?? 0), color: 'orange', currency: true, icon: <CreditCard size={18} /> },
          { label: 'Unrealized P&L', value: fmt(dematData?.reduce((s, d) => s + d.unrealizedPnL, 0) ?? 0), color: 'purple', currency: true, icon: <CreditCard size={18} /> },
        ].map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`flex flex-col gap-2 border border-accent-${c.color}/15`}>
              <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">{c.label}</p>
              {c.currency ? (
                <BlurOverlay blurLevel="blur-md">
                  <div className={`text-xl font-bold text-accent-${c.color}`}>{c.value}</div>
                </BlurOverlay>
              ) : (
                <div className={`text-xl font-bold text-accent-${c.color}`}>{c.value}</div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-black/5 p-4 md:flex-row md:items-center">
          <Input
            icon={<Search size={16} />}
            placeholder="Search by person, broker, demat ID..."
            className="max-w-md"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Holder</TableHead>
              <TableHead>Broker</TableHead>
              <TableHead>Demat ID</TableHead>
              <TableHead className="text-center">Applications</TableHead>
              <TableHead className="text-center">Holdings</TableHead>
              <TableHead className="text-right">Invested</TableHead>
              <TableHead className="text-right">Current Value</TableHead>
              <TableHead className="text-right">Unrealized P&L</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-text-secondary">
                  No demat accounts found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
            {paginated.map((d, i) => (
              <motion.tr
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="group border-b border-black/5 transition-colors hover:bg-bg-secondary/50"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-sm font-bold text-accent-blue">
                      {d.person?.fullName.substring(0, 2).toUpperCase() ?? '??'}
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary">{d.person?.fullName ?? '—'}</div>
                      {d.person?.isSelf && (
                        <Badge variant="info" className="mt-0.5 text-[10px] py-0">Self</Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getBrokerClass(d.brokerName)}`}>
                    {d.brokerName}
                  </span>
                </TableCell>
                <TableCell>
                  <BlurOverlay blurLevel="blur-sm">
                    <span className="font-mono text-xs text-text-primary">{d.dematId ?? '—'}</span>
                  </BlurOverlay>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-sm font-medium text-text-primary">{d.appliedCount}</div>
                  {d.allottedCount > 0 && (
                    <div className="text-xs text-accent-green">{d.allottedCount} allotted</div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className={`text-sm font-medium ${d.activeHoldings > 0 ? 'text-accent-green' : 'text-text-tertiary'}`}>
                    {d.activeHoldings}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <BlurOverlay blurLevel="blur-sm">
                    <span className="text-sm font-medium text-text-primary">
                      {d.totalInvested > 0 ? fmt(d.totalInvested) : <span className="text-text-tertiary">—</span>}
                    </span>
                  </BlurOverlay>
                </TableCell>
                <TableCell className="text-right">
                  <BlurOverlay blurLevel="blur-sm">
                    <span className="text-sm font-medium text-text-primary">
                      {d.currentValue > 0 ? fmt(d.currentValue) : <span className="text-text-tertiary">—</span>}
                    </span>
                  </BlurOverlay>
                </TableCell>
                <TableCell className="text-right">
                  <BlurOverlay blurLevel="blur-sm">
                    {d.unrealizedPnL !== 0 ? (
                      <span className={`text-sm font-semibold ${d.unrealizedPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {d.unrealizedPnL >= 0 ? '+' : ''}{fmt(d.unrealizedPnL)}
                      </span>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </BlurOverlay>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); if (user) openEditModal(d); }}
                      className={`h-8 w-8 flex items-center justify-center rounded-full transition-colors ${user ? 'text-text-tertiary hover:text-accent-blue hover:bg-accent-blue/10' : 'text-text-tertiary/30 cursor-not-allowed'}`}
                      title={user ? "Edit Account" : "Login to Edit"}
                      disabled={!user}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (user) handleDelete(d.id!); }}
                      className={`h-8 w-8 flex items-center justify-center rounded-full transition-colors ${user ? 'text-text-tertiary hover:text-accent-red hover:bg-accent-red/10' : 'text-text-tertiary/30 cursor-not-allowed'}`}
                      title={user ? "Delete Account" : "Login to Delete"}
                      disabled={!user}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>

        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
        />
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Demat Account" : "Add Demat Account"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Account Holder</label>
            <select
              className="w-full px-4 py-2.5 bg-bg-secondary border border-transparent rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue transition-all appearance-none cursor-pointer"
              value={form.holderPersonId}
              onChange={e => setForm({ ...form, holderPersonId: Number(e.target.value) })}
              required
            >
              <option value={0}>-- Select Person --</option>
              {peopleData?.map(p => (
                <option key={p.id} value={p.id}>
                  {p.fullName}{p.isSelf ? ' (Self)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Broker</label>
            <select
              className="w-full px-4 py-2.5 bg-bg-secondary border border-transparent rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue transition-all appearance-none cursor-pointer"
              value={form.brokerName}
              onChange={e => setForm({ ...form, brokerName: e.target.value })}
            >
              {BROKERS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Demat ID / Client ID (Optional)</label>
            <Input
              placeholder="e.g. 120332034..."
              value={form.dematId}
              onChange={e => setForm({ ...form, dematId: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Notes (Optional)</label>
            <Input
              placeholder="Any notes..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={!form.holderPersonId || saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Demat Account'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
