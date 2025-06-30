-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  avatar_url text,
  created_at timestamp with time zone default now()
);

-- Create folders table
create table if not exists public.folders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null,
  folder_type text default 'materials',
  color text,
  icon text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create materials table
create table if not exists public.materials (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null,
  original_filename text,
  file_path text,
  file_size bigint,
  file_type text,
  mime_type text,
  status text default 'uploaded',
  metadata jsonb default '{}'::jsonb,
  type text default 'original',
  subject text,
  is_extracted boolean default false,
  extracted_count integer default 0,
  extraction_date timestamp with time zone,
  pages integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create question_bank table
create table if not exists public.question_bank (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  material_id uuid references public.materials(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  type text not null,
  title text,
  content text,
  format text,
  answer text,
  tags text[] default '{}',
  page integer,
  extracted_text text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes for better performance
create index if not exists folders_user_id_idx on public.folders(user_id);
create index if not exists folders_parent_id_idx on public.folders(parent_id);
create index if not exists materials_user_id_idx on public.materials(user_id);
create index if not exists materials_folder_id_idx on public.materials(folder_id);
create index if not exists question_bank_user_id_idx on public.question_bank(user_id);
create index if not exists question_bank_material_id_idx on public.question_bank(material_id);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.materials enable row level security;
alter table public.question_bank enable row level security;

-- RLS Policies for profiles
create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Users can insert own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);

-- RLS Policies for folders
create policy "Users can view own folders" 
  on public.folders for select 
  using (auth.uid() = user_id);

create policy "Users can insert own folders" 
  on public.folders for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own folders" 
  on public.folders for update 
  using (auth.uid() = user_id);

create policy "Users can delete own folders" 
  on public.folders for delete 
  using (auth.uid() = user_id);

-- RLS Policies for materials
create policy "Users can view own materials" 
  on public.materials for select 
  using (auth.uid() = user_id);

create policy "Users can insert own materials" 
  on public.materials for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own materials" 
  on public.materials for update 
  using (auth.uid() = user_id);

create policy "Users can delete own materials" 
  on public.materials for delete 
  using (auth.uid() = user_id);

-- RLS Policies for question_bank
create policy "Users can view own questions" 
  on public.question_bank for select 
  using (auth.uid() = user_id);

create policy "Users can insert own questions" 
  on public.question_bank for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own questions" 
  on public.question_bank for update 
  using (auth.uid() = user_id);

create policy "Users can delete own questions" 
  on public.question_bank for delete 
  using (auth.uid() = user_id);

-- Function to handle new user creation
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger handle_folders_updated_at before update on public.folders
  for each row execute procedure public.handle_updated_at();

create trigger handle_materials_updated_at before update on public.materials
  for each row execute procedure public.handle_updated_at();

create trigger handle_question_bank_updated_at before update on public.question_bank
  for each row execute procedure public.handle_updated_at();