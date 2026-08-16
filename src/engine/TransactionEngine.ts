import { db } from '../db/schema';
import type { AllocationPurpose } from '../db/schema';

// ====================================================
// TRANSACTION ENGINE v2
// Money-Flow Rules:
//   1. Real bank movement → creates a Transaction
//   2. Internal state change → creates/updates MoneyAllocation only
//   3. OWN_DEMAT not-allotted → block released, NO transaction
//   4. FRIEND_DEMAT not-allotted → refund via 3-way split
//   5. Self-transfer → Transaction (SELF_TRANSFER) but NOT income/expense
// ====================================================

export interface BankBalanceOverview {
  accountId: number;
  bankName: string;
  accountName: string;
  openingBalance: number;
  totalReceived: number;
  totalSent: number;
  grossBalance: number;      // openingBalance + received - sent (all transactions)
  ipoBlocked: number;        // money currently blocked in IPO applications from this bank
  availableBalance: number;  // grossBalance - ipoBlocked
}

export interface PersonBalanceOverview {
  personId: number;
  fullName: string;
  totalReceived: number;     // total money sent to this person (bank → person transactions)
  totalReturned: number;     // total money returned from this person (person → bank transactions)
  ipoBlocked: number;        // allocations: IPO_BLOCKED with this person as holder
  unallocated: number;       // allocations: UNALLOCATED with this person as holder
  invested: number;          // allocations: INVESTED with this person as holder
  currentlyHeld: number;     // ipoBlocked + unallocated + invested
}

// ── Refund action plan for processAllotment (FRIEND_DEMAT) ─────────────────
export interface RefundAction {
  action: 'RETURN_TO_BANK' | 'RETAIN_WITH_FRIEND' | 'REUSE_FOR_IPO';
  amount: number;
  targetBankAccountId?: number;  // required for RETURN_TO_BANK
  targetIpoId?: number;          // required for REUSE_FOR_IPO (creates allocation to next IPO)
  utr?: string;                  // optional for RETURN_TO_BANK
}

export class TransactionEngine {

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: BANK BALANCE
  // Computes actual available balance = gross balance - currently blocked
  // ─────────────────────────────────────────────────────────────────────────

  static async getBankBalance(accountId: number): Promise<BankBalanceOverview> {
    const account = await db.bankAccounts.get(accountId);
    if (!account) throw new Error('Bank account not found');

    // All completed transactions involving this bank
    const transactions = await db.transactions
      .filter(t =>
        t.status === 'COMPLETED' &&
        (t.fromBankAccountId === accountId || t.toBankAccountId === accountId)
      )
      .toArray();

    let totalSent = 0;
    let totalReceived = 0;
    for (const tx of transactions) {
      if (tx.fromBankAccountId === accountId) totalSent += tx.amount;
      if (tx.toBankAccountId   === accountId) totalReceived += tx.amount;
    }

    const grossBalance = account.openingBalance + totalReceived - totalSent;

    // IPO-blocked = active IPO_BLOCKED allocations funded from this bank
    const blockedAllocs = await db.allocations
      .filter(a =>
        a.status === 'ACTIVE' &&
        a.purpose === 'IPO_BLOCKED' &&
        a.originBankAccountId === accountId
      )
      .toArray();
    const ipoBlocked = blockedAllocs.reduce((s, a) => s + a.amount, 0);

    return {
      accountId,
      bankName: account.bankName,
      accountName: account.accountName,
      openingBalance: account.openingBalance,
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

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: PERSON BALANCE (derived from allocations — never stored directly)
  // ─────────────────────────────────────────────────────────────────────────

  static async getPersonBalance(personId: number): Promise<PersonBalanceOverview> {
    const person = await db.people.get(personId);
    if (!person) throw new Error('Person not found');

    // Active allocations where this person is the current holder
    const allocations = await db.allocations
      .filter(a => a.status === 'ACTIVE' && a.currentHolderType === 'PERSON' && a.currentHolderId === personId)
      .toArray();

    let ipoBlocked = 0;
    let unallocated = 0;
    let invested = 0;
    for (const a of allocations) {
      if (a.purpose === 'IPO_BLOCKED') ipoBlocked += a.amount;
      else if (a.purpose === 'UNALLOCATED') unallocated += a.amount;
      else if (a.purpose === 'INVESTED') invested += a.amount;
    }

    // Total received = sum of MONEY_SENT transactions TO this person
    const sentTxs = await db.transactions
      .filter(t => t.status === 'COMPLETED' && t.toPersonId === personId && !!t.fromBankAccountId)
      .toArray();
    const totalReceived = sentTxs.reduce((s, t) => s + t.amount, 0);

    // Total returned = sum of MONEY_RECEIVED / IPO_REFUND transactions FROM this person
    const returnTxs = await db.transactions
      .filter(t => t.status === 'COMPLETED' && t.fromPersonId === personId && !!t.toBankAccountId)
      .toArray();
    const totalReturned = returnTxs.reduce((s, t) => s + t.amount, 0);

    return {
      personId,
      fullName: person.fullName,
      totalReceived,
      totalReturned,
      ipoBlocked,
      unallocated,
      invested,
      currentlyHeld: ipoBlocked + unallocated + invested,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: SEND MONEY TO PERSON (FRIEND_DEMAT new funding)
  // Real bank transaction + creates UNALLOCATED allocation
  // ─────────────────────────────────────────────────────────────────────────

  static async sendMoneyToPerson(
    amount: number,
    bankAccountId: number,
    personId: number,
    date: string,
    utr?: string,
    notes?: string
  ): Promise<number> {
    return await db.transaction('rw', [db.transactions, db.allocations, db.journeyEvents], async () => {
      if (utr) {
        const existing = await db.transactions.where('utr').equals(utr).first();
        if (existing) throw new Error(`Duplicate UTR: ${utr}`);
      }

      const now = new Date().toISOString();

      const txId = await db.transactions.add({
        transactionType: 'MONEY_SENT',
        amount, date,
        fromBankAccountId: bankAccountId,
        toPersonId: personId,
        utr, notes,
        status: 'COMPLETED',
        createdAt: now, updatedAt: now,
      });

      const allocationId = `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await db.allocations.add({
        allocationId, amount,
        ownerId: 'SELF',
        currentHolderType: 'PERSON',
        currentHolderId: personId,
        purpose: 'UNALLOCATED',
        originBankAccountId: bankAccountId,
        status: 'ACTIVE',
        createdAt: now, updatedAt: now,
      });

      await db.journeyEvents.add({
        allocationId, date,
        eventType: 'SENT_TO_FRIEND',
        description: `₹${amount} sent from bank to person`,
        transactionId: txId as number,
        createdAt: now,
      });

      return txId as number;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: SELF TRANSFER (My Bank A → My Bank B)
  // Creates a SELF_TRANSFER transaction.
  // Does NOT count as income or expense. Just shifts location.
  // ─────────────────────────────────────────────────────────────────────────

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
      const existing = await db.transactions.where('utr').equals(utr).first();
      if (existing) throw new Error(`Duplicate UTR: ${utr}`);
    }

    // Validate available balance
    const available = await TransactionEngine.getBankAvailableBalance(fromBankAccountId);
    if (available < amount) {
      throw new Error(`Insufficient available balance. Available: ₹${available}, Required: ₹${amount}`);
    }

    const now = new Date().toISOString();
    const txId = await db.transactions.add({
      transactionType: 'SELF_TRANSFER',
      amount, date,
      fromBankAccountId, toBankAccountId,
      utr, notes,
      status: 'COMPLETED',
      createdAt: now, updatedAt: now,
    });

    return txId as number;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: APPLY FOR IPO
  //
  // OWN_DEMAT:
  //   - No person involved
  //   - Validates bank available balance ≥ required
  //   - Creates Application + IPO_BLOCKED allocation from bank
  //
  // FRIEND_DEMAT (NEW_MONEY):
  //   - Validates bank available balance ≥ newMoneyAmount
  //   - Creates MONEY_SENT transaction
  //   - Creates UNALLOCATED allocation → then immediately converts to IPO_BLOCKED
  //
  // FRIEND_DEMAT (EXISTING_BALANCE):
  //   - No new bank transaction
  //   - Converts existing UNALLOCATED allocations from person to IPO_BLOCKED
  //
  // FRIEND_DEMAT (MIXED):
  //   - Both of the above
  // ─────────────────────────────────────────────────────────────────────────

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
    return await db.transaction('rw', [
      db.ipos, db.applications, db.transactions, db.allocations, db.journeyEvents, db.dematAccounts, db.bankAccounts
    ], async () => {
      const ipo = await db.ipos.get(params.ipoId);
      if (!ipo) throw new Error('IPO not found');

      const demat = await db.dematAccounts.get(params.dematAccountId);
      if (!demat) throw new Error('Demat account not found');

      const ipoPrice = ipo.pricePerShare;
      const lotSize = ipo.lotSize;
      const blockedAmount = params.appliedLots * lotSize * ipoPrice;
      const newMoney = params.newMoneyAmount ?? 0;
      const existingMoney = params.existingBalanceAmount ?? 0;
      const now = new Date().toISOString();

      // Validate funding totals match for friend demat
      const totalFunding = newMoney + existingMoney;
      if (params.applicationType === 'FRIEND_DEMAT') {
        if (Math.abs(totalFunding - blockedAmount) > 0.01) {
          throw new Error(`Funding mismatch: required ₹${blockedAmount}, got ₹${totalFunding}`);
        }
      }

      // Create the application record
      const appId = await db.applications.add({
        ipoId: params.ipoId,
        applicationType: params.applicationType,
        applicantPersonId: params.applicantPersonId,
        dematAccountId: params.dematAccountId,
        fundingBankAccountId: params.fundingBankAccountId,
        fundingMethod: params.fundingMethod,
        newMoneyAmount: newMoney,
        existingBalanceAmount: existingMoney,
        appliedLots: params.appliedLots,
        allottedLots: 0,
        ipoPrice,
        lotSizeSnapshot: lotSize,
        blockedAmount,
        investmentAmount: 0,
        refundAmount: 0,
        applicationStatus: 'APPLIED',
        moneyStatus: 'BLOCKED',
        allotmentStatus: 'PENDING',
        listingStatus: 'NOT_LISTED',
        notes: params.notes,
        createdAt: now, updatedAt: now,
      }) as number;

      if (params.applicationType === 'OWN_DEMAT' || params.fundingMethod === 'OWN_BANK_BLOCK') {
        // ── OWN DEMAT: validate and create a bank-level blocked allocation ──
        const available = await TransactionEngine.getBankAvailableBalance(params.fundingBankAccountId);
        if (available < blockedAmount) {
          throw new Error(`Insufficient bank balance. Available: ₹${available}, Required: ₹${blockedAmount}`);
        }

        const allocationId = `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await db.allocations.add({
          allocationId, amount: blockedAmount,
          ownerId: 'SELF',
          currentHolderType: 'BANK',
          currentHolderId: params.fundingBankAccountId,
          purpose: 'IPO_BLOCKED',
          ipoId: params.ipoId,
          applicationId: appId,
          originBankAccountId: params.fundingBankAccountId,
          status: 'ACTIVE',
          createdAt: now, updatedAt: now,
        });

        await db.journeyEvents.add({
          allocationId, date: params.date,
          eventType: 'IPO_BLOCKED',
          description: `₹${blockedAmount} blocked for ${ipo.symbol} (Own Demat)`,
          applicationId: appId,
          createdAt: now,
        });

      } else {
        // ── FRIEND DEMAT ──────────────────────────────────────────────────

        // Handle new money (if any)
        if (newMoney > 0) {
          const available = await TransactionEngine.getBankAvailableBalance(params.fundingBankAccountId);
          if (available < newMoney) {
            throw new Error(`Insufficient bank balance. Available: ₹${available}, Required: ₹${newMoney}`);
          }

          const txId = await db.transactions.add({
            transactionType: 'MONEY_SENT',
            amount: newMoney,
            date: params.date,
            fromBankAccountId: params.fundingBankAccountId,
            toPersonId: params.applicantPersonId,
            ipoId: params.ipoId,
            applicationId: appId,
            status: 'COMPLETED',
            createdAt: now, updatedAt: now,
          }) as number;

          const allocationId = `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await db.allocations.add({
            allocationId, amount: newMoney,
            ownerId: 'SELF',
            currentHolderType: 'PERSON',
            currentHolderId: params.applicantPersonId,
            purpose: 'IPO_BLOCKED',
            ipoId: params.ipoId,
            applicationId: appId,
            originBankAccountId: params.fundingBankAccountId,
            status: 'ACTIVE',
            createdAt: now, updatedAt: now,
          });

          await db.journeyEvents.add({
            allocationId, date: params.date,
            eventType: 'IPO_FUNDED_NEW',
            description: `₹${newMoney} sent from bank → friend for ${ipo.symbol}`,
            transactionId: txId,
            applicationId: appId,
            createdAt: now,
          });
        }

        // Handle existing balance (if any)
        if (existingMoney > 0) {
          // Consume UNALLOCATED allocations from this person (FIFO)
          const unallocatedAllocs = await db.allocations
            .filter(a =>
              a.status === 'ACTIVE' &&
              a.currentHolderType === 'PERSON' &&
              a.currentHolderId === params.applicantPersonId &&
              a.purpose === 'UNALLOCATED'
            )
            .toArray();
          unallocatedAllocs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          let remaining = existingMoney;
          for (const alloc of unallocatedAllocs) {
            if (remaining <= 0) break;
            if (alloc.amount <= remaining) {
              remaining -= alloc.amount;
              await db.allocations.update(alloc.id!, {
                purpose: 'IPO_BLOCKED',
                ipoId: params.ipoId,
                applicationId: appId,
                updatedAt: now,
              });
              await db.journeyEvents.add({
                allocationId: alloc.id!, date: params.date,
                eventType: 'IPO_REUSED_BALANCE',
                description: `₹${alloc.amount} reused from existing balance for ${ipo.symbol}`,
                applicationId: appId,
                createdAt: now,
              });
            } else {
              // Split the allocation
              await db.allocations.update(alloc.id!, {
                amount: alloc.amount - remaining,
                updatedAt: now,
              });
              const newAllocId = `MJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              await db.allocations.add({
                allocationId: newAllocId,
                amount: remaining,
                ownerId: 'SELF',
                currentHolderType: 'PERSON',
                currentHolderId: params.applicantPersonId,
                purpose: 'IPO_BLOCKED',
                ipoId: params.ipoId,
                applicationId: appId,
                originBankAccountId: alloc.originBankAccountId,
                status: 'ACTIVE',
                createdAt: now, updatedAt: now,
              });
              await db.journeyEvents.add({
                allocationId: newAllocId, date: params.date,
                eventType: 'IPO_REUSED_BALANCE',
                description: `₹${remaining} reused (split) from existing balance for ${ipo.symbol}`,
                applicationId: appId,
                createdAt: now,
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
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 6: PROCESS ALLOTMENT
  //
  // OWN_DEMAT:
  //   - Updates application statuses
  //   - If allotted: converts IPO_BLOCKED → INVESTED, creates Holding
  //   - If not allotted: marks allocation as RELEASED (resolves it), no transaction
  //   - If partial: split — part → INVESTED, part → RELEASED
  //
  // FRIEND_DEMAT:
  //   - If allotted: converts part of IPO_BLOCKED → INVESTED, creates Holding
  //   - Refund handled per RefundAction array (3-way split supported)
  //   - RETURN_TO_BANK → real Transaction + resolve allocation
  //   - RETAIN_WITH_FRIEND → allocation changes purpose to UNALLOCATED
  //   - REUSE_FOR_IPO → allocation linked to new IPO (still IPO_BLOCKED)
  // ─────────────────────────────────────────────────────────────────────────

  static async processAllotment(
    applicationId: number,
    allottedLots: number,
    refundActions?: RefundAction[],   // Only for FRIEND_DEMAT; ignored for OWN_DEMAT
    allotmentDate?: string
  ): Promise<void> {
    await db.transaction('rw', [
      db.applications, db.ipos, db.allocations, db.journeyEvents, db.holdings, db.transactions
    ], async () => {
      const app = await db.applications.get(applicationId);
      if (!app) throw new Error('Application not found');
      if (app.allotmentStatus !== 'PENDING') throw new Error('Allotment already processed.');

      const ipo = await db.ipos.get(app.ipoId);
      if (!ipo) throw new Error('IPO not found');
      if (allottedLots > app.appliedLots) throw new Error('Allotted lots cannot exceed applied lots.');

      const now = new Date().toISOString();
      const date = allotmentDate ?? now.split('T')[0];

      const investmentAmount = allottedLots * app.lotSizeSnapshot * app.ipoPrice;
      const refundAmount = app.blockedAmount - investmentAmount;
      const allotmentStatus: 'FULL' | 'PARTIAL' | 'NIL' =
        allottedLots === 0 ? 'NIL' :
        allottedLots === app.appliedLots ? 'FULL' : 'PARTIAL';

      // ── Update application ───────────────────────────────────────────────
      await db.applications.update(applicationId, {
        allottedLots,
        investmentAmount,
        refundAmount,
        allotmentStatus,
        moneyStatus: allottedLots === 0 ? 'RELEASED' : (refundAmount > 0 ? 'PARTIAL' : 'INVESTED'),
        listingStatus: allottedLots > 0 ? 'LISTING_PENDING' : 'NOT_LISTED',
        updatedAt: now,
      });

      // ── Create holding if allotted ────────────────────────────────────────
      if (allottedLots > 0) {
        await db.holdings.add({
          ipoId: app.ipoId,
          personId: app.applicantPersonId,
          dematAccountId: app.dematAccountId,
          applicationId,
          shares: allottedLots * app.lotSizeSnapshot,
          averageCost: app.ipoPrice,
          currentPrice: ipo.currentMarketPrice ?? app.ipoPrice,
          currentValue: allottedLots * app.lotSizeSnapshot * (ipo.currentMarketPrice ?? app.ipoPrice),
          unrealizedProfit: allottedLots * app.lotSizeSnapshot * ((ipo.currentMarketPrice ?? app.ipoPrice) - app.ipoPrice),
          unrealizedROI: ipo.currentMarketPrice
            ? ((ipo.currentMarketPrice - app.ipoPrice) / app.ipoPrice) * 100
            : 0,
          createdAt: now, updatedAt: now,
        });
      }

      // ── Process allocations ───────────────────────────────────────────────
      const blockedAllocs = await db.allocations
        .filter(a => a.applicationId === applicationId && a.purpose === 'IPO_BLOCKED' && a.status === 'ACTIVE')
        .toArray();

      if (app.applicationType === 'OWN_DEMAT') {
        // ── OWN_DEMAT: simple block → invested / released ──────────────────
        let investRemaining = investmentAmount;
        let releaseRemaining = refundAmount;

        for (const alloc of blockedAllocs) {
          let allocAmt = alloc.amount;

          if (investRemaining > 0) {
            const investPart = Math.min(allocAmt, investRemaining);
            if (investPart === allocAmt) {
              await db.allocations.update(alloc.id!, { purpose: 'INVESTED', updatedAt: now });
            } else {
              await db.allocations.update(alloc.id!, { amount: investPart, purpose: 'INVESTED', updatedAt: now });
              // The remaining part is released
              await db.allocations.add({
                ...alloc, id: undefined,
                amount: allocAmt - investPart,
                purpose: 'RELEASED',
                status: 'RESOLVED', // Released immediately
                createdAt: now, updatedAt: now,
              });
              await db.journeyEvents.add({
                allocationId: alloc.id!, date,
                eventType: 'BLOCK_RELEASED',
                description: `₹${allocAmt - investPart} released back to bank (partial allotment - own demat)`,
                applicationId,
                createdAt: now,
              });
            }
            await db.journeyEvents.add({
              allocationId: alloc.id!, date,
              eventType: 'INVESTED',
              description: `₹${investPart} converted to investment in ${ipo.symbol}`,
              applicationId,
              createdAt: now,
            });
            investRemaining -= investPart;
            allocAmt -= investPart;
          }

          if (allocAmt > 0 && releaseRemaining > 0) {
            // This portion is released
            await db.allocations.update(alloc.id!, { purpose: 'RELEASED', status: 'RESOLVED', updatedAt: now });
            await db.journeyEvents.add({
              allocationId: alloc.id!, date,
              eventType: 'BLOCK_RELEASED',
              description: `₹${allocAmt} released back to bank (not allotted - own demat)`,
              applicationId,
              createdAt: now,
            });
            releaseRemaining -= allocAmt;
          }
        }

      } else {
        // ── FRIEND_DEMAT: invested + 3-way refund split ───────────────────
        // First mark invested portion
        let investRemaining = investmentAmount;
        for (const alloc of blockedAllocs) {
          if (investRemaining <= 0) break;
          const investPart = Math.min(alloc.amount, investRemaining);
          if (investPart === alloc.amount) {
            await db.allocations.update(alloc.id!, { purpose: 'INVESTED', updatedAt: now });
          } else {
            await db.allocations.update(alloc.id!, { amount: investPart, purpose: 'INVESTED', updatedAt: now });
            await db.allocations.add({
              ...alloc, id: undefined,
              amount: alloc.amount - investPart,
              purpose: 'IPO_BLOCKED', // Still blocked — will be handled by refund actions
              createdAt: now, updatedAt: now,
            });
          }
          await db.journeyEvents.add({
            allocationId: alloc.id!, date,
            eventType: 'INVESTED',
            description: `₹${investPart} converted to investment in ${ipo.symbol} (friend demat)`,
            applicationId,
            createdAt: now,
          });
          investRemaining -= investPart;
        }

        // Now process refund actions
        if (refundAmount > 0 && refundActions && refundActions.length > 0) {
          const totalRefundActions = refundActions.reduce((s, a) => s + a.amount, 0);
          if (Math.abs(totalRefundActions - refundAmount) > 0.01) {
            throw new Error(`Refund action amounts (₹${totalRefundActions}) must equal refund amount (₹${refundAmount})`);
          }

          // Get remaining IPO_BLOCKED allocations (the refund portion)
          const refundAllocs = await db.allocations
            .filter(a => a.applicationId === applicationId && a.purpose === 'IPO_BLOCKED' && a.status === 'ACTIVE')
            .toArray();

          for (const action of refundActions) {
            let actionRemaining = action.amount;

            for (const alloc of refundAllocs) {
              if (actionRemaining <= 0) break;
              if (alloc.status !== 'ACTIVE') continue;

              const chunk = Math.min(alloc.amount, actionRemaining);

              if (action.action === 'RETURN_TO_BANK') {
                // Real transaction: Friend → My Bank
                const txId = await db.transactions.add({
                  transactionType: 'IPO_REFUND',
                  amount: chunk,
                  date,
                  fromPersonId: app.applicantPersonId,
                  toBankAccountId: action.targetBankAccountId,
                  ipoId: app.ipoId,
                  applicationId,
                  utr: action.utr,
                  status: 'COMPLETED',
                  createdAt: now, updatedAt: now,
                }) as number;

                // Resolve allocation
                if (chunk === alloc.amount) {
                  await db.allocations.update(alloc.id!, { purpose: 'RELEASED', status: 'RESOLVED', updatedAt: now });
                } else {
                  await db.allocations.update(alloc.id!, { amount: alloc.amount - chunk, updatedAt: now });
                  await db.allocations.add({
                    ...alloc, id: undefined,
                    amount: chunk,
                    purpose: 'RELEASED',
                    status: 'RESOLVED',
                    createdAt: now, updatedAt: now,
                  });
                }
                await db.journeyEvents.add({
                  allocationId: alloc.id!, date,
                  eventType: 'REFUND_RETURNED_TO_BANK',
                  description: `₹${chunk} refund returned to bank`,
                  transactionId: txId,
                  applicationId,
                  createdAt: now,
                });

              } else if (action.action === 'RETAIN_WITH_FRIEND') {
                // No transaction — just change purpose to UNALLOCATED
                if (chunk === alloc.amount) {
                  await db.allocations.update(alloc.id!, {
                    purpose: 'UNALLOCATED',
                    ipoId: undefined,
                    applicationId: undefined,
                    updatedAt: now,
                  });
                } else {
                  await db.allocations.update(alloc.id!, { amount: alloc.amount - chunk, updatedAt: now });
                  await db.allocations.add({
                    ...alloc, id: undefined,
                    amount: chunk,
                    purpose: 'UNALLOCATED',
                    ipoId: undefined,
                    applicationId: undefined,
                    createdAt: now, updatedAt: now,
                  });
                }
                await db.journeyEvents.add({
                  allocationId: alloc.id!, date,
                  eventType: 'REFUND_RETAINED',
                  description: `₹${chunk} refund retained with friend (available for next IPO)`,
                  applicationId,
                  createdAt: now,
                });

              } else if (action.action === 'REUSE_FOR_IPO') {
                // Internal reuse — link to next IPO (still IPO_BLOCKED)
                if (chunk === alloc.amount) {
                  await db.allocations.update(alloc.id!, {
                    ipoId: action.targetIpoId,
                    applicationId: undefined, // Will be set when new application is created
                    updatedAt: now,
                  });
                } else {
                  await db.allocations.update(alloc.id!, { amount: alloc.amount - chunk, updatedAt: now });
                  await db.allocations.add({
                    ...alloc, id: undefined,
                    amount: chunk,
                    ipoId: action.targetIpoId,
                    applicationId: undefined,
                    createdAt: now, updatedAt: now,
                  });
                }
                await db.journeyEvents.add({
                  allocationId: alloc.id!, date,
                  eventType: 'REFUND_REUSED',
                  description: `₹${chunk} refund reused for next IPO (internal allocation)`,
                  applicationId,
                  createdAt: now,
                });
              }

              // Mark allocation amount consumed for this action
              alloc.amount -= chunk;
              actionRemaining -= chunk;
            }
          }
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 7: RECEIVE MONEY FROM PERSON (manual return, outside IPO refund)
  // ─────────────────────────────────────────────────────────────────────────

  static async receiveMoneyFromPerson(
    amount: number,
    personId: number,
    bankAccountId: number,
    date: string,
    utr?: string,
    notes?: string
  ): Promise<number> {
    return await db.transaction('rw', [db.transactions, db.allocations, db.journeyEvents], async () => {
      if (utr) {
        const existing = await db.transactions.where('utr').equals(utr).first();
        if (existing) throw new Error(`Duplicate UTR: ${utr}`);
      }

      const now = new Date().toISOString();

      // Consume UNALLOCATED allocations FIFO
      const unallocated = await db.allocations
        .filter(a =>
          a.status === 'ACTIVE' &&
          a.currentHolderType === 'PERSON' &&
          a.currentHolderId === personId &&
          a.purpose === 'UNALLOCATED'
        )
        .toArray();
      unallocated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      let amountToReturn = amount;
      for (const alloc of unallocated) {
        if (amountToReturn <= 0) break;
        if (alloc.amount <= amountToReturn) {
          amountToReturn -= alloc.amount;
          await db.allocations.update(alloc.id!, { status: 'RESOLVED', purpose: 'RELEASED', updatedAt: now });
          await db.journeyEvents.add({
            allocationId: alloc.id!, date,
            eventType: 'RETURNED_TO_BANK',
            description: `₹${alloc.amount} returned to bank`,
            createdAt: now,
          });
        } else {
          await db.allocations.update(alloc.id!, { amount: alloc.amount - amountToReturn, updatedAt: now });
          await db.journeyEvents.add({
            allocationId: alloc.id!, date,
            eventType: 'RETURNED_TO_BANK',
            description: `₹${amountToReturn} partially returned to bank`,
            createdAt: now,
          });
          amountToReturn = 0;
        }
      }

      if (amountToReturn > 0) {
        throw new Error(`Insufficient unallocated funds with person. Shortfall: ₹${amountToReturn}`);
      }

      const txId = await db.transactions.add({
        transactionType: 'MONEY_RECEIVED',
        amount, date,
        fromPersonId: personId,
        toBankAccountId: bankAccountId,
        utr, notes,
        status: 'COMPLETED',
        createdAt: now, updatedAt: now,
      });

      return txId as number;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 8: SELL HOLDING
  // ─────────────────────────────────────────────────────────────────────────

  static async sellHolding(
    holdingId: number,
    sharesToSell: number,
    sellPrice: number,
    charges: number,
    bankAccountId: number,
    date: string,
    utr?: string
  ): Promise<void> {
    await db.transaction('rw', [db.holdings, db.sales, db.transactions, db.allocations, db.journeyEvents], async () => {
      const holding = await db.holdings.get(holdingId);
      if (!holding) throw new Error('Holding not found');
      if (sharesToSell > holding.shares) throw new Error('Cannot sell more shares than held.');

      const costOfSold = sharesToSell * holding.averageCost;
      const grossSale = sharesToSell * sellPrice;
      const netSale = grossSale - charges;
      const realizedPnL = netSale - costOfSold;
      const now = new Date().toISOString();

      // Record sale
      await db.sales.add({
        holdingId, sharesSold: sharesToSell, sellPrice, charges, realizedPnL,
        date, returnedToBankAccountId: bankAccountId, utr,
        createdAt: now, updatedAt: now,
      });

      // Update or remove holding
      if (sharesToSell === holding.shares) {
        await db.holdings.delete(holdingId);
      } else {
        const newShares = holding.shares - sharesToSell;
        await db.holdings.update(holdingId, {
          shares: newShares,
          currentValue: newShares * holding.currentPrice,
          unrealizedProfit: newShares * (holding.currentPrice - holding.averageCost),
          updatedAt: now,
        });
      }

      // Real transaction: money hits bank (sale proceeds)
      const txId = await db.transactions.add({
        transactionType: 'IPO_SELL',
        amount: netSale,
        date,
        toBankAccountId: bankAccountId,
        ipoId: holding.ipoId,
        utr,
        notes: `Sold ${sharesToSell} shares. Realized P&L: ₹${realizedPnL}`,
        status: 'COMPLETED',
        createdAt: now, updatedAt: now,
      }) as number;

      // Resolve INVESTED allocations
      const investedAllocs = await db.allocations
        .filter(a =>
          a.status === 'ACTIVE' &&
          a.purpose === 'INVESTED' &&
          a.ipoId === holding.ipoId &&
          a.currentHolderId === holding.personId
        )
        .toArray();

      let costRemaining = costOfSold;
      for (const alloc of investedAllocs) {
        if (costRemaining <= 0) break;
        if (alloc.amount <= costRemaining) {
          costRemaining -= alloc.amount;
          await db.allocations.update(alloc.id!, { status: 'RESOLVED', updatedAt: now });
          await db.journeyEvents.add({
            allocationId: alloc.id!, date,
            eventType: 'INVESTMENT_SOLD',
            description: `Investment sold. Proceeds: ₹${netSale}. P&L: ₹${realizedPnL}`,
            transactionId: txId,
            createdAt: now,
          });
        } else {
          await db.allocations.update(alloc.id!, { amount: alloc.amount - costRemaining, updatedAt: now });
          await db.journeyEvents.add({
            allocationId: alloc.id!, date,
            eventType: 'INVESTMENT_PARTIALLY_SOLD',
            description: `Partial investment sold. ₹${costRemaining} cost resolved.`,
            transactionId: txId,
            createdAt: now,
          });
          costRemaining = 0;
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 9: UPDATE HOLDING PRICES (for P&L tracking)
  // ─────────────────────────────────────────────────────────────────────────

  static async updateHoldingPrice(holdingId: number, newPrice: number): Promise<void> {
    const holding = await db.holdings.get(holdingId);
    if (!holding) throw new Error('Holding not found');

    const currentValue = holding.shares * newPrice;
    const unrealizedProfit = currentValue - (holding.shares * holding.averageCost);
    const unrealizedROI = ((newPrice - holding.averageCost) / holding.averageCost) * 100;

    await db.holdings.update(holdingId, {
      currentPrice: newPrice,
      currentValue,
      unrealizedProfit,
      unrealizedROI,
      updatedAt: new Date().toISOString(),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 10: RECLASSIFY ALLOCATION MONEY TYPE (helper)
  // Change purpose of an allocation (e.g. UNALLOCATED → IPO_BLOCKED when reusing)
  // ─────────────────────────────────────────────────────────────────────────

  static async reclassifyAllocation(
    allocationId: string,
    newPurpose: AllocationPurpose,
    newIpoId?: number,
    newApplicationId?: number
  ): Promise<void> {
    const alloc = await db.allocations.where('allocationId').equals(allocationId).first();
    if (!alloc) throw new Error('Allocation not found');

    await db.allocations.update(alloc.id!, {
      purpose: newPurpose,
      ipoId: newIpoId,
      applicationId: newApplicationId,
      updatedAt: new Date().toISOString(),
    });

    await db.journeyEvents.add({
      allocationId,
      date: new Date().toISOString().split('T')[0],
      eventType: 'RECLASSIFIED',
      description: `Allocation reclassified to ${newPurpose}`,
      applicationId: newApplicationId,
      createdAt: new Date().toISOString(),
    });
  }
}
