-- 1. blocks 테이블 타입 변경
ALTER TABLE blocks ALTER COLUMN type TYPE TEXT;
ALTER TABLE blocks ALTER COLUMN question_type TYPE TEXT;

-- 2. blocks 테이블에 누락된 컬럼 추가
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS options TEXT[];
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS custom_tags TEXT[];
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS subtype TEXT;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS chapter TEXT;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS image_data TEXT;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS linked_blocks UUID[];

-- 3. blocks 테이블의 answer를 correct_answer로 변경
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blocks' AND column_name = 'answer') THEN
    ALTER TABLE blocks RENAME COLUMN answer TO correct_answer;
  END IF;
END $$;

-- 4. blocks 테이블의 question_type 제거
ALTER TABLE blocks DROP COLUMN IF EXISTS question_type;

-- 5. folders 테이블 생성
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

-- 6. materials 테이블 수정 (이미 존재하므로 ALTER TABLE 사용)
-- 먼저 USER-DEFINED 타입을 TEXT로 변경
ALTER TABLE materials ALTER COLUMN type TYPE TEXT USING type::TEXT;

-- 누락된 컬럼 추가
ALTER TABLE materials ADD COLUMN IF NOT EXISTS folder_id UUID;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS original_filename TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploaded';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '미분류';
ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_extracted BOOLEAN DEFAULT FALSE;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS extracted_count INTEGER DEFAULT 0;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS extraction_date TIMESTAMPTZ;

-- folder_id 외래키 추가 (folders 테이블이 생성된 후)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'materials_folder_id_fkey'
  ) THEN
    ALTER TABLE materials 
    ADD CONSTRAINT materials_folder_id_fkey 
    FOREIGN KEY (folder_id) 
    REFERENCES folders(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- 7. activity_logs 테이블 생성
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 인덱스 생성
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

-- 9. RLS 활성화
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 10. RLS 정책 생성
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

-- 11. blocks 테이블의 material_id 외래키 추가
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