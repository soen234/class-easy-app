-- folders 테이블 생성
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_folder_type ON folders(folder_type);

-- RLS 정책
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 폴더만 볼 수 있음
CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 폴더를 생성할 수 있음
CREATE POLICY "Users can create own folders" ON folders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 폴더를 수정할 수 있음
CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 사용자는 자신의 폴더를 삭제할 수 있음
CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE
  USING (auth.uid() = user_id);

-- activity_logs 테이블 생성 (옵션)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- RLS 정책
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 활동 로그만 볼 수 있음
CREATE POLICY "Users can view own activity logs" ON activity_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 활동 로그를 생성할 수 있음
CREATE POLICY "Users can create own activity logs" ON activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);