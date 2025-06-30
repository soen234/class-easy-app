-- Create a new table for linked blocks (passages and explanations)
CREATE TABLE IF NOT EXISTS linked_blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('passage', 'explanation')),
  content TEXT,
  image_data TEXT,
  position JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_linked_blocks_user_id ON linked_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_blocks_parent_block_id ON linked_blocks(parent_block_id);
CREATE INDEX IF NOT EXISTS idx_linked_blocks_type ON linked_blocks(type);

-- Enable Row Level Security
ALTER TABLE linked_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for linked_blocks
CREATE POLICY "Users can view own linked blocks" ON linked_blocks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own linked blocks" ON linked_blocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own linked blocks" ON linked_blocks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own linked blocks" ON linked_blocks
  FOR DELETE USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE TRIGGER handle_linked_blocks_updated_at BEFORE UPDATE ON linked_blocks
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();