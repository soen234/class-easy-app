-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE material_type AS ENUM ('original', 'lesson');
CREATE TYPE block_type AS ENUM ('problem', 'explanation', 'passage', 'concept');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'subjective', 'essay', 'ox');

-- Materials table
CREATE TABLE materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type material_type DEFAULT 'original',
  file_path TEXT,
  file_size BIGINT,
  file_type TEXT,
  pages INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Blocks table (문항, 지문, 해설, 개념)
CREATE TABLE blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  type block_type NOT NULL,
  question_type question_type,
  answer TEXT,
  page_number INTEGER,
  position JSONB, -- {x, y, width, height} for extracted position
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tags table
CREATE TABLE tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, name)
);

-- Block tags junction table
CREATE TABLE block_tags (
  block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (block_id, tag_id)
);

-- Block relationships table (문항-해설, 문항-지문 연결)
CREATE TABLE block_relationships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parent_block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  child_block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'explanation', 'passage', 'related'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(parent_block_id, child_block_id, relationship_type)
);

-- Templates table
CREATE TABLE templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'vertical', 'horizontal'
  layout_config JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_materials_user_id ON materials(user_id);
CREATE INDEX idx_materials_type ON materials(type);
CREATE INDEX idx_blocks_user_id ON blocks(user_id);
CREATE INDEX idx_blocks_material_id ON blocks(material_id);
CREATE INDEX idx_blocks_type ON blocks(type);
CREATE INDEX idx_tags_user_id ON tags(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Materials policies
CREATE POLICY "Users can view own materials" ON materials FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own materials" ON materials FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own materials" ON materials FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own materials" ON materials FOR DELETE USING (auth.uid() = user_id);

-- Blocks policies
CREATE POLICY "Users can view own blocks" ON blocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own blocks" ON blocks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own blocks" ON blocks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own blocks" ON blocks FOR DELETE USING (auth.uid() = user_id);

-- Tags policies
CREATE POLICY "Users can view own tags" ON tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON tags FOR DELETE USING (auth.uid() = user_id);

-- Block tags policies
CREATE POLICY "Users can view own block_tags" ON block_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM blocks WHERE blocks.id = block_tags.block_id AND blocks.user_id = auth.uid())
);
CREATE POLICY "Users can insert own block_tags" ON block_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM blocks WHERE blocks.id = block_tags.block_id AND blocks.user_id = auth.uid())
);
CREATE POLICY "Users can delete own block_tags" ON block_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM blocks WHERE blocks.id = block_tags.block_id AND blocks.user_id = auth.uid())
);

-- Block relationships policies
CREATE POLICY "Users can view own block_relationships" ON block_relationships FOR SELECT USING (
  EXISTS (SELECT 1 FROM blocks WHERE blocks.id = block_relationships.parent_block_id AND blocks.user_id = auth.uid())
);
CREATE POLICY "Users can insert own block_relationships" ON block_relationships FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM blocks WHERE blocks.id = block_relationships.parent_block_id AND blocks.user_id = auth.uid())
);
CREATE POLICY "Users can delete own block_relationships" ON block_relationships FOR DELETE USING (
  EXISTS (SELECT 1 FROM blocks WHERE blocks.id = block_relationships.parent_block_id AND blocks.user_id = auth.uid())
);

-- Templates policies
CREATE POLICY "Users can view own templates and public templates" ON templates FOR SELECT USING (
  auth.uid() = user_id OR is_public = TRUE
);
CREATE POLICY "Users can insert own templates" ON templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own templates" ON templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own templates" ON templates FOR DELETE USING (auth.uid() = user_id);

-- Create storage buckets (이건 Supabase 대시보드에서 수동으로 생성해야 함)
-- 1. materials bucket (for uploaded files)
-- 2. generated bucket (for generated documents)
-- 3. thumbnails bucket (for file thumbnails)