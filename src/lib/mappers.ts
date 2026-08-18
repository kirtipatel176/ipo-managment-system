import type { Database } from '../db/supabaseTypes';

type IpoRow = Database['public']['Tables']['ipos']['Row'];
type PersonRow = Database['public']['Tables']['people']['Row'];
type DematAccountRow = Database['public']['Tables']['demat_accounts']['Row'];
type BankAccountRow = Database['public']['Tables']['bank_accounts']['Row'];
type ApplicationRow = Database['public']['Tables']['applications']['Row'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type AllocationRow = Database['public']['Tables']['allocations']['Row'];
type HoldingRow = Database['public']['Tables']['holdings']['Row'];
type SaleRow = Database['public']['Tables']['sales']['Row'];
type JourneyEventRow = Database['public']['Tables']['journey_events']['Row'];

export function mapIpo(row: IpoRow) {
  return {
    id: row.id,
    ipoName: row.ipo_name,
    companyName: row.company_name,
    symbol: row.symbol,
    pricePerShare: row.price_per_share,
    lotSize: row.lot_size,
    minimumLots: row.minimum_lots,
    maximumLots: row.maximum_lots,
    openDate: row.open_date,
    closeDate: row.close_date,
    allotmentDate: row.allotment_date,
    refundDate: row.refund_date,
    listingDate: row.listing_date,
    listingPrice: row.listing_price,
    currentMarketPrice: row.current_market_price,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPerson(row: PersonRow) {
  return {
    id: row.id,
    fullName: row.full_name,
    panNumber: row.pan_number,
    mobile: row.mobile,
    notes: row.notes,
    isActive: row.is_active,
    isSelf: row.is_self,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDematAccount(row: DematAccountRow) {
  return {
    id: row.id,
    holderPersonId: row.holder_person_id,
    brokerName: row.broker_name,
    dematId: row.demat_id,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBankAccount(row: BankAccountRow) {
  return {
    id: row.id,
    bankName: row.bank_name,
    accountName: row.account_name,
    last4Digits: row.last_4_digits,
    openingBalance: row.opening_balance,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


export function mapApplication(row: ApplicationRow) {
  return {
    id: row.id,
    ipoId: row.ipo_id,
    applicationType: row.application_type,
    applicantPersonId: row.applicant_person_id,
    dematAccountId: row.demat_account_id,
    fundingBankAccountId: row.funding_bank_account_id,
    fundingMethod: row.funding_method,
    newMoneyAmount: row.new_money_amount,
    existingBalanceAmount: row.existing_balance_amount,
    appliedLots: row.applied_lots,
    allottedLots: row.allotted_lots,
    ipoPrice: row.ipo_price,
    lotSizeSnapshot: row.lot_size_snapshot,
    blockedAmount: row.blocked_amount,
    investmentAmount: row.investment_amount,
    refundAmount: row.refund_amount,
    applicationStatus: row.application_status,
    moneyStatus: row.money_status,
    allotmentStatus: row.allotment_status,
    listingStatus: row.listing_status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTransaction(row: TransactionRow) {
  return {
    id: row.id,
    transactionType: row.transaction_type,
    amount: row.amount,
    date: row.date,
    fromBankAccountId: row.from_bank_account_id,
    toBankAccountId: row.to_bank_account_id,
    fromPersonId: row.from_person_id,
    toPersonId: row.to_person_id,
    ipoId: row.ipo_id,
    applicationId: row.application_id,
    relatedTransactionId: row.related_transaction_id,
    utr: row.utr,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAllocation(row: AllocationRow) {
  return {
    id: row.id,
    allocationId: row.allocation_id,
    amount: row.amount,
    ownerId: row.owner_id,
    currentHolderType: row.current_holder_type,
    currentHolderId: row.current_holder_id,
    purpose: row.purpose,
    ipoId: row.ipo_id,
    applicationId: row.application_id,
    originBankAccountId: row.origin_bank_account_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapHolding(row: HoldingRow) {
  return {
    id: row.id,
    ipoId: row.ipo_id,
    personId: row.person_id,
    dematAccountId: row.demat_account_id,
    applicationId: row.application_id,
    shares: row.shares,
    averageCost: row.average_cost,
    currentPrice: row.current_price,
    currentValue: row.current_value,
    unrealizedProfit: row.unrealized_profit,
    unrealizedROI: row.unrealized_roi,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSale(row: SaleRow) {
  return {
    id: row.id,
    holdingId: row.holding_id,
    ipoId: row.ipo_id,
    personId: row.person_id,
    sharesSold: row.shares_sold,
    sellPrice: row.sell_price,
    charges: row.charges,
    realizedPnL: row.realized_pnl,
    ourProfitShare: row.our_profit_share ?? row.realized_pnl, // Fallback if not yet migrated
    friendProfitShare: row.friend_profit_share ?? 0,
    date: row.date,
    returnedToBankAccountId: row.returned_to_bank_account_id,
    utr: row.utr,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapJourneyEvent(row: JourneyEventRow) {
  return {
    id: row.id,
    allocationId: row.allocation_id,
    date: row.date,
    eventType: row.event_type,
    description: row.description,
    transactionId: row.transaction_id,
    applicationId: row.application_id,
    createdAt: row.created_at,
  };
}
