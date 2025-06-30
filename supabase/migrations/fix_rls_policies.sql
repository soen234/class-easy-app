-- RLS 정책 디버깅 및 수정

-- 1. 현재 사용자 확인 (테스트용)
SELECT auth.uid();

-- 2. folders 테이블의 RLS 정책을 더 명확하게 재생성
DROP POLICY IF EXISTS "Users can view own folders" ON folders;
DROP POLICY IF EXISTS "Users can create own folders" ON folders;
DROP POLICY IF EXISTS "Users can update own folders" ON folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON folders;

-- 사용자가 자신의 폴더를 볼 수 있음
CREATE POLICY "Users can view own folders" ON folders
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자가 자신의 폴더를 생성할 수 있음 (auth.uid()가 user_id와 일치해야 함)
CREATE POLICY "Users can create own folders" ON folders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자가 자신의 폴더를 수정할 수 있음
CREATE POLICY "Users can update own folders" ON folders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 사용자가 자신의 폴더를 삭제할 수 있음
CREATE POLICY "Users can delete own folders" ON folders
  FOR DELETE
  USING (auth.uid() = user_id);

-- 3. materials 테이블도 동일하게 수정
DROP POLICY IF EXISTS "Users can view own materials" ON materials;
DROP POLICY IF EXISTS "Users can create own materials" ON materials;
DROP POLICY IF EXISTS "Users can update own materials" ON materials;
DROP POLICY IF EXISTS "Users can delete own materials" ON materials;

CREATE POLICY "Users can view own materials" ON materials
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own materials" ON materials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own materials" ON materials
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own materials" ON materials
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. blocks 테이블도 동일하게 수정
DROP POLICY IF EXISTS "Users can view own blocks" ON blocks;
DROP POLICY IF EXISTS "Users can create own blocks" ON blocks;
DROP POLICY IF EXISTS "Users can update own blocks" ON blocks;
DROP POLICY IF EXISTS "Users can delete own blocks" ON blocks;

CREATE POLICY "Users can view own blocks" ON blocks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own blocks" ON blocks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blocks" ON blocks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own blocks" ON blocks
  FOR DELETE
  USING (auth.uid() = user_id);