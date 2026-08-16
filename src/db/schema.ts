import Dexie, { type EntityTable } from 'dexie';

// ====================================================
// PHASE 2 — MONEY-FLOW ENGINE DATA MODEL
// Key rules:
//   1. Bank Account ≠ Demat Account
//   2. Friend ≠ Money Owner (Owner is always Kirti)
//   3. Transaction ≠ Allocation (real moves vs. state changes)
//   4. Own-IPO release ≠ Friend refund
//   5. Multi-status model: each application has 4 independent statuses
// ====================================================

// --- 1. BANK ACCOUNT ---
export interface BankAccount {
  id?: number;
  bankName: string;
  accountName: string;
  last4Digits?: string;
  openingBalance: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// --- 2. PERSON ---
export interface Person {
  id?: number;
  fullName: string;
  panNumber?: string;
  mobile?: string;
  notes?: string;
  isActive: boolean;
  isSelf: boolean;       // true = this is Kirti Patel (the owner of all money)
  createdAt: string;
  updatedAt: string;
}

// --- 3. DEMAT ACCOUNT ---
// First-class entity. A person can have multiple Demat accounts.
export interface DematAccount {
  id?: number;
  holderPersonId: number;  // FK → Person.id
  brokerName: string;      // e.g. Zerodha, Groww, Angel One, ICICI Direct
  dematId?: string;        // DP ID / Client ID
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// --- 4. IPO MASTER ---
export type IPOStatus =
  | 'UPCOMING' | 'OPEN' | 'CLOSED'
  | 'ALLOTMENT_PENDING' | 'ALLOTTED' | 'NOT_ALLOTTED'
  | 'REFUND_PENDING' | 'LISTED' | 'COMPLETED';

export interface IPO {
  id?: number;
  ipoName: string;
  companyName: string;
  symbol: string;
  pricePerShare: number;
  lotSize: number;
  minimumLots: number;
  maximumLots: number;
  openDate: string;
  closeDate: string;
  allotmentDate: string;
  refundDate: string;
  listingDate: string;
  listingPrice?: number;
  currentMarketPrice?: number;
  status: IPOStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// --- 5. IPO APPLICATION ---
// Each application = one (IPO × Demat × FundingBank) combination.
// The same IPO can have multiple applications (e.g. SBI/DematA + HDFC/DematB).
//
// Application Types:
//   FRIEND_DEMAT → applicant is a friend; money flows from My Bank → Friend → IPO
//   OWN_DEMAT   → applicant is self; money flows directly My Bank → IPO
//
// Multi-Status Model (4 independent statuses):
//   applicationStatus: DRAFT | APPLIED | CANCELLED
//   moneyStatus:       BLOCKED | INVESTED | RELEASED | PARTIAL
//   allotmentStatus:   PENDING | FULL | PARTIAL | NIL
//   listingStatus:     NOT_LISTED | LISTING_PENDING | LISTED | SOLD

export type ApplicationType = 'FRIEND_DEMAT' | 'OWN_DEMAT';
export type ApplicationStatus = 'DRAFT' | 'APPLIED' | 'CANCELLED';
export type MoneyStatus = 'BLOCKED' | 'INVESTED' | 'RELEASED' | 'PARTIAL';
export type AllotmentStatus = 'PENDING' | 'FULL' | 'PARTIAL' | 'NIL';
export type ListingStatus = 'NOT_LISTED' | 'LISTING_PENDING' | 'LISTED' | 'SOLD';
export type FundingMethod = 'NEW_MONEY' | 'EXISTING_BALANCE' | 'MIXED' | 'OWN_BANK_BLOCK';

export interface Application {
  id?: number;

  // Core identifiers
  ipoId: number;
  applicationType: ApplicationType;    // FRIEND_DEMAT or OWN_DEMAT
  applicantPersonId: number;           // Who applied (friend or self)
  dematAccountId: number;              // Which Demat account
  fundingBankAccountId: number;        // Which of MY bank accounts funds this

  // Funding details (for FRIEND_DEMAT with new money)
  fundingMethod: FundingMethod;
  newMoneyAmount: number;              // Fresh money sent from my bank
  existingBalanceAmount: number;       // From existing friend balance (no new bank tx)

  // Lot & amount tracking (all auto-calculated)
  appliedLots: number;
  allottedLots: number;                // 0 by default
  ipoPrice: number;                    // Snapshot of IPO price at application time
  lotSizeSnapshot: number;             // Snapshot of lot size
  blockedAmount: number;               // appliedLots × lotSize × price
  investmentAmount: number;            // allottedLots × lotSize × price (filled on allotment)
  refundAmount: number;                // blockedAmount − investmentAmount

  // Multi-status model
  applicationStatus: ApplicationStatus;
  moneyStatus: MoneyStatus;
  allotmentStatus: AllotmentStatus;
  listingStatus: ListingStatus;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// --- 6. TRANSACTION ---
// Only REAL money movements create transactions.
// Internal state changes (reuse, block, release) create MoneyAllocations only.
export type TransactionType =
  | 'MONEY_SENT'        // My Bank → Friend (new money to friend)
  | 'MONEY_RECEIVED'    // Friend → My Bank (return of principal)
  | 'SELF_TRANSFER'     // My Bank A → My Bank B (no income/expense, balance shifts)
  | 'IPO_SELL'          // Demat → My Bank (proceeds from share sale)
  | 'IPO_REFUND'        // Friend → My Bank (refund after not-allotment, for FRIEND_DEMAT)
  | 'CHARGES'           // Brokerage, STT, etc.
  | 'ADJUSTMENT';       // Manual correction

export interface Transaction {
  id?: number;
  transactionType: TransactionType;
  amount: number;
  date: string;

  // Participants (use whichever apply)
  fromBankAccountId?: number;
  toBankAccountId?: number;
  fromPersonId?: number;
  toPersonId?: number;

  // Linked entities
  ipoId?: number;
  applicationId?: number;
  relatedTransactionId?: number;  // Links refund/return to original send

  utr?: string;                   // Required for real bank movements; optional for internal
  notes?: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

// --- 7. MONEY ALLOCATION (INTERNAL LEDGER) ---
// Tracks where each chunk of money currently lives and what it's allocated to.
// A MoneyAllocation is NOT a transaction. It is a state.
//
// Purpose values:
//   UNALLOCATED   → money with friend, not yet applied to any IPO
//   IPO_BLOCKED   → money blocked for a specific IPO application
//   INVESTED      → money converted to shares (post-allotment)
//   RELEASED      → own-bank money released after not-allotment (virtual, resolved immediately)

export type AllocationPurpose = 'UNALLOCATED' | 'IPO_BLOCKED' | 'INVESTED' | 'RELEASED';
export type AllocationHolderType = 'BANK' | 'PERSON';
export type AllocationStatus = 'ACTIVE' | 'RESOLVED';

export interface MoneyAllocation {
  id?: number;
  allocationId: string;              // Human-readable: MJ-0001
  amount: number;
  ownerId: string;                   // Always 'SELF' (Kirti) — we own all money
  currentHolderType: AllocationHolderType;
  currentHolderId: number;           // bankAccountId if BANK, personId if PERSON
  purpose: AllocationPurpose;
  ipoId?: number;                    // Set when IPO_BLOCKED or INVESTED
  applicationId?: number;            // Set when IPO_BLOCKED or INVESTED
  originBankAccountId?: number;      // Which bank originally sent this money
  status: AllocationStatus;          // ACTIVE = still in play; RESOLVED = journey complete
  createdAt: string;
  updatedAt: string;
}

// --- 8. MONEY JOURNEY EVENT ---
// Append-only event log for each allocation chunk's lifecycle.
export interface MoneyJourneyEvent {
  id?: number;
  allocationId: string;
  date: string;
  eventType: string;  // e.g. 'SENT_TO_FRIEND', 'IPO_APPLIED', 'REFUND_RETAINED', 'BLOCK_RELEASED'
  description: string;
  transactionId?: number;
  applicationId?: number;
  createdAt: string;
}

// --- 9. HOLDING ---
export interface Holding {
  id?: number;
  ipoId: number;
  personId: number;
  dematAccountId: number;      // NEW: which Demat holds the shares
  applicationId?: number;      // NEW: linked application
  shares: number;
  averageCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedProfit: number;
  unrealizedROI: number;
  createdAt: string;
  updatedAt: string;
}

// --- 10. SALE ---
export interface Sale {
  id?: number;
  holdingId: number;
  sharesSold: number;
  sellPrice: number;
  charges: number;
  realizedPnL: number;
  date: string;
  returnedToBankAccountId?: number;  // Which bank received the proceeds
  utr?: string;
  createdAt: string;
  updatedAt: string;
}

// --- 11. RECONCILIATION ---
export interface Reconciliation {
  id?: number;
  bankAccountId?: number;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  status: 'RECONCILED' | 'ACTION_REQUIRED';
  notes?: string;
  reconciledAt: string;
  createdAt: string;
  updatedAt: string;
}

// --- Database Class ---
export class IPODatabase extends Dexie {
  bankAccounts!: EntityTable<BankAccount, 'id'>;
  people!: EntityTable<Person, 'id'>;
  dematAccounts!: EntityTable<DematAccount, 'id'>;
  ipos!: EntityTable<IPO, 'id'>;
  applications!: EntityTable<Application, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  allocations!: EntityTable<MoneyAllocation, 'id'>;
  journeyEvents!: EntityTable<MoneyJourneyEvent, 'id'>;
  holdings!: EntityTable<Holding, 'id'>;
  sales!: EntityTable<Sale, 'id'>;
  reconciliations!: EntityTable<Reconciliation, 'id'>;

  constructor() {
    super('IPOManagerDB_v4');
    this.version(1).stores({
      bankAccounts:    '++id, isActive',
      people:          '++id, isActive, isSelf',
      dematAccounts:   '++id, holderPersonId, isActive',
      ipos:            '++id, status',
      applications:    '++id, ipoId, applicantPersonId, dematAccountId, fundingBankAccountId, applicationType, applicationStatus, moneyStatus, allotmentStatus',
      transactions:    '++id, transactionType, date, fromBankAccountId, toBankAccountId, fromPersonId, toPersonId, ipoId, applicationId, utr, status',
      allocations:     '++id, allocationId, currentHolderType, currentHolderId, purpose, ipoId, applicationId, status',
      journeyEvents:   '++id, allocationId, date, eventType',
      holdings:        '++id, ipoId, personId, dematAccountId, applicationId',
      sales:           '++id, holdingId, date',
      reconciliations: '++id, bankAccountId, status',
    });
  }
}

export const db = new IPODatabase();
