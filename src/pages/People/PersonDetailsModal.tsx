import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
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

  const data = useLiveQuery(async () => {
    if (!personId) return null;
    
    const person = await db.people.get(personId);
    
    // Applications
    const apps = await db.applications.where('applicantPersonId').equals(personId).toArray();
    const populatedApps = await Promise.all(apps.map(async app => {
      const ipo = await db.ipos.get(app.ipoId);
      return { ...app, ipo };
    }));
    populatedApps.reverse();

    // Transactions
    const txs = await db.transactions
      .filter(t => t.fromPersonId === personId || t.toPersonId === personId)
      .toArray();
      
    const populatedTxs = await Promise.all(txs.map(async tx => {
      let ipoName = '-';
      if (tx.ipoId) {
        const ipo = await db.ipos.get(tx.ipoId);
        if (ipo) ipoName = ipo.ipoName;
      }
      return { ...tx, ipoName };
    }));
    populatedTxs.reverse();

    return { person, applications: populatedApps, transactions: populatedTxs };
  }, [personId]);

  if (!isOpen || !personId) return null;
  if (!data) return (
    <Modal isOpen={isOpen} onClose={onClose} title="Loading..." className="max-w-4xl">
      <div className="p-8 text-center text-text-secondary">Loading details...</div>
    </Modal>
  );

  const { person, applications, transactions } = data;
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${person?.fullName} - Details`} className="max-w-4xl">
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
