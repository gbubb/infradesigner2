# Database Migration for Row Layout Feature

## Required Database Schema Change

To enable Row Layout persistence, you need to add a new column to the `designs` table in Supabase.

### SQL Migration Command

Execute this SQL command in your Supabase SQL Editor:

```sql
-- Add row_layout column to designs table
ALTER TABLE designs ADD COLUMN row_layout JSON;
```

### Verification

After running the migration, you can verify the column was added by checking the table structure:

```sql
-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'designs' 
AND column_name = 'row_layout';
```

### Note

This migration is backward compatible:
- Existing designs will have `row_layout` as `NULL`
- New designs with row layout configurations will store JSON data
- The application handles both cases gracefully

### Steps to Apply

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Paste and execute the ALTER TABLE command above
4. Deploy the updated application code
5. Row Layout configurations will now persist between sessions

### Rollback (if needed)

If you need to remove the column:

```sql
-- Remove row_layout column (WARNING: This will delete all row layout data)
ALTER TABLE designs DROP COLUMN row_layout;
```