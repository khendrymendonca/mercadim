-- Migrate: Add Meal Allowance table
CREATE TABLE IF NOT EXISTS meal_allowances (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    month_year TEXT NOT NULL UNIQUE, -- Store as 'YYYY-MM'
    amount DECIMAL(10,2) NOT NULL
);

ALTER TABLE meal_allowances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all meal_allowances" ON meal_allowances FOR ALL USING (true) WITH CHECK (true);
