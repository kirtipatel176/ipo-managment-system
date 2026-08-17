import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, User, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { mapPerson, mapApplication, mapAllocation, mapTransaction } from '../../lib/mappers';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { motion } from 'framer-motion';
import { Pagination } from '../../components/ui/Pagination';
import { PersonDetailsModal } from './PersonDetailsModal';
import { useAuth } from '../../contexts/AuthContext';
import { BlurOverlay } from '../../components/ui/BlurOverlay';

export const People: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [newPerson, setNewPerson] = useState({
    fullName: '',
    panNumber: '',
    isSelf: false,
  });

  const openAddModal = () => {
    setEditingId(null);
    setNewPerson({ fullName: '', panNumber: '', isSelf: false });
    setIsModalOpen(true);
  };

  const openEditModal = (person: any) => {
    setEditingId(person.id!);
    setNewPerson({
      fullName: person.fullName,
      panNumber: person.panNumber || '',
      isSelf: person.isSelf || false,
    });
    setIsModalOpen(true);
  };

  const { data: peopleData, isLoading } = useQuery({
    queryKey: ['peopleList'],
    queryFn: async () => {
      const [
        { data: pData },
        { data: appData },
        { data: dData },
        { data: aData },
        { data: tData }
      ] = await Promise.all([
        supabase.from('people').select('*').eq('is_active', true),
        supabase.from('applications').select('*'),
        supabase.from('demat_accounts').select('*').eq('is_active', true),
        supabase.from('allocations').select('*').eq('status', 'ACTIVE'),
        supabase.from('transactions').select('*').eq('status', 'COMPLETED')
      ]);

      const peopleList = (pData || []).map(mapPerson);
      const apps = (appData || []).map(mapApplication);
      const demats = dData || [];
      const allocs = (aData || []).map(mapAllocation);
      const txs = (tData || []).map(mapTransaction);

      return peopleList.map(p => {
        const applicationsCount = apps.filter(a => a.applicantPersonId === p.id).length;
        const dematCount = demats.filter(d => d.holder_person_id === p.id).length;

        const pAllocs = allocs.filter(a => a.currentHolderType === 'PERSON' && a.currentHolderId === p.id);
        const ipoBlocked = pAllocs.filter(a => a.purpose === 'IPO_BLOCKED').reduce((s, a) => s + a.amount, 0);
        const unallocated = pAllocs.filter(a => a.purpose === 'UNALLOCATED').reduce((s, a) => s + a.amount, 0);
        const invested = pAllocs.filter(a => a.purpose === 'INVESTED').reduce((s, a) => s + a.amount, 0);
        const currentlyHeld = ipoBlocked + unallocated + invested;

        const sentTxs = txs.filter(t => t.toPersonId === p.id && !!t.fromBankAccountId);
        const returnTxs = txs.filter(t => t.fromPersonId === p.id && !!t.toBankAccountId);
        const totalSent = sentTxs.reduce((s, t) => s + t.amount, 0);
        const moneyComeBack = returnTxs.reduce((s, t) => s + t.amount, 0);
        
        const pending = currentlyHeld;
        const status = pending === 0 ? 'Settled' : 'Active';

        return {
          ...p,
          applicationsCount,
          dematCount,
          totalSent, moneyComeBack,
          ipoBlocked, unallocated, invested, currentlyHeld,
          pending, status,
        };
      });
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (person: any) => {
      const now = new Date().toISOString();
      if (person.id) {
        await supabase.from('people').update({
          full_name: person.fullName,
          pan_number: person.panNumber,
          is_self: person.isSelf,
          updated_at: now
        }).eq('id', person.id);
      } else {
        await supabase.from('people').insert({
          full_name: person.fullName,
          pan_number: person.panNumber,
          is_self: person.isSelf,
          is_active: true,
          created_at: now,
          updated_at: now
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peopleList'] });
      setIsModalOpen(false);
      setEditingId(null);
      setNewPerson({ fullName: '', panNumber: '', isSelf: false });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await supabase.from('people').update({
        is_active: false,
        updated_at: new Date().toISOString()
      }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peopleList'] });
    }
  });

  const filteredPeople = peopleData?.filter(person => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      person.fullName.toLowerCase().includes(searchLower) ||
      person.panNumber?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const paginatedPeople = filteredPeople.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSavePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPerson.fullName) return;
    saveMutation.mutate({ ...newPerson, id: editingId });
  };

  const handleDeletePerson = (id: number) => {
    if (window.confirm('Are you sure you want to delete this person?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatCurrency = (val: number = 0) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

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
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">Money With People</h1>
          <p className="mt-1 text-text-secondary">Manage friends and their allocated IPO balances.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" icon={<Plus size={16} />} onClick={openAddModal} disabled={!user}>Add Person</Button>
        </div>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-black/5 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-3">
            <Input
              icon={<Search size={16} />}
              placeholder="Search Name, PAN, Demat ID..."
              className="w-full sm:max-w-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button variant="outline" size="sm" icon={<Filter size={14} />} className="w-full sm:w-auto">Filters</Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead className="hidden md:table-cell">PAN / Demat</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Total Sent</TableHead>
              <TableHead className="text-right hidden lg:table-cell">Money Come Back</TableHead>
              <TableHead className="text-right hidden sm:table-cell">IPO Blocked</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPeople.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-text-secondary">
                  No people found.
                </TableCell>
              </TableRow>
            )}
            {paginatedPeople.map((person, i) => (
              <motion.tr
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                key={person.id}
                className="group border-b border-black/5 transition-colors hover:bg-bg-secondary/50 cursor-pointer"
                onClick={() => setSelectedPersonId(person.id!)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-sm font-semibold text-accent-blue">
                      {person.fullName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary flex items-center gap-2">
                        {person.fullName}
                        {person.isSelf && <Badge variant="info" className="text-[10px] py-0">Self</Badge>}
                      </div>
                      <div className="text-xs text-text-tertiary mt-0.5">{person.applicationsCount} application{person.applicationsCount !== 1 ? 's' : ''} · {person.dematCount ?? 0} demat</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <BlurOverlay blurLevel="blur-sm">
                    <div className="font-mono text-xs text-text-primary">{person.panNumber || '—'}</div>
                  </BlurOverlay>
                  <div className="text-xs text-text-tertiary mt-0.5">{(person as any).dematCount ?? 0} demat account{((person as any).dematCount ?? 0) !== 1 ? 's' : ''}</div>
                </TableCell>
                <TableCell className="text-right hidden lg:table-cell">
                  <span className="font-medium text-text-primary">
                    {person.totalSent > 0 ? formatCurrency(person.totalSent) : <span className="text-text-tertiary">—</span>}
                  </span>
                </TableCell>
                <TableCell className="text-right hidden lg:table-cell">
                  <span className="font-medium text-accent-green">
                    {person.moneyComeBack > 0 ? formatCurrency(person.moneyComeBack) : <span className="text-text-tertiary">—</span>}
                  </span>
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell">
                  <span className={`font-medium ${person.ipoBlocked > 0 ? 'text-accent-orange' : 'text-text-tertiary'}`}>
                    {person.ipoBlocked > 0 ? formatCurrency(person.ipoBlocked) : '—'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {person.pending > 0 ? (
                    <span className="font-bold text-accent-red">{formatCurrency(person.pending)}</span>
                  ) : (
                    <span className="text-text-tertiary">₹0</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={person.status === 'Active' ? 'warning' : 'success'}>
                    {person.status === 'Active' ? 'Pending' : 'Settled'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); if (user) openEditModal(person); }}
                      className={`h-8 w-8 flex items-center justify-center rounded-full transition-colors ${user ? 'text-text-tertiary hover:text-accent-blue hover:bg-accent-blue/10' : 'text-text-tertiary/30 cursor-not-allowed'}`}
                      title={user ? "Edit Person" : "Login to Edit"}
                      disabled={!user}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (user) handleDeletePerson(person.id!); }}
                      className={`h-8 w-8 flex items-center justify-center rounded-full transition-colors ${user ? 'text-text-tertiary hover:text-accent-red hover:bg-accent-red/10' : 'text-text-tertiary/30 cursor-not-allowed'}`}
                      title={user ? "Delete Person" : "Login to Delete"}
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
          totalItems={filteredPeople.length}
          onPageChange={setCurrentPage}
        />
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Person" : "Add Person"}>
        <form onSubmit={handleSavePerson} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">Full Name</label>
            <Input
              icon={<User size={16} />}
              value={newPerson.fullName}
              onChange={e => setNewPerson({ ...newPerson, fullName: e.target.value })}
              required
              placeholder="e.g. Ashish Patel"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-primary">PAN Card (Optional)</label>
            <Input
              value={newPerson.panNumber}
              onChange={e => setNewPerson({ ...newPerson, panNumber: e.target.value })}
              style={{ textTransform: 'uppercase' }}
              placeholder="ABCDE1234F"
            />
          </div>
          <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-xl">
            <input
              type="checkbox"
              id="isSelf"
              checked={newPerson.isSelf}
              onChange={e => setNewPerson({ ...newPerson, isSelf: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isSelf" className="text-sm text-text-primary cursor-pointer">
              This is me (Self) — own money, own Demat applications
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 mt-6">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Person'}
            </Button>
          </div>
        </form>
      </Modal>

      <PersonDetailsModal
        isOpen={selectedPersonId !== null}
        onClose={() => setSelectedPersonId(null)}
        personId={selectedPersonId}
      />
    </div>
  );
};
