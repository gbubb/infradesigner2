-- Fix the trigger function to use camelCase column names
-- The update_updated_at_column function still references the old snake_case column name

-- Drop and recreate the trigger function with camelCase column reference
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: The triggers themselves don't need to be recreated as they just call the function
-- The existing triggers will automatically use the updated function