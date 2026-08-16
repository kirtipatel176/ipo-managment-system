import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, BookOpen, CreditCard, Edit2, Trash2 } from 'lucide-react';
import { db } from '../../db/schema';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { motion } from 'framer-motion';
import { Pagination } from '../../components/ui/Pagination';

const BROKERS = ['Zerodha', 'Groww', 'Angel One', 'Upstox', 'ICICI Direct', 'HDFC Securities', 'Kotak Securities', 'SBI Securities', 'Motilal Oswal', 'Other'];

const BROKER_COLORS: Record<string, string> = {
  'Zerodha': 'bg-[#387ED1]/10 text-[#387ED1]',
  'Groww': 'bg-[#00D09C]/10 text-[#00A37E]',
  'Angel One': 'bg-[#E8141A]/10 text-[#E8141A]',
  'Upstox': 'bg-[#7B2FF7]/10 text-[#7B2FF7]',
  'ICICI Direct': 'bg-[#F7841B]/10 text-[#D47318]',
};

export const DematAccounts: React.FC = () => {
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

  const people = useLiveQuery(() => db.people.filter(p => p.isActive).toArray(), []);

  const dematData = useLiveQuery(async () => {
    const demats = await db.dematAccounts.filter(d => d.isActive).toArray();
    return Promise.all(demats.map(async d => {
      const person = await db.people.get(d.holderPersonId);
      const apps = await db.applications.where('dematAccountId').equals(d.id!).toArray();
      const holdings = await db.holdings.where('dematAccountId').equals(d.id!).toArray();

      const appliedCount = apps.length;
      const allottedCount = apps.filter(a => a.allotmentStatus === 'FULL' || a.allotmentStatus === 'PARTIAL').length;
      const activeHoldings = holdings.length;
      const totalInvested = holdings.reduce((s, h) => s + h.shares * h.averageCost, 0);
      const currentValue = holdings.reduce((s, h) => s + h.currentValue, 0);
      const unrealizedPnL = holdings.reduce((s, h) => s + h.unrealizedProfit, 0);

      return { ...d, person, appliedCount, allottedCount, activeHoldings, totalInvested, currentValue, unrealizedPnL };
    }));
  }, []);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.holderPersonId || !form.brokerName) return;

    if (editingId) {
      await db.dematAccounts.update(editingId, {
        holderPersonId: form.holderPersonId,
        brokerName: form.brokerName,
        dematId: form.dematId || undefined,
        notes: form.notes || undefined,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await db.dematAccounts.add({
        holderPersonId: form.holderPersonId,
        brokerName: form.brokerName,
        dematId: form.dematId || undefined,
        notes: form.notes || undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setIsModalOpen(false);
    setEditingId(null);
    setForm({ holderPersonId: 0, brokerName: 'Zerodha', dematId: '', notes: '' });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this Demat account?')) {
      await db.dematAccounts.update(id, {
        isActive: false,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const getBrokerClass = (broker: string) =>
    BROKER_COLORS[broker] ?? 'bg-accent-blue/10 text-accent-blue';

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Demat Accounts</h1>
          <p className="mt-1 text-text-secondary">
            Manage all Demat accounts. Each IPO application links to exactly one Demat account.
          </p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openAddModal}>
          Add Demat Account
        </Button>
      </div>

      {/* Summary cards */}
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
              <div className={`text-xl font-bold text-accent-${c.color}`}>{c.value}</div>
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
                  <span className="font-mono text-xs text-text-primary">{d.dematId ?? '—'}</span>
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
                  <span className="text-sm font-medium text-text-primary">
                    {d.totalInvested > 0 ? fmt(d.totalInvested) : <span className="text-text-tertiary">—</span>}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium text-text-primary">
                    {d.currentValue > 0 ? fmt(d.currentValue) : <span className="text-text-tertiary">—</span>}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {d.unrealizedPnL !== 0 ? (
                    <span className={`text-sm font-semibold ${d.unrealizedPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                      {d.unrealizedPnL >= 0 ? '+' : ''}{fmt(d.unrealizedPnL)}
                    </span>
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditModal(d); }}
                      className="text-text-tertiary hover:text-accent-blue transition-colors h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent-blue/10"
                      title="Edit Account"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(d.id!); }}
                      className="text-text-tertiary hover:text-accent-red transition-colors h-8 w-8 flex items-center justify-center rounded-full hover:bg-accent-red/10"
                      title="Delete Account"
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
              {people?.map(p => (
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
            <Button type="submit" variant="primary" disabled={!form.holderPersonId}>
              Save Demat Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
