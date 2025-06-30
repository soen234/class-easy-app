-- Storage 버킷 RLS 정책 설정
-- 주의: storage.objects 테이블에 정책을 추가합니다

-- 1. materials-original 버킷 정책

-- 인증된 사용자가 자신의 폴더에 파일 업로드
CREATE POLICY "Auth users can upload to materials-original"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'materials-original' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 인증된 사용자가 자신의 파일 조회
CREATE POLICY "Auth users can view own files in materials-original"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'materials-original' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 인증된 사용자가 자신의 파일 수정
CREATE POLICY "Auth users can update own files in materials-original"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'materials-original' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 인증된 사용자가 자신의 파일 삭제
CREATE POLICY "Auth users can delete own files in materials-original"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'materials-original' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. materials-processed 버킷 정책 (동일하게 적용)

CREATE POLICY "Auth users can upload to materials-processed"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'materials-processed' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Auth users can view own files in materials-processed"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'materials-processed' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Auth users can update own files in materials-processed"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'materials-processed' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Auth users can delete own files in materials-processed"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'materials-processed' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. extracted-images 버킷 정책

CREATE POLICY "Auth users can upload to extracted-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'extracted-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Auth users can view own files in extracted-images"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'extracted-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Auth users can update own files in extracted-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'extracted-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Auth users can delete own files in extracted-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'extracted-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);