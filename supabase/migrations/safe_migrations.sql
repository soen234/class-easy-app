-- ============================================
-- 안전한 마이그레이션 스크립트
-- 이미 존재하는 객체는 건너뜁니다
-- ============================================

-- 1. blocks 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  options TEXT[],
  correct_answer TEXT,
  difficulty TEXT DEFAULT 'medium',
  tags TEXT[],
  custom_tags TEXT[],
  page_number INTEGER,
  position JSONB,
  subtype TEXT,
  score INTEGER,
  chapter TEXT,
  image_data TEXT,
  linked_blocks UUID[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. folders 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  folder_type TEXT DEFAULT 'materials',
  color TEXT DEFAULT '#gray',
  icon TEXT,
  path_tokens UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. materials 테이블이 없으면 생성
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

-- 4. activity_logs 테이블이 없으면 생성
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 인덱스 생성 (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_blocks_user_id ON blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_material_id ON blocks(material_id);
CREATE INDEX IF NOT EXISTS idx_blocks_type ON blocks(type);
CREATE INDEX IF NOT EXISTS idx_blocks_difficulty ON blocks(difficulty);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_folder_type ON folders(folder_type);

CREATE INDEX IF NOT EXISTS idx_materials_user_id ON materials(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_folder_id ON materials(folder_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_subject ON materials(subject);
CREATE INDEX IF NOT EXISTS idx_materials_is_extracted ON materials(is_extracted);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- 6. RLS 활성화
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS 정책 생성 (이미 존재하면 삭제 후 재생성)
-- blocks 정책
DROP POLICY IF EXISTS "Users can view own blocks" ON blocks;
CREATE POLICY "Users can view own blocks" ON blocks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own blocks" ON blocks;
CREATE POLICY "Users can create own blocks" ON blocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own blocks" ON blocks;
CREATE POLICY "Users can update own blocks" ON blocks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own blocks" ON blocks;
CREATE POLICY "Users can delete own blocks" ON blocks
  FOR DELETE USING (auth.uid() = user_id);

-- folders 정책
DROP POLICY IF EXISTS "Users can view own folders" ON folders;
CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own folders" ON folders;
CREATE POLICY "Users can create own folders" ON folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own folders" ON folders;
CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own folders" ON folders;
CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE USING (auth.uid() = user_id);

-- materials 정책
DROP POLICY IF EXISTS "Users can view own materials" ON materials;
CREATE POLICY "Users can view own materials" ON materials
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own materials" ON materials;
CREATE POLICY "Users can create own materials" ON materials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own materials" ON materials;
CREATE POLICY "Users can update own materials" ON materials
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own materials" ON materials;
CREATE POLICY "Users can delete own materials" ON materials
  FOR DELETE USING (auth.uid() = user_id);

-- activity_logs 정책
DROP POLICY IF EXISTS "Users can view own activity logs" ON activity_logs;
CREATE POLICY "Users can view own activity logs" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own activity logs" ON activity_logs;
CREATE POLICY "Users can create own activity logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. 외래키 제약조건 추가 (없으면 추가)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'blocks_material_id_fkey'
  ) THEN
    ALTER TABLE blocks 
    ADD CONSTRAINT blocks_material_id_fkey 
    FOREIGN KEY (material_id) 
    REFERENCES materials(id) 
    ON DELETE CASCADE;
  END IF;
END $$;