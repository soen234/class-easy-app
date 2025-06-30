-- Storage 버킷 설정 (Supabase Dashboard에서 실행하거나 API로 생성)
-- 이 파일은 참고용이며, 실제 버킷 생성은 Supabase Dashboard나 Management API를 통해 수행해야 합니다.

-- 버킷 생성 예시 (SQL이 아닌 Supabase Dashboard에서 수행):
-- 1. materials-original: 원본 파일 저장
--    - Public: false
--    - File size limit: 50MB
--    - Allowed MIME types: application/pdf, image/*
--
-- 2. materials-processed: 처리된 파일 (썸네일, 변환된 이미지)
--    - Public: true (CDN 캐싱 활용)
--    - File size limit: 10MB
--    - Allowed MIME types: image/*
--
-- 3. projects-exports: 내보낸 파일
--    - Public: false
--    - File size limit: 100MB
--    - Allowed MIME types: application/pdf, image/*, application/zip
--
-- 4. user-avatars: 사용자 프로필 이미지
--    - Public: true
--    - File size limit: 5MB
--    - Allowed MIME types: image/*
--
-- 5. templates-preview: 템플릿 미리보기
--    - Public: true
--    - File size limit: 5MB
--    - Allowed MIME types: image/*

-- Storage 정책 설정을 위한 함수
CREATE OR REPLACE FUNCTION storage.filename_from_path(path text)
RETURNS text AS $$
BEGIN
  RETURN split_part(path, '/', array_length(string_to_array(path, '/'), 1));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION storage.foldername_from_path(path text)
RETURNS text AS $$
BEGIN
  RETURN split_part(path, '/', 1);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION storage.extension_from_path(path text)
RETURNS text AS $$
BEGIN
  RETURN split_part(storage.filename_from_path(path), '.', 2);
END;
$$ LANGUAGE plpgsql;