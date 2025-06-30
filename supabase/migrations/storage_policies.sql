-- Storage 정책 설정
-- materials-original 버킷에 대한 정책

-- 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files" ON storage.objects;

-- 인증된 사용자는 materials-original 버킷에 업로드 가능
CREATE POLICY "Users can upload files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'materials-original');

-- 인증된 사용자는 materials-original 버킷의 파일 조회 가능
CREATE POLICY "Users can view files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'materials-original');

-- 인증된 사용자는 materials-original 버킷의 파일 수정 가능
CREATE POLICY "Users can update files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'materials-original');

-- 인증된 사용자는 materials-original 버킷의 파일 삭제 가능
CREATE POLICY "Users can delete files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'materials-original');