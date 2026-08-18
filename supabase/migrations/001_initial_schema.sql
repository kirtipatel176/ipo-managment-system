-- ============================================================
-- IPO Management System — Complete Supabase Schema
-- ============================================================
-- Run this in Supabase SQL Editor or as a migration file.
-- This creates all tables, types, indexes, RLS policies, and
-- a trigger to auto-refresh holding values on IPO price update.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- TABLE: people
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS people (
  id            BIGSERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  pan_number    TEXT,
  mobile        TEXT,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_self       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_people_active ON people (is_active);
CREATE INDEX IF NOT EXISTS idx_people_is_self ON people (is_self);

-- ──────────────────────────────────────────────────────────────
-- TABLE: bank_accounts
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bank_accounts (
  id              BIGSERIAL PRIMARY KEY,
  bank_name       TEXT NOT NULL,
  account_name    TEXT NOT NULL,
  last_4_digits   TEXT,
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts (is_active);

-- ──────────────────────────────────────────────────────────────
-- TABLE: demat_accounts
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS demat_accounts (
  id                BIGSERIAL PRIMARY KEY,
  holder_person_id  BIGINT NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  broker_name       TEXT NOT NULL,
  demat_id          TEXT,
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demat_holder ON demat_accounts (holder_person_id);

-- ──────────────────────────────────────────────────────────────
-- TABLE: ipos
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ipos (
  id                   BIGSERIAL PRIMARY KEY,
  ipo_name             TEXT NOT NULL,
  company_name         TEXT,
  symbol               TEXT NOT NULL DEFAULT '',
  price_per_share      NUMERIC(12,2) NOT NULL,
  lot_size             INT NOT NULL DEFAULT 1,
  minimum_lots         INT NOT NULL DEFAULT 1,
  maximum_lots         INT NOT NULL DEFAULT 1,
  open_date            DATE,
  close_date           DATE,
  allotment_date       DATE,
  refund_date          DATE,
  listing_date         DATE,
  listing_price        NUMERIC(12,2),
  current_market_price NUMERIC(12,2),
  status               TEXT NOT NULL DEFAULT 'UPCOMING',
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ipos_status ON ipos (status);
CREATE INDEX IF NOT EXISTS idx_ipos_dates  ON ipos (open_date, close_date);

-- ──────────────────────────────────────────────────────────────
-- TABLE: applications
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS applications (
  id                      BIGSERIAL PRIMARY KEY,
  ipo_id                  BIGINT NOT NULL REFERENCES ipos(id) ON DELETE RESTRICT,
  application_type        TEXT NOT NULL DEFAULT 'OWN_DEMAT',
  applicant_person_id     BIGINT NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  demat_account_id        BIGINT NOT NULL REFERENCES demat_accounts(id) ON DELETE RESTRICT,
  funding_bank_account_id BIGINT NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
  funding_method          TEXT NOT NULL DEFAULT 'OWN_BANK_BLOCK',
  new_money_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  existing_balance_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  applied_lots            INT NOT NULL DEFAULT 1,
  allotted_lots           INT NOT NULL DEFAULT 0,
  ipo_price               NUMERIC(12,2) NOT NULL,
  lot_size_snapshot       INT NOT NULL DEFAULT 1,
  blocked_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  investment_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  refund_amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  application_status      TEXT NOT NULL DEFAULT 'APPLIED',
  money_status            TEXT NOT NULL DEFAULT 'BLOCKED',
  allotment_status        TEXT NOT NULL DEFAULT 'PENDING',
  listing_status          TEXT NOT NULL DEFAULT 'NOT_LISTED',
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apps_ipo        ON applications (ipo_id);
CREATE INDEX IF NOT EXISTS idx_apps_person     ON applications (applicant_person_id);
CREATE INDEX IF NOT EXISTS idx_apps_allotment  ON applications (allotment_status);
CREATE INDEX IF NOT EXISTS idx_apps_demat      ON applications (demat_account_id);

-- ──────────────────────────────────────────────────────────────
-- TABLE: allocations
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS allocations (
  id                     BIGSERIAL PRIMARY KEY,
  allocation_id          TEXT NOT NULL UNIQUE,
  amount                 NUMERIC(15,2) NOT NULL,
  owner_id               TEXT NOT NULL DEFAULT 'SELF',
  current_holder_type    TEXT NOT NULL DEFAULT 'BANK',
  current_holder_id      BIGINT,
  purpose                TEXT NOT NULL DEFAULT 'UNALLOCATED',
  ipo_id                 BIGINT REFERENCES ipos(id) ON DELETE SET NULL,
  application_id         BIGINT REFERENCES applications(id) ON DELETE SET NULL,
  origin_bank_account_id BIGINT REFERENCES bank_accounts(id) ON DELETE SET NULL,
  status                 TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allocs_status  ON allocations (status);
CREATE INDEX IF NOT EXISTS idx_allocs_purpose ON allocations (purpose);
CREATE INDEX IF NOT EXISTS idx_allocs_holder  ON allocations (current_holder_type, current_holder_id);
CREATE INDEX IF NOT EXISTS idx_allocs_app     ON allocations (application_id);
CREATE INDEX IF NOT EXISTS idx_allocs_ipo     ON allocations (ipo_id);

-- ──────────────────────────────────────────────────────────────
-- TABLE: transactions
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id                       BIGSERIAL PRIMARY KEY,
  transaction_type         TEXT NOT NULL,
  amount                   NUMERIC(15,2) NOT NULL,
  date                     DATE NOT NULL DEFAULT CURRENT_DATE,
  from_bank_account_id     BIGINT REFERENCES bank_accounts(id) ON DELETE SET NULL,
  to_bank_account_id       BIGINT REFERENCES bank_accounts(id) ON DELETE SET NULL,
  from_person_id           BIGINT REFERENCES people(id) ON DELETE SET NULL,
  to_person_id             BIGINT REFERENCES people(id) ON DELETE SET NULL,
  ipo_id                   BIGINT REFERENCES ipos(id) ON DELETE SET NULL,
  application_id           BIGINT REFERENCES applications(id) ON DELETE SET NULL,
  related_transaction_id   BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  utr                      TEXT UNIQUE,
  notes                    TEXT,
  status                   TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txs_status     ON transactions (status);
CREATE INDEX IF NOT EXISTS idx_txs_type       ON transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_txs_date       ON transactions (date);
CREATE INDEX IF NOT EXISTS idx_txs_from_bank  ON transactions (from_bank_account_id);
CREATE INDEX IF NOT EXISTS idx_txs_to_bank    ON transactions (to_bank_account_id);
CREATE INDEX IF NOT EXISTS idx_txs_ipo        ON transactions (ipo_id);

-- ──────────────────────────────────────────────────────────────
-- TABLE: holdings
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS holdings (
  id                 BIGSERIAL PRIMARY KEY,
  ipo_id             BIGINT NOT NULL REFERENCES ipos(id) ON DELETE RESTRICT,
  person_id          BIGINT NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  demat_account_id   BIGINT NOT NULL REFERENCES demat_accounts(id) ON DELETE RESTRICT,
  application_id     BIGINT REFERENCES applications(id) ON DELETE SET NULL,
  shares             INT NOT NULL DEFAULT 0,
  average_cost       NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_value      NUMERIC(15,2) NOT NULL DEFAULT 0,
  unrealized_profit  NUMERIC(15,2) NOT NULL DEFAULT 0,
  unrealized_roi     NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holdings_ipo    ON holdings (ipo_id);
CREATE INDEX IF NOT EXISTS idx_holdings_person ON holdings (person_id);
CREATE INDEX IF NOT EXISTS idx_holdings_demat  ON holdings (demat_account_id);
CREATE INDEX IF NOT EXISTS idx_holdings_app    ON holdings (application_id);

-- ──────────────────────────────────────────────────────────────
-- TABLE: sales
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales (
  id                          BIGSERIAL PRIMARY KEY,
  holding_id                  BIGINT NOT NULL,
  ipo_id                      BIGINT REFERENCES ipos(id) ON DELETE SET NULL,
  person_id                   BIGINT REFERENCES people(id) ON DELETE SET NULL,
  shares_sold                 INT NOT NULL DEFAULT 0,
  sell_price                  NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_basis                  NUMERIC(12,2) NOT NULL DEFAULT 0,
  charges                     NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_sale_value            NUMERIC(15,2) NOT NULL DEFAULT 0,
  realized_pnl                NUMERIC(15,2) NOT NULL DEFAULT 0,
  our_profit_share            NUMERIC(15,2),
  friend_profit_share         NUMERIC(15,2) DEFAULT 0,
  date                        DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_to_bank_account_id BIGINT REFERENCES bank_accounts(id) ON DELETE SET NULL,
  utr                         TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_ipo    ON sales (ipo_id);
CREATE INDEX IF NOT EXISTS idx_sales_person ON sales (person_id);
CREATE INDEX IF NOT EXISTS idx_sales_date   ON sales (date);

-- ──────────────────────────────────────────────────────────────
-- TABLE: journey_events
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS journey_events (
  id              BIGSERIAL PRIMARY KEY,
  allocation_id   TEXT NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  event_type      TEXT NOT NULL,
  description     TEXT,
  transaction_id  BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  application_id  BIGINT REFERENCES applications(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journey_alloc ON journey_events (allocation_id);
CREATE INDEX IF NOT EXISTS idx_journey_app   ON journey_events (application_id);
CREATE INDEX IF NOT EXISTS idx_journey_date  ON journey_events (date);

-- ──────────────────────────────────────────────────────────────
-- FUNCTION + TRIGGER: Auto-refresh holdings when IPO price updates
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION refresh_holdings_from_ipos()
RETURNS TRIGGER AS $$
BEGIN
  -- When current_market_price changes on an IPO, update all its holdings
  IF NEW.current_market_price IS DISTINCT FROM OLD.current_market_price
     AND NEW.current_market_price IS NOT NULL THEN
    UPDATE holdings
    SET
      current_price     = NEW.current_market_price,
      current_value     = shares * NEW.current_market_price,
      unrealized_profit = (shares * NEW.current_market_price) - (shares * average_cost),
      unrealized_roi    = CASE
                            WHEN average_cost > 0
                            THEN ((NEW.current_market_price - average_cost) / average_cost) * 100
                            ELSE 0
                          END,
      updated_at        = NOW()
    WHERE ipo_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_holdings ON ipos;
CREATE TRIGGER trg_refresh_holdings
  AFTER UPDATE ON ipos
  FOR EACH ROW
  EXECUTE FUNCTION refresh_holdings_from_ipos();

-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE people          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE demat_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_events  ENABLE ROW LEVEL SECURITY;

-- Permissive policy: authenticated users can do everything
CREATE POLICY "Authenticated full access" ON people          FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON bank_accounts   FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON demat_accounts  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON ipos            FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON applications    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON allocations     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON transactions    FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON holdings        FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON sales           FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated full access" ON journey_events  FOR ALL USING (auth.role() = 'authenticated');

-- Anon full access for dev mode (REMOVE IN PRODUCTION)
CREATE POLICY "Anon dev access" ON people          FOR ALL USING (true);
CREATE POLICY "Anon dev access" ON bank_accounts   FOR ALL USING (true);
CREATE POLICY "Anon dev access" ON demat_accounts  FOR ALL USING (true);
CREATE POLICY "Anon dev access" ON ipos            FOR ALL USING (true);
CREATE POLICY "Anon dev access" ON applications    FOR ALL USING (true);
CREATE POLICY "Anon dev access" ON allocations     FOR ALL USING (true);
CREATE POLICY "Anon dev access" ON transactions    FOR ALL USING (true);
CREATE POLICY "Anon dev access" ON holdings        FOR ALL USING (true);
CREATE POLICY "Anon dev access" ON sales           FOR ALL USING (true);
CREATE POLICY "Anon dev access" ON journey_events  FOR ALL USING (true);
