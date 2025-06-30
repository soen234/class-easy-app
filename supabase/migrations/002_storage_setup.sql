-- Storage bucket setup
-- This should be run in the Supabase dashboard SQL editor

-- Create storage buckets
insert into storage.buckets (id, name, public)
values ('materials-original', 'materials-original', false)
on conflict (id) do nothing;

-- Storage policies for materials-original bucket
create policy "Users can upload own files"
  on storage.objects for insert
  with check (bucket_id = 'materials-original' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view own files"
  on storage.objects for select
  using (bucket_id = 'materials-original' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own files"
  on storage.objects for update
  using (bucket_id = 'materials-original' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own files"
  on storage.objects for delete
  using (bucket_id = 'materials-original' and auth.uid()::text = (storage.foldername(name))[1]);