-- 간단한 Storage 정책 (모든 인증된 사용자 허용)

-- materials-original 버킷
CREATE POLICY "Anyone can upload to materials-original"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'materials-original');

CREATE POLICY "Anyone can view materials-original"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'materials-original');

CREATE POLICY "Anyone can update materials-original"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'materials-original');

CREATE POLICY "Anyone can delete from materials-original"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'materials-original');

-- materials-processed 버킷
CREATE POLICY "Anyone can upload to materials-processed"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'materials-processed');

CREATE POLICY "Anyone can view materials-processed"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'materials-processed');

CREATE POLICY "Anyone can update materials-processed"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'materials-processed');

CREATE POLICY "Anyone can delete from materials-processed"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'materials-processed');

-- extracted-images 버킷
CREATE POLICY "Anyone can upload to extracted-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'extracted-images');

CREATE POLICY "Anyone can view extracted-images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'extracted-images');

CREATE POLICY "Anyone can update extracted-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'extracted-images');

CREATE POLICY "Anyone can delete from extracted-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'extracted-images');