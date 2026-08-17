-- Migration: Initial Schema
-- Translating local Dexie structure into PostgreSQL tables with RLS

-- 1. ENUMS (mapping String Literal Types)
CREATE TYPE application_type AS ENUM ('FRIEND_DEMAT', 'OWN_DEMAT');
CREATE TYPE application_status AS ENUM ('DRAFT', 'APPLIED', 'CANCELLED');
CREATE TYPE money_status AS ENUM ('BLOCKED', 'INVESTED', 'RELEASED', 'PARTIAL');
CREATE TYPE allotment_status AS ENUM ('PENDING', 'FULL', 'PARTIAL', 'NIL');
CREATE TYPE listing_status AS ENUM ('NOT_LISTED', 'LISTING_PENDING', 'LISTED', 'SOLD');
CREATE TYPE funding_method AS ENUM ('NEW_MONEY', 'EXISTING_BALANCE', 'MIXED', 'OWN_BANK_BLOCK');
CREATE TYPE transaction_type AS ENUM ('MONEY_SENT', 'MONEY_RECEIVED', 'SELF_TRANSFER', 'IPO_SELL', 'IPO_REFUND', 'CHARGES', 'ADJUSTMENT');
CREATE TYPE allocation_purpose AS ENUM ('UNALLOCATED', 'IPO_BLOCKED', 'INVESTED', 'RELEASED');
CREATE TYPE allocation_holder_type AS ENUM ('BANK', 'PERSON');
CREATE TYPE allocation_status AS ENUM ('ACTIVE', 'RESOLVED');

-- 2. BANK ACCOUNTS
CREATE TABLE bank_accounts (
  id BIGSERIAL PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  last_4_digits TEXT,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PEOPLE
CREATE TABLE people (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  pan_number TEXT,
  mobile TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_self BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DEMAT ACCOUNTS
CREATE TABLE demat_accounts (
  id BIGSERIAL PRIMARY KEY,
  holder_person_id BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  broker_name TEXT NOT NULL,
  demat_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. IPO MASTER
CREATE TABLE ipos (
  id BIGSERIAL PRIMARY KEY,
  ipo_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  price_per_share NUMERIC NOT NULL,
  lot_size INTEGER NOT NULL,
  minimum_lots INTEGER NOT NULL DEFAULT 1,
  maximum_lots INTEGER NOT NULL DEFAULT 13,
  open_date DATE,
  close_date DATE,
  allotment_date DATE,
  refund_date DATE,
  listing_date DATE,
  listing_price NUMERIC,
  current_market_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'UPCOMING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. APPLICATIONS
CREATE TABLE applications (
  id BIGSERIAL PRIMARY KEY,
  ipo_id BIGINT NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  application_type application_type NOT NULL,
  applicant_person_id BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  demat_account_id BIGINT NOT NULL REFERENCES demat_accounts(id) ON DELETE CASCADE,
  funding_bank_account_id BIGINT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  
  funding_method funding_method NOT NULL,
  new_money_amount NUMERIC NOT NULL DEFAULT 0,
  existing_balance_amount NUMERIC NOT NULL DEFAULT 0,
  
  applied_lots INTEGER NOT NULL,
  allotted_lots INTEGER NOT NULL DEFAULT 0,
  ipo_price NUMERIC NOT NULL,
  lot_size_snapshot INTEGER NOT NULL,
  blocked_amount NUMERIC NOT NULL,
  investment_amount NUMERIC NOT NULL DEFAULT 0,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  
  application_status application_status NOT NULL DEFAULT 'APPLIED',
  money_status money_status NOT NULL DEFAULT 'BLOCKED',
  allotment_status allotment_status NOT NULL DEFAULT 'PENDING',
  listing_status listing_status NOT NULL DEFAULT 'NOT_LISTED',
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TRANSACTIONS
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  transaction_type transaction_type NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  
  from_bank_account_id BIGINT REFERENCES bank_accounts(id) ON DELETE SET NULL,
  to_bank_account_id BIGINT REFERENCES bank_accounts(id) ON DELETE SET NULL,
  from_person_id BIGINT REFERENCES people(id) ON DELETE SET NULL,
  to_person_id BIGINT REFERENCES people(id) ON DELETE SET NULL,
  
  ipo_id BIGINT REFERENCES ipos(id) ON DELETE SET NULL,
  application_id BIGINT REFERENCES applications(id) ON DELETE SET NULL,
  related_transaction_id BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  
  utr TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. MONEY ALLOCATIONS
CREATE TABLE allocations (
  id BIGSERIAL PRIMARY KEY,
  allocation_id TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  owner_id TEXT NOT NULL DEFAULT 'SELF',
  current_holder_type allocation_holder_type NOT NULL,
  current_holder_id BIGINT NOT NULL,
  purpose allocation_purpose NOT NULL,
  
  ipo_id BIGINT REFERENCES ipos(id) ON DELETE SET NULL,
  application_id BIGINT REFERENCES applications(id) ON DELETE SET NULL,
  origin_bank_account_id BIGINT REFERENCES bank_accounts(id) ON DELETE SET NULL,
  
  status allocation_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. MONEY JOURNEY EVENTS
CREATE TABLE journey_events (
  id BIGSERIAL PRIMARY KEY,
  allocation_id TEXT NOT NULL REFERENCES allocations(allocation_id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  application_id BIGINT REFERENCES applications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. HOLDINGS
CREATE TABLE holdings (
  id BIGSERIAL PRIMARY KEY,
  ipo_id BIGINT NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  person_id BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  demat_account_id BIGINT NOT NULL REFERENCES demat_accounts(id) ON DELETE CASCADE,
  application_id BIGINT REFERENCES applications(id) ON DELETE SET NULL,
  
  shares INTEGER NOT NULL,
  average_cost NUMERIC NOT NULL,
  current_price NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL,
  unrealized_profit NUMERIC NOT NULL,
  unrealized_roi NUMERIC NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SALES
CREATE TABLE sales (
  id BIGSERIAL PRIMARY KEY,
  holding_id BIGINT NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
  ipo_id BIGINT REFERENCES ipos(id) ON DELETE SET NULL,
  person_id BIGINT REFERENCES people(id) ON DELETE SET NULL,
  
  shares_sold INTEGER NOT NULL,
  sell_price NUMERIC NOT NULL,
  charges NUMERIC NOT NULL DEFAULT 0,
  realized_pnl NUMERIC NOT NULL,
  date DATE NOT NULL,
  returned_to_bank_account_id BIGINT REFERENCES bank_accounts(id) ON DELETE SET NULL,
  utr TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. RECONCILIATIONS
CREATE TABLE reconciliations (
  id BIGSERIAL PRIMARY KEY,
  bank_account_id BIGINT NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  expected_balance NUMERIC NOT NULL,
  actual_balance NUMERIC NOT NULL,
  difference NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'RECONCILED',
  notes TEXT,
  reconciled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE demat_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;

-- SIMPLE POLICIES (Since we don't have Supabase Auth configured fully yet,
-- and the user is using simple password login, we will allow read/write for now
-- but ensure RLS is turned on. In a real-world scenario, you'd use `auth.uid()`)
CREATE POLICY "Allow all read" ON bank_accounts FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON bank_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON bank_accounts FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON bank_accounts FOR DELETE USING (true);

CREATE POLICY "Allow all read" ON people FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON people FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON people FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON people FOR DELETE USING (true);

CREATE POLICY "Allow all read" ON demat_accounts FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON demat_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON demat_accounts FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON demat_accounts FOR DELETE USING (true);

CREATE POLICY "Allow all read" ON ipos FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON ipos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON ipos FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON ipos FOR DELETE USING (true);

CREATE POLICY "Allow all read" ON applications FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON applications FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON applications FOR DELETE USING (true);

CREATE POLICY "Allow all read" ON transactions FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON transactions FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON transactions FOR DELETE USING (true);

CREATE POLICY "Allow all read" ON allocations FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON allocations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON allocations FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON allocations FOR DELETE USING (true);

CREATE POLICY "Allow all read" ON journey_events FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON journey_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON journey_events FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON journey_events FOR DELETE USING (true);

CREATE POLICY "Allow all read" ON holdings FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON holdings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON holdings FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON holdings FOR DELETE USING (true);

CREATE POLICY "Allow all read" ON sales FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON sales FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON sales FOR DELETE USING (true);

CREATE POLICY "Allow all read" ON reconciliations FOR SELECT USING (true);
CREATE POLICY "Allow all insert" ON reconciliations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update" ON reconciliations FOR UPDATE USING (true);
CREATE POLICY "Allow all delete" ON reconciliations FOR DELETE USING (true);
