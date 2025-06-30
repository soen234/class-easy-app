-- Storage 정책 설정 (올바른 문법)

-- materials-original 버킷 정책
CREATE POLICY "Auth users can upload to materials-original"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'materials-original');

CREATE POLICY "Auth users can view materials-original"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'materials-original');

CREATE POLICY "Auth users can update materials-original"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'materials-original');

CREATE POLICY "Auth users can delete materials-original"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'materials-original');

-- materials-processed 버킷 정책
CREATE POLICY "Auth users can upload to materials-processed"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'materials-processed');

CREATE POLICY "Auth users can view materials-processed"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'materials-processed');

CREATE POLICY "Auth users can update materials-processed"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'materials-processed');

CREATE POLICY "Auth users can delete materials-processed"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'materials-processed');

-- extracted-images 버킷 정책
CREATE POLICY "Auth users can upload to extracted-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'extracted-images');

CREATE POLICY "Auth users can view extracted-images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'extracted-images');

CREATE POLICY "Auth users can update extracted-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'extracted-images');

CREATE POLICY "Auth users can delete extracted-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'extracted-images');