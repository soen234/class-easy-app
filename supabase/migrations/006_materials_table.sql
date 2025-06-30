-- materials 테이블 생성
CREATE TABLE IF NOT EXISTS materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  original_filename TEXT,
  file_path TEXT,
  file_size BIGINT,
  file_type TEXT,
  mime_type TEXT,
  status TEXT DEFAULT 'uploaded',
  metadata JSONB,
  type TEXT DEFAULT 'original',
  subject TEXT DEFAULT '미분류',
  is_extracted BOOLEAN DEFAULT FALSE,
  extracted_count INTEGER DEFAULT 0,
  extraction_date TIMESTAMPTZ,
  pages INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON materials(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_folder_id ON materials(folder_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_subject ON materials(subject);
CREATE INDEX IF NOT EXISTS idx_materials_is_extracted ON materials(is_extracted);

-- RLS 정책
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 자료만 볼 수 있음
CREATE POLICY "Users can view own materials" ON materials
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 자료를 생성할 수 있음
CREATE POLICY "Users can create own materials" ON materials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 자료를 수정할 수 있음
CREATE POLICY "Users can update own materials" ON materials
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 사용자는 자신의 자료를 삭제할 수 있음
CREATE POLICY "Users can delete own materials" ON materials
  FOR DELETE
  USING (auth.uid() = user_id);