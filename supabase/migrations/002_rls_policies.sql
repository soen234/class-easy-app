-- Row Level Security 정책 설정

-- 1. Profiles 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Folders 정책
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders" ON folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Materials 정책
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own materials" ON materials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own materials" ON materials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own materials" ON materials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own materials" ON materials
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Blocks 정책
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks" ON blocks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blocks" ON blocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blocks" ON blocks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own blocks" ON blocks
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Templates 정책
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 템플릿을 볼 수 있음
CREATE POLICY "Anyone can view templates" ON templates
  FOR SELECT USING (true);

-- 생성자만 자신의 템플릿을 수정할 수 있음
CREATE POLICY "Creators can update own templates" ON templates
  FOR UPDATE USING (auth.uid() = creator_id);

-- 인증된 사용자는 템플릿을 생성할 수 있음
CREATE POLICY "Authenticated users can create templates" ON templates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 생성자만 자신의 템플릿을 삭제할 수 있음
CREATE POLICY "Creators can delete own templates" ON templates
  FOR DELETE USING (auth.uid() = creator_id);

-- 6. Projects 정책
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 소유자와 협력자는 프로젝트를 볼 수 있음
CREATE POLICY "Users can view own and shared projects" ON projects
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = ANY(collaborators) OR
    is_public = true
  );

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 소유자와 협력자는 프로젝트를 수정할 수 있음
CREATE POLICY "Users can update own and shared projects" ON projects
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() = ANY(collaborators)
  );

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Project Versions 정책
ALTER TABLE project_versions ENABLE ROW LEVEL SECURITY;

-- 프로젝트 소유자와 협력자만 버전 히스토리를 볼 수 있음
CREATE POLICY "Users can view project versions" ON project_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_versions.project_id 
      AND (projects.user_id = auth.uid() OR auth.uid() = ANY(projects.collaborators))
    )
  );

-- 프로젝트 소유자와 협력자만 버전을 생성할 수 있음
CREATE POLICY "Users can create project versions" ON project_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_versions.project_id 
      AND (projects.user_id = auth.uid() OR auth.uid() = ANY(projects.collaborators))
    )
  );

-- 8. Activity Logs 정책
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 활동 로그만 볼 수 있음
CREATE POLICY "Users can view own activity logs" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 시스템만 활동 로그를 생성할 수 있음 (service role)
CREATE POLICY "System can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);