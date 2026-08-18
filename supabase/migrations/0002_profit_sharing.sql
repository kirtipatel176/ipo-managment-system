-- Add profit sharing columns to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS our_profit_share NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS friend_profit_share NUMERIC NOT NULL DEFAULT 0;

-- Backfill existing sales
UPDATE sales 
SET our_profit_share = realized_pnl 
WHERE our_profit_share = 0 AND friend_profit_share = 0;
