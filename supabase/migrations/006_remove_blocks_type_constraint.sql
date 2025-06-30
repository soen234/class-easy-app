-- Remove the blocks_type_check constraint if it exists
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_type_check;