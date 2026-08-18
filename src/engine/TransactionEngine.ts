import { supabase } from '../lib/supabase';
import type { Database } from '../db/supabaseTypes';

type AllocationPurpose = Database['public']['Enums']['allocation_purpose'];

export interface BankBalanceOverview {
  accountId: number;
  bankName: string;
  accountName: string;
  openingBalance: number;
  totalReceived: number;
  totalSent: number;
  grossBalance: number;
  ipoBlocked: number;
  availableBalance: number;
}

export interface PersonBalanceOverview {
  personId: number;
  fullName: string;
  totalReceived: number;
  totalReturned: number;
  ipoBlocked: number;
  unallocated: number;
  invested: number;
  currentlyHeld: number;
}

export interface RefundAction {
  action: 'RETURN_TO_BANK' | 'RETAIN_WITH_FRIEND' | 'REUSE_FOR_IPO';
  amount: number;
  targetBankAccountId?: number;
  targetIpoId?: number;
  utr?: string;
}

export class TransactionEngine {

  static async getBankBalance(accountId: number): Promise<BankBalanceOverview> {
    const { data: account, error: accErr } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accErr || !account) throw new Error('Bank account not found');

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'COMPLETED')
      .or(`from_bank_account_id.eq.${accountId},to_bank_account_id.eq.${accountId}`);

    let totalSent = 0;
    let totalReceived = 0;
    for (const tx of transactions || []) {
      if (tx.from_bank_account_id === accountId) totalSent += tx.amount;
      if (tx.to_bank_account_id === accountId) totalReceived += tx.amount;
    }

    const grossBalance = account.opening_balance + totalReceived - totalSent;

    const { data: blockedAllocs } = await supabase
      .from('allocations')
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('purpose', 'IPO_BLOCKED')
      .eq('origin_bank_account_id', accountId);

    const ipoBlocked = (blockedAllocs || []).reduce((s, a) => s + a.amount, 0);

    return {
      accountId,
      bankName: account.bank_name,
      accountName: account.account_name,
      openingBalance: account.opening_balance,
      totalReceived,
      totalSent,
      grossBalance,
      ipoBlocked,
      availableBalance: grossBalance - ipoBlocked,
    };
  }

  static async getBankAvailableBalance(accountId: number): Promise<number> {
    const overview = await TransactionEngine.getBankBalance(accountId);
    return overview.availableBalance;
  }

  static async getPersonBalance(personId: number): Promise<PersonBalanceOverview> {
    const { data: person, error: perErr } = await supabase
      .from('people')
      .select('*')
      .eq('id', personId)
      .single();

    if (perErr || !person) throw new Error('Person not found');

    const { data: allocations } = await supabase
      .from('allocations')
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('current_holder_type', 'PERSON')
      .eq('current_holder_id', personId);

    let ipoBlocked = 0;
    let unallocated = 0;
    let invested = 0;
    for (const a of allocations || []) {
      if (a.purpose === 'IPO_BLOCKED') ipoBlocked += a.amount;
      else if (a.purpose === 'UNALLOCATED') unallocated += a.amount;
      else if (a.purpose === 'INVESTED') invested += a.amount;
    }

    const { data: sentTxs } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'COMPLETED')
      .eq('to_person_id', personId)
      .not('from_bank_account_id', 'is', null);

    const totalReceived = (sentTxs || []).reduce((s, t) => s + t.amount, 0);

    const { data: returnTxs } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'COMPLETED')
      .eq('from_person_id', personId)
      .not('to_bank_account_id', 'is', null);

    const totalReturned = (returnTxs || []).reduce((s, t) => s + t.amount, 0);

    return {
      personId,
      fullName: person.full_name,
      totalReceived,
      totalReturned,
      ipoBlocked,
      unallocated,
      invested,
      currentlyHeld: ipoBlocked + unallocated + invested,
    };
  }

  static async sendMoneyToPerson(
    amount: number,
    bankAccountId: number,
    personId: number,
    date: string,
    utr?: string,
    notes?: string
  ): Promise<number> {
    if (utr) {
      const { data: existing } = await supabase.from('transactions').select('id').eq('utr', utr).single();
      if (existing) throw new Error(`Duplicate UTR: ${utr}`);
    }

    const now = new Date().toISOString();

    const { data: tx, error: txErr } = await supabase.from('transactions').insert({
      transaction_type: 'MONEY_SENT',
      amount,
      date,
      from_bank_account_id: bankAccountId,
      to_person_id: personId,
      utr,
      notes,
      status: 'COMPLETED',
      created_at: now,
      updated_at: now,
    }).select('id').single();

    if (txErr || !tx) throw new Error(`Transaction failed: ${txErr?.message}`);

    const allocationId = `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const { error: allocErr } = await supabase.from('allocations').insert({
      allocation_id: allocationId,
      amount,
      owner_id: 'SELF',
      current_holder_type: 'PERSON',
      current_holder_id: personId,
      purpose: 'UNALLOCATED',
      origin_bank_account_id: bankAccountId,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    });
    if (allocErr) throw new Error(`Allocation failed: ${allocErr.message}`);

    await supabase.from('journey_events').insert({
      allocation_id: allocationId,
      date,
      event_type: 'SENT_TO_FRIEND',
      description: `₹${amount} sent from bank to person`,
      transaction_id: tx.id,
      created_at: now,
    });

    return tx.id;
  }

  static async selfTransfer(
    fromBankAccountId: number,
    toBankAccountId: number,
    amount: number,
    date: string,
    utr?: string,
    notes?: string
  ): Promise<number> {
    if (fromBankAccountId === toBankAccountId) {
      throw new Error('Cannot self-transfer to the same account.');
    }

    if (utr) {
      const { data: existing } = await supabase.from('transactions').select('id').eq('utr', utr).single();
      if (existing) throw new Error(`Duplicate UTR: ${utr}`);
    }

    const available = await TransactionEngine.getBankAvailableBalance(fromBankAccountId);
    if (available < amount) {
      throw new Error(`Insufficient available balance. Available: ₹${available}, Required: ₹${amount}`);
    }

    const now = new Date().toISOString();
    const { data: tx, error } = await supabase.from('transactions').insert({
      transaction_type: 'SELF_TRANSFER',
      amount,
      date,
      from_bank_account_id: fromBankAccountId,
      to_bank_account_id: toBankAccountId,
      utr,
      notes,
      status: 'COMPLETED',
      created_at: now,
      updated_at: now,
    }).select('id').single();

    if (error || !tx) throw new Error(`Transfer failed: ${error?.message}`);

    return tx.id;
  }

  static async applyForIPO(params: {
    ipoId: number;
    applicantPersonId: number;
    dematAccountId: number;
    fundingBankAccountId: number;
    applicationType: 'FRIEND_DEMAT' | 'OWN_DEMAT';
    fundingMethod: 'NEW_MONEY' | 'EXISTING_BALANCE' | 'MIXED' | 'OWN_BANK_BLOCK';
    appliedLots: number;
    newMoneyAmount?: number;
    existingBalanceAmount?: number;
    date: string;
    notes?: string;
  }): Promise<number> {
    const { data: ipo } = await supabase.from('ipos').select('*').eq('id', params.ipoId).single();
    if (!ipo) throw new Error('IPO not found');

    const { data: demat } = await supabase.from('demat_accounts').select('*').eq('id', params.dematAccountId).single();
    if (!demat) throw new Error('Demat account not found');

    const ipoPrice = ipo.price_per_share;
    const lotSize = ipo.lot_size;
    const blockedAmount = params.appliedLots * lotSize * ipoPrice;
    const newMoney = params.newMoneyAmount ?? 0;
    const existingMoney = params.existingBalanceAmount ?? 0;
    const now = new Date().toISOString();

    const totalFunding = newMoney + existingMoney;
    if (params.applicationType === 'FRIEND_DEMAT') {
      if (Math.abs(totalFunding - blockedAmount) > 0.01) {
        throw new Error(`Funding mismatch: required ₹${blockedAmount}, got ₹${totalFunding}`);
      }
    }

    const { data: app, error: appErr } = await supabase.from('applications').insert({
      ipo_id: params.ipoId,
      application_type: params.applicationType,
      applicant_person_id: params.applicantPersonId,
      demat_account_id: params.dematAccountId,
      funding_bank_account_id: params.fundingBankAccountId,
      funding_method: params.fundingMethod,
      new_money_amount: newMoney,
      existing_balance_amount: existingMoney,
      applied_lots: params.appliedLots,
      allotted_lots: 0,
      ipo_price: ipoPrice,
      lot_size_snapshot: lotSize,
      blocked_amount: blockedAmount,
      investment_amount: 0,
      refund_amount: 0,
      application_status: 'APPLIED',
      money_status: 'BLOCKED',
      allotment_status: 'PENDING',
      listing_status: 'NOT_LISTED',
      notes: params.notes,
      created_at: now,
      updated_at: now,
    }).select('id').single();

    if (appErr || !app) throw new Error(`Failed to create application: ${appErr?.message}`);
    const appId = app.id;

    if (params.applicationType === 'OWN_DEMAT' || params.fundingMethod === 'OWN_BANK_BLOCK') {
      const available = await TransactionEngine.getBankAvailableBalance(params.fundingBankAccountId);
      if (available < blockedAmount) {
        await supabase.from('applications').delete().eq('id', appId);
        throw new Error(`Insufficient bank balance. Available: ₹${available}, Required: ₹${blockedAmount}`);
      }

      const allocationId = `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await supabase.from('allocations').insert({
        allocation_id: allocationId,
        amount: blockedAmount,
        owner_id: 'SELF',
        current_holder_type: 'BANK',
        current_holder_id: params.fundingBankAccountId,
        purpose: 'IPO_BLOCKED',
        ipo_id: params.ipoId,
        application_id: appId,
        origin_bank_account_id: params.fundingBankAccountId,
        status: 'ACTIVE',
        created_at: now,
        updated_at: now,
      });

      await supabase.from('journey_events').insert({
        allocation_id: allocationId,
        date: params.date,
        event_type: 'IPO_BLOCKED',
        description: `₹${blockedAmount} blocked for ${ipo.symbol} (Own Demat)`,
        application_id: appId,
        created_at: now,
      });

    } else {
      if (newMoney > 0) {
        const available = await TransactionEngine.getBankAvailableBalance(params.fundingBankAccountId);
        if (available < newMoney) {
          await supabase.from('applications').delete().eq('id', appId);
          throw new Error(`Insufficient bank balance. Available: ₹${available}, Required: ₹${newMoney}`);
        }

        const { data: tx } = await supabase.from('transactions').insert({
          transaction_type: 'MONEY_SENT',
          amount: newMoney,
          date: params.date,
          from_bank_account_id: params.fundingBankAccountId,
          to_person_id: params.applicantPersonId,
          ipo_id: params.ipoId,
          application_id: appId,
          status: 'COMPLETED',
          created_at: now,
          updated_at: now,
        }).select('id').single();

        const allocationId = `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await supabase.from('allocations').insert({
          allocation_id: allocationId,
          amount: newMoney,
          owner_id: 'SELF',
          current_holder_type: 'PERSON',
          current_holder_id: params.applicantPersonId,
          purpose: 'IPO_BLOCKED',
          ipo_id: params.ipoId,
          application_id: appId,
          origin_bank_account_id: params.fundingBankAccountId,
          status: 'ACTIVE',
          created_at: now,
          updated_at: now,
        });

        if (tx) {
          await supabase.from('journey_events').insert({
            allocation_id: allocationId,
            date: params.date,
            event_type: 'IPO_FUNDED_NEW',
            description: `₹${newMoney} sent from bank → friend for ${ipo.symbol}`,
            transaction_id: tx.id,
            application_id: appId,
            created_at: now,
          });
        }
      }

      if (existingMoney > 0) {
        const { data: unallocatedAllocs } = await supabase
          .from('allocations')
          .select('*')
          .eq('status', 'ACTIVE')
          .eq('current_holder_type', 'PERSON')
          .eq('current_holder_id', params.applicantPersonId)
          .eq('purpose', 'UNALLOCATED')
          .order('created_at', { ascending: true });

        let remaining = existingMoney;
        for (const alloc of unallocatedAllocs || []) {
          if (remaining <= 0) break;
          if (alloc.amount <= remaining) {
            remaining -= alloc.amount;
            await supabase.from('allocations').update({
              purpose: 'IPO_BLOCKED',
              ipo_id: params.ipoId,
              application_id: appId,
              updated_at: now,
            }).eq('id', alloc.id);
            
            await supabase.from('journey_events').insert({
              allocation_id: alloc.allocation_id,
              date: params.date,
              event_type: 'IPO_REUSED_BALANCE',
              description: `₹${alloc.amount} reused from existing balance for ${ipo.symbol}`,
              application_id: appId,
              created_at: now,
            });
          } else {
            await supabase.from('allocations').update({
              amount: alloc.amount - remaining,
              updated_at: now,
            }).eq('id', alloc.id);

            const newAllocId = `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await supabase.from('allocations').insert({
              allocation_id: newAllocId,
              amount: remaining,
              owner_id: 'SELF',
              current_holder_type: 'PERSON',
              current_holder_id: params.applicantPersonId,
              purpose: 'IPO_BLOCKED',
              ipo_id: params.ipoId,
              application_id: appId,
              origin_bank_account_id: alloc.origin_bank_account_id,
              status: 'ACTIVE',
              created_at: now,
              updated_at: now,
            });

            await supabase.from('journey_events').insert({
              allocation_id: newAllocId,
              date: params.date,
              event_type: 'IPO_REUSED_BALANCE',
              description: `₹${remaining} reused (split) from existing balance for ${ipo.symbol}`,
              application_id: appId,
              created_at: now,
            });
            remaining = 0;
          }
        }
        if (remaining > 0) {
          throw new Error(`Insufficient unallocated balance with person. Shortfall: ₹${remaining}`);
        }
      }
    }

    return appId;
  }

  static async processAllotment(
    applicationId: number,
    allottedLots: number,
    refundActions?: RefundAction[],
    allotmentDate?: string
  ): Promise<void> {
    const { data: app } = await supabase.from('applications').select('*').eq('id', applicationId).single();
    if (!app) throw new Error('Application not found');
    if (app.allotment_status !== 'PENDING') throw new Error('Allotment already processed.');

    const { data: ipo } = await supabase.from('ipos').select('*').eq('id', app.ipo_id).single();
    if (!ipo) throw new Error('IPO not found');
    if (allottedLots > app.applied_lots) throw new Error('Allotted lots cannot exceed applied lots.');

    const now = new Date().toISOString();
    const date = allotmentDate ?? now.split('T')[0];

    const investmentAmount = allottedLots * app.lot_size_snapshot * app.ipo_price;
    const refundAmount = app.blocked_amount - investmentAmount;
    const allotmentStatus = allottedLots === 0 ? 'NIL' : allottedLots === app.applied_lots ? 'FULL' : 'PARTIAL';
    const moneyStatus = allottedLots === 0 ? 'RELEASED' : (refundAmount > 0 ? 'PARTIAL' : 'INVESTED');
    const listingStatus = allottedLots > 0 ? 'LISTING_PENDING' : 'NOT_LISTED';

    await supabase.from('applications').update({
      allotted_lots: allottedLots,
      investment_amount: investmentAmount,
      refund_amount: refundAmount,
      allotment_status: allotmentStatus,
      money_status: moneyStatus,
      listing_status: listingStatus,
      updated_at: now,
    }).eq('id', applicationId);

    if (allottedLots > 0) {
      await supabase.from('holdings').insert({
        ipo_id: app.ipo_id,
        person_id: app.applicant_person_id,
        demat_account_id: app.demat_account_id,
        application_id: applicationId,
        shares: allottedLots * app.lot_size_snapshot,
        average_cost: app.ipo_price,
        current_price: ipo.current_market_price ?? app.ipo_price,
        current_value: allottedLots * app.lot_size_snapshot * (ipo.current_market_price ?? app.ipo_price),
        unrealized_profit: allottedLots * app.lot_size_snapshot * ((ipo.current_market_price ?? app.ipo_price) - app.ipo_price),
        unrealized_roi: ipo.current_market_price
          ? ((ipo.current_market_price - app.ipo_price) / app.ipo_price) * 100
          : 0,
        created_at: now,
        updated_at: now,
      });
    }

    const { data: blockedAllocs } = await supabase
      .from('allocations')
      .select('*')
      .eq('application_id', applicationId)
      .eq('purpose', 'IPO_BLOCKED')
      .eq('status', 'ACTIVE');

    if (app.application_type === 'OWN_DEMAT') {
      let investRemaining = investmentAmount;
      let releaseRemaining = refundAmount;

      for (const alloc of blockedAllocs || []) {
        let allocAmt = alloc.amount;

        if (investRemaining > 0) {
          const investPart = Math.min(allocAmt, investRemaining);
          if (investPart === allocAmt) {
            await supabase.from('allocations').update({ purpose: 'INVESTED', updated_at: now }).eq('id', alloc.id);
          } else {
            await supabase.from('allocations').update({ amount: investPart, purpose: 'INVESTED', updated_at: now }).eq('id', alloc.id);
            await supabase.from('allocations').insert({
              allocation_id: `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              amount: allocAmt - investPart,
              owner_id: alloc.owner_id,
              current_holder_type: alloc.current_holder_type,
              current_holder_id: alloc.current_holder_id,
              purpose: 'RELEASED',
              ipo_id: alloc.ipo_id,
              application_id: alloc.application_id,
              origin_bank_account_id: alloc.origin_bank_account_id,
              status: 'RESOLVED',
              created_at: now,
              updated_at: now,
            });
            await supabase.from('journey_events').insert({
              allocation_id: alloc.allocation_id, date,
              event_type: 'BLOCK_RELEASED',
              description: `₹${allocAmt - investPart} released back to bank (partial allotment - own demat)`,
              application_id: applicationId,
              created_at: now,
            });
          }
          await supabase.from('journey_events').insert({
            allocation_id: alloc.allocation_id, date,
            event_type: 'INVESTED',
            description: `₹${investPart} converted to investment in ${ipo.symbol}`,
            application_id: applicationId,
            created_at: now,
          });
          investRemaining -= investPart;
          allocAmt -= investPart;
        }

        if (allocAmt > 0 && releaseRemaining > 0) {
          await supabase.from('allocations').update({ purpose: 'RELEASED', status: 'RESOLVED', updated_at: now }).eq('id', alloc.id);
          await supabase.from('journey_events').insert({
            allocation_id: alloc.allocation_id, date,
            event_type: 'BLOCK_RELEASED',
            description: `₹${allocAmt} released back to bank (not allotted - own demat)`,
            application_id: applicationId,
            created_at: now,
          });
          releaseRemaining -= allocAmt;
        }
      }

    } else {
      let investRemaining = investmentAmount;
      for (const alloc of blockedAllocs || []) {
        if (investRemaining <= 0) break;
        const investPart = Math.min(alloc.amount, investRemaining);
        if (investPart === alloc.amount) {
          await supabase.from('allocations').update({ purpose: 'INVESTED', updated_at: now }).eq('id', alloc.id);
        } else {
          await supabase.from('allocations').update({ amount: investPart, purpose: 'INVESTED', updated_at: now }).eq('id', alloc.id);
          await supabase.from('allocations').insert({
            allocation_id: `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            amount: alloc.amount - investPart,
            owner_id: alloc.owner_id,
            current_holder_type: alloc.current_holder_type,
            current_holder_id: alloc.current_holder_id,
            purpose: 'IPO_BLOCKED',
            ipo_id: alloc.ipo_id,
            application_id: alloc.application_id,
            origin_bank_account_id: alloc.origin_bank_account_id,
            status: 'ACTIVE',
            created_at: now,
            updated_at: now,
          });
        }
        await supabase.from('journey_events').insert({
          allocation_id: alloc.allocation_id, date,
          event_type: 'INVESTED',
          description: `₹${investPart} converted to investment in ${ipo.symbol} (friend demat)`,
          application_id: applicationId,
          created_at: now,
        });
        investRemaining -= investPart;
      }

      if (refundAmount > 0 && refundActions && refundActions.length > 0) {
        const totalRefundActions = refundActions.reduce((s, a) => s + a.amount, 0);
        if (Math.abs(totalRefundActions - refundAmount) > 0.01) {
          throw new Error(`Refund action amounts (₹${totalRefundActions}) must equal refund amount (₹${refundAmount})`);
        }

        const { data: refundAllocs } = await supabase
          .from('allocations')
          .select('*')
          .eq('application_id', applicationId)
          .eq('purpose', 'IPO_BLOCKED')
          .eq('status', 'ACTIVE');

        for (const action of refundActions) {
          let actionRemaining = action.amount;

          for (const alloc of refundAllocs || []) {
            if (actionRemaining <= 0) break;
            
            const { data: currAlloc } = await supabase.from('allocations').select('*').eq('id', alloc.id).single();
            if (!currAlloc || currAlloc.status !== 'ACTIVE') continue;

            const chunk = Math.min(currAlloc.amount, actionRemaining);

            if (action.action === 'RETURN_TO_BANK') {
              const { data: tx } = await supabase.from('transactions').insert({
                transaction_type: 'IPO_REFUND',
                amount: chunk,
                date,
                from_person_id: app.applicant_person_id,
                to_bank_account_id: action.targetBankAccountId,
                ipo_id: app.ipo_id,
                application_id: applicationId,
                utr: action.utr,
                status: 'COMPLETED',
                created_at: now,
                updated_at: now,
              }).select('id').single();

              if (chunk === currAlloc.amount) {
                await supabase.from('allocations').update({ purpose: 'RELEASED', status: 'RESOLVED', updated_at: now }).eq('id', currAlloc.id);
              } else {
                await supabase.from('allocations').update({ amount: currAlloc.amount - chunk, updated_at: now }).eq('id', currAlloc.id);
                await supabase.from('allocations').insert({
                  allocation_id: `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  amount: chunk,
                  owner_id: currAlloc.owner_id,
                  current_holder_type: currAlloc.current_holder_type,
                  current_holder_id: currAlloc.current_holder_id,
                  purpose: 'RELEASED',
                  origin_bank_account_id: currAlloc.origin_bank_account_id,
                  status: 'RESOLVED',
                  created_at: now,
                  updated_at: now,
                });
              }
              if (tx) {
                await supabase.from('journey_events').insert({
                  allocation_id: currAlloc.allocation_id, date,
                  event_type: 'REFUND_RETURNED_TO_BANK',
                  description: `₹${chunk} refund returned to bank`,
                  transaction_id: tx.id,
                  application_id: applicationId,
                  created_at: now,
                });
              }

            } else if (action.action === 'RETAIN_WITH_FRIEND') {
              if (chunk === currAlloc.amount) {
                await supabase.from('allocations').update({
                  purpose: 'UNALLOCATED',
                  ipo_id: null,
                  application_id: null,
                  updated_at: now,
                }).eq('id', currAlloc.id);
              } else {
                await supabase.from('allocations').update({ amount: currAlloc.amount - chunk, updated_at: now }).eq('id', currAlloc.id);
                await supabase.from('allocations').insert({
                  allocation_id: `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  amount: chunk,
                  owner_id: currAlloc.owner_id,
                  current_holder_type: currAlloc.current_holder_type,
                  current_holder_id: currAlloc.current_holder_id,
                  purpose: 'UNALLOCATED',
                  origin_bank_account_id: currAlloc.origin_bank_account_id,
                  status: 'ACTIVE',
                  created_at: now,
                  updated_at: now,
                });
              }
              await supabase.from('journey_events').insert({
                allocation_id: currAlloc.allocation_id, date,
                event_type: 'REFUND_RETAINED',
                description: `₹${chunk} refund retained with friend (available for next IPO)`,
                application_id: applicationId,
                created_at: now,
              });

            } else if (action.action === 'REUSE_FOR_IPO') {
              if (chunk === currAlloc.amount) {
                await supabase.from('allocations').update({
                  ipo_id: action.targetIpoId,
                  application_id: null,
                  updated_at: now,
                }).eq('id', currAlloc.id);
              } else {
                await supabase.from('allocations').update({ amount: currAlloc.amount - chunk, updated_at: now }).eq('id', currAlloc.id);
                await supabase.from('allocations').insert({
                  allocation_id: `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                  amount: chunk,
                  owner_id: currAlloc.owner_id,
                  current_holder_type: currAlloc.current_holder_type,
                  current_holder_id: currAlloc.current_holder_id,
                  purpose: 'IPO_BLOCKED',
                  ipo_id: action.targetIpoId,
                  origin_bank_account_id: currAlloc.origin_bank_account_id,
                  status: 'ACTIVE',
                  created_at: now,
                  updated_at: now,
                });
              }
              await supabase.from('journey_events').insert({
                allocation_id: currAlloc.allocation_id, date,
                event_type: 'REFUND_REUSED',
                description: `₹${chunk} refund reused for next IPO (internal allocation)`,
                application_id: applicationId,
                created_at: now,
              });
            }

            actionRemaining -= chunk;
          }
        }
      }
    }
  }

  static async receiveMoneyFromPerson(
    amount: number,
    personId: number,
    bankAccountId: number,
    date: string,
    utr?: string,
    notes?: string
  ): Promise<number> {
    if (utr) {
      const { data: existing } = await supabase.from('transactions').select('id').eq('utr', utr).single();
      if (existing) throw new Error(`Duplicate UTR: ${utr}`);
    }

    const now = new Date().toISOString();

    const { data: unallocated } = await supabase
      .from('allocations')
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('current_holder_type', 'PERSON')
      .eq('current_holder_id', personId)
      .eq('purpose', 'UNALLOCATED')
      .order('created_at', { ascending: true });

    let amountToReturn = amount;
    for (const alloc of unallocated || []) {
      if (amountToReturn <= 0) break;
      if (alloc.amount <= amountToReturn) {
        amountToReturn -= alloc.amount;
        await supabase.from('allocations').update({ status: 'RESOLVED', purpose: 'RELEASED', updated_at: now }).eq('id', alloc.id);
        await supabase.from('journey_events').insert({
          allocation_id: alloc.allocation_id, date,
          event_type: 'RETURNED_TO_BANK',
          description: `₹${alloc.amount} returned to bank`,
          created_at: now,
        });
      } else {
        await supabase.from('allocations').update({ amount: alloc.amount - amountToReturn, updated_at: now }).eq('id', alloc.id);
        await supabase.from('journey_events').insert({
          allocation_id: alloc.allocation_id, date,
          event_type: 'RETURNED_TO_BANK',
          description: `₹${amountToReturn} partially returned to bank`,
          created_at: now,
        });
        amountToReturn = 0;
      }
    }

    if (amountToReturn > 0) {
      const available = amount - amountToReturn;
      throw new Error(`Insufficient unallocated funds for this specific person profile. You tried to return ₹${amount}, but this profile only has ₹${available} unallocated. (Note: If you have duplicate people with the same name, you may have selected the wrong one.)`);
    }

    const { data: tx } = await supabase.from('transactions').insert({
      transaction_type: 'MONEY_RECEIVED',
      amount, date,
      from_person_id: personId,
      to_bank_account_id: bankAccountId,
      utr, notes,
      status: 'COMPLETED',
      created_at: now, updated_at: now,
    }).select('id').single();

    return tx!.id;
  }

  static async sellHolding(
    holdingId: number,
    sharesToSell: number,
    sellPrice: number,
    charges: number,
    bankAccountId: number,
    date: string,
    utr?: string,
    profitOptions?: {
      mode: 'ALL_MINE' | 'ALL_FRIENDS' | 'SPLIT';
      splitRatio?: number;
      proceedsDestination: 'FRIEND_BALANCE' | 'BANK_ACCOUNT';
      targetBankAccountId?: number;
    }
  ): Promise<void> {
    const { data: holding } = await supabase.from('holdings').select('*').eq('id', holdingId).single();
    if (!holding) throw new Error('Holding not found');
    if (sharesToSell > holding.shares) throw new Error('Cannot sell more shares than held.');

    const costOfSold = sharesToSell * holding.average_cost;
    const grossSale = sharesToSell * sellPrice;
    const netSale = grossSale - charges;
    const realizedPnL = netSale - costOfSold;
    const now = new Date().toISOString();

    let ourProfit = realizedPnL;
    let friendProfit = 0;

    const { data: person } = await supabase.from('people').select('*').eq('id', holding.person_id).single();
    if (!person) throw new Error('Person not found');
    
    const isSelf = person.is_self;
    if (isSelf && !bankAccountId) throw new Error('Bank account is required for own holdings.');

    if (!isSelf && profitOptions) {
      if (profitOptions.mode === 'ALL_FRIENDS') {
        ourProfit = 0;
        friendProfit = realizedPnL;
      } else if (profitOptions.mode === 'SPLIT' && profitOptions.splitRatio !== undefined) {
        ourProfit = realizedPnL * (profitOptions.splitRatio / 100);
        friendProfit = realizedPnL - ourProfit;
      }
    }

    await supabase.from('sales').insert({
      holding_id: holdingId,
      ipo_id: holding.ipo_id,
      person_id: holding.person_id,
      shares_sold: sharesToSell,
      sell_price: sellPrice,
      charges,
      realized_pnl: realizedPnL,
      our_profit_share: ourProfit,
      friend_profit_share: friendProfit,
      date,
      returned_to_bank_account_id: isSelf ? bankAccountId : profitOptions?.targetBankAccountId,
      utr,
      created_at: now,
      updated_at: now,
    });

    if (sharesToSell === holding.shares) {
      await supabase.from('holdings').delete().eq('id', holdingId);
    } else {
      const newShares = holding.shares - sharesToSell;
      await supabase.from('holdings').update({
        shares: newShares,
        current_value: newShares * holding.current_price,
        unrealized_profit: newShares * (holding.current_price - holding.average_cost),
        updated_at: now,
      }).eq('id', holdingId);
    }

    let txId: number | undefined;

    if (isSelf) {
      const { data: tx } = await supabase.from('transactions').insert({
        transaction_type: 'IPO_SELL',
        amount: netSale,
        date,
        to_bank_account_id: bankAccountId,
        ipo_id: holding.ipo_id,
        utr,
        notes: `Sold ${sharesToSell} shares. Realized P&L: ₹${realizedPnL}`,
        status: 'COMPLETED',
        created_at: now, updated_at: now,
      }).select('id').single();
      txId = tx?.id;
    } else {
      const amountOwedToUs = costOfSold + ourProfit;
      
      if (profitOptions?.proceedsDestination === 'BANK_ACCOUNT' && profitOptions.targetBankAccountId) {
        const { data: tx } = await supabase.from('transactions').insert({
          transaction_type: 'MONEY_RECEIVED',
          amount: amountOwedToUs,
          date,
          from_person_id: person.id,
          to_bank_account_id: profitOptions.targetBankAccountId,
          ipo_id: holding.ipo_id,
          utr,
          notes: `Sale proceeds & our profit share. Total Sale: ₹${netSale}. Our share: ₹${amountOwedToUs}`,
          status: 'COMPLETED',
          created_at: now, updated_at: now,
        }).select('id').single();
        txId = tx?.id;
      } else {
        await supabase.from('allocations').insert({
          allocation_id: `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          amount: amountOwedToUs,
          owner_id: 'SELF',
          current_holder_type: 'PERSON',
          current_holder_id: person.id,
          purpose: 'UNALLOCATED',
          status: 'ACTIVE',
          created_at: now, updated_at: now,
        });
      }
    }

    const { data: investedAllocs } = await supabase
      .from('allocations')
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('purpose', 'INVESTED')
      .eq('application_id', holding.application_id);

    let costRemaining = costOfSold;
    for (const alloc of investedAllocs || []) {
      if (costRemaining <= 0) break;
      if (alloc.amount <= costRemaining) {
        costRemaining -= alloc.amount;
        await supabase.from('allocations').update({ status: 'RESOLVED', updated_at: now }).eq('id', alloc.id);
        await supabase.from('journey_events').insert({
          allocation_id: alloc.allocation_id, date,
          event_type: 'INVESTMENT_SOLD',
          description: `Investment sold. Proceeds: ₹${netSale}. P&L: ₹${realizedPnL}`,
          transaction_id: txId,
          created_at: now,
        });
      } else {
        await supabase.from('allocations').update({ amount: alloc.amount - costRemaining, updated_at: now }).eq('id', alloc.id);
        await supabase.from('journey_events').insert({
          allocation_id: alloc.allocation_id, date,
          event_type: 'INVESTMENT_PARTIALLY_SOLD',
          description: `Partial investment sold. ₹${costRemaining} cost resolved.`,
          transaction_id: txId,
          created_at: now,
        });
        costRemaining = 0;
      }
    }
  }

  static async updateHoldingPrice(holdingId: number, newPrice: number): Promise<void> {
    const { data: holding } = await supabase.from('holdings').select('*').eq('id', holdingId).single();
    if (!holding) throw new Error('Holding not found');

    const currentValue = holding.shares * newPrice;
    const unrealizedProfit = currentValue - (holding.shares * holding.average_cost);
    const unrealizedROI = ((newPrice - holding.average_cost) / holding.average_cost) * 100;

    await supabase.from('holdings').update({
      current_price: newPrice,
      current_value: currentValue,
      unrealized_profit: unrealizedProfit,
      unrealized_roi: unrealizedROI,
      updated_at: new Date().toISOString(),
    }).eq('id', holdingId);
  }

  static async reclassifyAllocation(
    allocationId: string,
    newPurpose: AllocationPurpose,
    newIpoId?: number,
    newApplicationId?: number
  ): Promise<void> {
    const { data: alloc } = await supabase.from('allocations').select('*').eq('allocation_id', allocationId).single();
    if (!alloc) throw new Error('Allocation not found');

    await supabase.from('allocations').update({
      purpose: newPurpose,
      ipo_id: newIpoId,
      application_id: newApplicationId,
      updated_at: new Date().toISOString(),
    }).eq('id', alloc.id);

    await supabase.from('journey_events').insert({
      allocation_id: allocationId,
      date: new Date().toISOString().split('T')[0],
      event_type: 'RECLASSIFIED',
      description: `Allocation reclassified to ${newPurpose}`,
      application_id: newApplicationId,
      created_at: new Date().toISOString(),
    });
  }
}
