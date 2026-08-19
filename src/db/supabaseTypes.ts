export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      people: {
        Row: {
          id: number
          full_name: string
          pan_number: string | null
          mobile: string | null
          notes: string | null
          is_active: boolean
          is_self: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          full_name: string
          pan_number?: string | null
          mobile?: string | null
          notes?: string | null
          is_active?: boolean
          is_self?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          full_name?: string
          pan_number?: string | null
          mobile?: string | null
          notes?: string | null
          is_active?: boolean
          is_self?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          id: number
          bank_name: string
          account_name: string
          last_4_digits: string | null
          opening_balance: number
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          bank_name: string
          account_name: string
          last_4_digits?: string | null
          opening_balance?: number
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          bank_name?: string
          account_name?: string
          last_4_digits?: string | null
          opening_balance?: number
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      demat_accounts: {
        Row: {
          id: number
          holder_person_id: number
          broker_name: string
          demat_id: string | null
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          holder_person_id: number
          broker_name: string
          demat_id?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          holder_person_id?: number
          broker_name?: string
          demat_id?: string | null
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ipos: {
        Row: {
          id: number
          ipo_name: string
          company_name: string | null
          symbol: string
          price_per_share: number
          lot_size: number
          minimum_lots: number
          maximum_lots: number
          open_date: string | null
          close_date: string | null
          allotment_date: string | null
          refund_date: string | null
          listing_date: string | null
          listing_price: number | null
          current_market_price: number | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          ipo_name: string
          company_name?: string | null
          symbol?: string
          price_per_share: number
          lot_size?: number
          minimum_lots?: number
          maximum_lots?: number
          open_date?: string | null
          close_date?: string | null
          allotment_date?: string | null
          refund_date?: string | null
          listing_date?: string | null
          listing_price?: number | null
          current_market_price?: number | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          ipo_name?: string
          company_name?: string | null
          symbol?: string
          price_per_share?: number
          lot_size?: number
          minimum_lots?: number
          maximum_lots?: number
          open_date?: string | null
          close_date?: string | null
          allotment_date?: string | null
          refund_date?: string | null
          listing_date?: string | null
          listing_price?: number | null
          current_market_price?: number | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          id: number
          ipo_id: number
          application_type: string
          applicant_person_id: number
          demat_account_id: number
          funding_bank_account_id: number
          funding_method: string
          new_money_amount: number
          existing_balance_amount: number
          applied_lots: number
          allotted_lots: number
          ipo_price: number
          lot_size_snapshot: number
          blocked_amount: number
          investment_amount: number
          refund_amount: number
          application_status: string
          money_status: string
          allotment_status: string
          listing_status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          ipo_id: number
          application_type?: string
          applicant_person_id: number
          demat_account_id: number
          funding_bank_account_id: number
          funding_method?: string
          new_money_amount?: number
          existing_balance_amount?: number
          applied_lots?: number
          allotted_lots?: number
          ipo_price: number
          lot_size_snapshot?: number
          blocked_amount?: number
          investment_amount?: number
          refund_amount?: number
          application_status?: string
          money_status?: string
          allotment_status?: string
          listing_status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          ipo_id?: number
          application_type?: string
          applicant_person_id?: number
          demat_account_id?: number
          funding_bank_account_id?: number
          funding_method?: string
          new_money_amount?: number
          existing_balance_amount?: number
          applied_lots?: number
          allotted_lots?: number
          ipo_price?: number
          lot_size_snapshot?: number
          blocked_amount?: number
          investment_amount?: number
          refund_amount?: number
          application_status?: string
          money_status?: string
          allotment_status?: string
          listing_status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      allocations: {
        Row: {
          id: number
          allocation_id: string
          amount: number
          owner_id: string
          current_holder_type: string
          current_holder_id: number | null
          purpose: string
          ipo_id: number | null
          application_id: number | null
          origin_bank_account_id: number | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          allocation_id: string
          amount: number
          owner_id?: string
          current_holder_type?: string
          current_holder_id?: number | null
          purpose?: string
          ipo_id?: number | null
          application_id?: number | null
          origin_bank_account_id?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          allocation_id?: string
          amount?: number
          owner_id?: string
          current_holder_type?: string
          current_holder_id?: number | null
          purpose?: string
          ipo_id?: number | null
          application_id?: number | null
          origin_bank_account_id?: number | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: number
          transaction_type: string
          amount: number
          date: string
          from_bank_account_id: number | null
          to_bank_account_id: number | null
          from_person_id: number | null
          to_person_id: number | null
          ipo_id: number | null
          application_id: number | null
          related_transaction_id: number | null
          utr: string | null
          notes: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          transaction_type: string
          amount: number
          date?: string
          from_bank_account_id?: number | null
          to_bank_account_id?: number | null
          from_person_id?: number | null
          to_person_id?: number | null
          ipo_id?: number | null
          application_id?: number | null
          related_transaction_id?: number | null
          utr?: string | null
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          transaction_type?: string
          amount?: number
          date?: string
          from_bank_account_id?: number | null
          to_bank_account_id?: number | null
          from_person_id?: number | null
          to_person_id?: number | null
          ipo_id?: number | null
          application_id?: number | null
          related_transaction_id?: number | null
          utr?: string | null
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      holdings: {
        Row: {
          id: number
          ipo_id: number
          person_id: number
          demat_account_id: number
          application_id: number | null
          shares: number
          average_cost: number
          current_price: number
          current_value: number
          unrealized_profit: number
          unrealized_roi: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          ipo_id: number
          person_id: number
          demat_account_id: number
          application_id?: number | null
          shares?: number
          average_cost?: number
          current_price?: number
          current_value?: number
          unrealized_profit?: number
          unrealized_roi?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          ipo_id?: number
          person_id?: number
          demat_account_id?: number
          application_id?: number | null
          shares?: number
          average_cost?: number
          current_price?: number
          current_value?: number
          unrealized_profit?: number
          unrealized_roi?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          id: number
          holding_id: number
          ipo_id: number | null
          person_id: number | null
          shares_sold: number
          sell_price: number
          cost_basis: number
          charges: number
          gross_sale_value: number
          realized_pnl: number
          our_profit_share: number | null
          friend_profit_share: number | null
          date: string
          returned_to_bank_account_id: number | null
          utr: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          holding_id: number
          ipo_id?: number | null
          person_id?: number | null
          shares_sold?: number
          sell_price?: number
          cost_basis?: number
          charges?: number
          gross_sale_value?: number
          realized_pnl?: number
          our_profit_share?: number | null
          friend_profit_share?: number | null
          date?: string
          returned_to_bank_account_id?: number | null
          utr?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          holding_id?: number
          ipo_id?: number | null
          person_id?: number | null
          shares_sold?: number
          sell_price?: number
          cost_basis?: number
          charges?: number
          gross_sale_value?: number
          realized_pnl?: number
          our_profit_share?: number | null
          friend_profit_share?: number | null
          date?: string
          returned_to_bank_account_id?: number | null
          utr?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      journey_events: {
        Row: {
          id: number
          allocation_id: string
          date: string
          event_type: string
          description: string | null
          transaction_id: number | null
          application_id: number | null
          created_at: string
        }
        Insert: {
          id?: number
          allocation_id: string
          date?: string
          event_type: string
          description?: string | null
          transaction_id?: number | null
          application_id?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          allocation_id?: string
          date?: string
          event_type?: string
          description?: string | null
          transaction_id?: number | null
          application_id?: number | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      application_type: 'OWN_DEMAT' | 'FRIEND_DEMAT'
      funding_method: 'NEW_MONEY' | 'EXISTING_BALANCE' | 'MIXED' | 'OWN_BANK_BLOCK'
      application_status: 'APPLIED' | 'CANCELLED' | 'EXPIRED'
      money_status: 'BLOCKED' | 'PARTIAL' | 'INVESTED' | 'RELEASED'
      allotment_status: 'PENDING' | 'FULL' | 'PARTIAL' | 'NIL'
      listing_status: 'NOT_LISTED' | 'LISTING_PENDING' | 'LISTED'
      transaction_type: 'MONEY_SENT' | 'MONEY_RECEIVED' | 'SELF_TRANSFER' | 'IPO_REFUND' | 'IPO_SELL' | 'IPO_BLOCKED'
      transaction_status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
      holder_type: 'BANK' | 'PERSON'
      allocation_purpose: 'IPO_BLOCKED' | 'UNALLOCATED' | 'INVESTED' | 'RELEASED'
      allocation_status: 'ACTIVE' | 'RESOLVED'
      ipo_status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'ALLOTMENT' | 'LISTED' | 'COMPLETED'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
