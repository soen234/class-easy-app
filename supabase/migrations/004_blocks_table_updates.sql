-- Add missing fields to blocks table

-- Add subtype field for more specific block types
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS subtype TEXT;

-- Add score field for question scoring
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS score INTEGER;

-- Add difficulty field
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';

-- Add tags array field
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add custom_tags array field
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS custom_tags TEXT[] DEFAULT '{}';

-- Add chapter field
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS chapter TEXT;

-- Add linked_blocks field for storing related block IDs
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS linked_blocks UUID[] DEFAULT '{}';

-- Add image_data field for storing captured image data
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS image_data TEXT;

-- Add options field for multiple choice questions
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS options JSONB;

-- Rename answer to correct_answer for clarity
ALTER TABLE blocks RENAME COLUMN answer TO correct_answer;

-- Update type column to use TEXT instead of ENUM for flexibility
ALTER TABLE blocks ALTER COLUMN type TYPE TEXT;

-- Drop the old enum type if it exists
DROP TYPE IF EXISTS block_type CASCADE;

-- Remove the type constraint as we handle passages and explanations in linked_blocks table
-- ALTER TABLE blocks ADD CONSTRAINT blocks_type_check 
-- CHECK (type IN ('question', 'concept'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blocks_subtype ON blocks(subtype);
CREATE INDEX IF NOT EXISTS idx_blocks_difficulty ON blocks(difficulty);
CREATE INDEX IF NOT EXISTS idx_blocks_chapter ON blocks(chapter);
CREATE INDEX IF NOT EXISTS idx_blocks_tags ON blocks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_blocks_custom_tags ON blocks USING GIN(custom_tags);