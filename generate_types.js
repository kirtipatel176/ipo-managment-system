const fs = require('fs');

const tables = [
  { name: 'people', cols: { id: 'number', full_name: 'string', pan_number: 'string | null', mobile: 'string | null', notes: 'string | null', is_active: 'boolean', is_self: 'boolean', created_at: 'string', updated_at: 'string' }, defaults: ['id', 'pan_number', 'mobile', 'notes', 'is_active', 'is_self', 'created_at', 'updated_at'] },
  { name: 'bank_accounts', cols: { id: 'number', bank_name: 'string', account_name: 'string', last_4_digits: 'string | null', opening_balance: 'number', is_active: 'boolean', notes: 'string | null', created_at: 'string', updated_at: 'string' }, defaults: ['id', 'last_4_digits', 'opening_balance', 'is_active', 'notes', 'created_at', 'updated_at'] },
  { name: 'demat_accounts', cols: { id: 'number', holder_person_id: 'number', broker_name: 'string', demat_id: 'string | null', notes: 'string | null', is_active: 'boolean', created_at: 'string', updated_at: 'string' }, defaults: ['id', 'demat_id', 'notes', 'is_active', 'created_at', 'updated_at'] },
  { name: 'ipos', cols: { id: 'number', ipo_name: 'string', company_name: 'string | null', symbol: 'string', price_per_share: 'number', lot_size: 'number', minimum_lots: 'number', maximum_lots: 'number', open_date: 'string | null', close_date: 'string | null', allotment_date: 'string | null', refund_date: 'string | null', listing_date: 'string | null', listing_price: 'number | null', current_market_price: 'number | null', status: 'string', notes: 'string | null', created_at: 'string', updated_at: 'string' }, defaults: ['id', 'company_name', 'symbol', 'lot_size', 'minimum_lots', 'maximum_lots', 'open_date', 'close_date', 'allotment_date', 'refund_date', 'listing_date', 'listing_price', 'current_market_price', 'status', 'notes', 'created_at', 'updated_at'] },
  { name: 'applications', cols: { id: 'number', ipo_id: 'number', application_type: 'string', applicant_person_id: 'number', demat_account_id: 'number', funding_bank_account_id: 'number', funding_method: 'string', new_money_amount: 'number', existing_balance_amount: 'number', applied_lots: 'number', allotted_lots: 'number', ipo_price: 'number', lot_size_snapshot: 'number', blocked_amount: 'number', investment_amount: 'number', refund_amount: 'number', application_status: 'string', money_status: 'string', allotment_status: 'string', listing_status: 'string', notes: 'string | null', created_at: 'string', updated_at: 'string' }, defaults: ['id', 'application_type', 'funding_method', 'new_money_amount', 'existing_balance_amount', 'applied_lots', 'allotted_lots', 'lot_size_snapshot', 'blocked_amount', 'investment_amount', 'refund_amount', 'application_status', 'money_status', 'allotment_status', 'listing_status', 'notes', 'created_at', 'updated_at'] },
  { name: 'allocations', cols: { id: 'number', allocation_id: 'string', amount: 'number', owner_id: 'string', current_holder_type: 'string', current_holder_id: 'number | null', purpose: 'string', ipo_id: 'number | null', application_id: 'number | null', origin_bank_account_id: 'number | null', status: 'string', created_at: 'string', updated_at: 'string' }, defaults: ['id', 'owner_id', 'current_holder_type', 'current_holder_id', 'purpose', 'ipo_id', 'application_id', 'origin_bank_account_id', 'status', 'created_at', 'updated_at'] },
  { name: 'transactions', cols: { id: 'number', transaction_type: 'string', amount: 'number', date: 'string', from_bank_account_id: 'number | null', to_bank_account_id: 'number | null', from_person_id: 'number | null', to_person_id: 'number | null', ipo_id: 'number | null', application_id: 'number | null', related_transaction_id: 'number | null', utr: 'string | null', notes: 'string | null', status: 'string', created_at: 'string', updated_at: 'string' }, defaults: ['id', 'date', 'from_bank_account_id', 'to_bank_account_id', 'from_person_id', 'to_person_id', 'ipo_id', 'application_id', 'related_transaction_id', 'utr', 'notes', 'status', 'created_at', 'updated_at'] },
  { name: 'holdings', cols: { id: 'number', ipo_id: 'number', person_id: 'number', demat_account_id: 'number', application_id: 'number | null', shares: 'number', average_cost: 'number', current_price: 'number', current_value: 'number', unrealized_profit: 'number', unrealized_roi: 'number', created_at: 'string', updated_at: 'string' }, defaults: ['id', 'application_id', 'shares', 'average_cost', 'current_price', 'current_value', 'unrealized_profit', 'unrealized_roi', 'created_at', 'updated_at'] },
  { name: 'sales', cols: { id: 'number', holding_id: 'number', ipo_id: 'number | null', person_id: 'number | null', shares_sold: 'number', sell_price: 'number', cost_basis: 'number', charges: 'number', gross_sale_value: 'number', realized_pnl: 'number', our_profit_share: 'number | null', friend_profit_share: 'number | null', date: 'string', returned_to_bank_account_id: 'number | null', utr: 'string | null', created_at: 'string', updated_at: 'string' }, defaults: ['id', 'ipo_id', 'person_id', 'shares_sold', 'sell_price', 'cost_basis', 'charges', 'gross_sale_value', 'realized_pnl', 'our_profit_share', 'friend_profit_share', 'date', 'returned_to_bank_account_id', 'utr', 'created_at', 'updated_at'] },
  { name: 'journey_events', cols: { id: 'number', allocation_id: 'string', date: 'string', event_type: 'string', description: 'string | null', transaction_id: 'number | null', application_id: 'number | null', created_at: 'string' }, defaults: ['id', 'date', 'description', 'transaction_id', 'application_id', 'created_at'] },
];

let out = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
`;

for (const t of tables) {
  out += `      ${t.name}: {\n`;
  out += `        Row: {\n`;
  for (const [col, type] of Object.entries(t.cols)) {
    out += `          ${col}: ${type}\n`;
  }
  out += `        }\n`;
  out += `        Insert: {\n`;
  for (const [col, type] of Object.entries(t.cols)) {
    out += `          ${col}${t.defaults.includes(col) ? '?' : ''}: ${type}\n`;
  }
  out += `        }\n`;
  out += `        Update: {\n`;
  for (const [col, type] of Object.entries(t.cols)) {
    out += `          ${col}?: ${type}\n`;
  }
  out += `        }\n`;
  out += `        Relationships: []\n`;
  out += `      }\n`;
}

out += `    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
`;

fs.writeFileSync('src/db/supabaseTypes.ts', out);
