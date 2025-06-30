-- 기존 Storage 정책 삭제

DROP POLICY IF EXISTS "Auth users can upload to materials-original" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can view materials-original" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can update materials-original" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete materials-original" ON storage.objects;

DROP POLICY IF EXISTS "Auth users can upload to materials-processed" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can view materials-processed" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can update materials-processed" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete materials-processed" ON storage.objects;

DROP POLICY IF EXISTS "Auth users can upload to extracted-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can view extracted-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can update extracted-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete extracted-images" ON storage.objects;

-- 다른 이름의 정책도 삭제 (있을 수 있음)
DROP POLICY IF EXISTS "Anyone can upload to materials-original" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view materials-original" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update materials-original" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete from materials-original" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete files" ON storage.objects;