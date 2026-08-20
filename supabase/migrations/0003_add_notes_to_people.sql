-- Add notes column to people table to store custom messages (e.g. technical issues, missing money understanding, discrepancies)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='people' AND column_name='notes') THEN
        ALTER TABLE people ADD COLUMN notes text;
    END IF;
END $$;
