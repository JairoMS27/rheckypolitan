
-- Roles
create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "user_roles select self" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Issues
create table public.issues (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  title text not null,
  published_at date not null,
  cover_path text,
  page_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.issues enable row level security;

create policy "issues public read" on public.issues
  for select using (true);
create policy "issues admin insert" on public.issues
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "issues admin update" on public.issues
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "issues admin delete" on public.issues
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Pages
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  index int not null,
  image_path text not null,
  created_at timestamptz not null default now(),
  unique (issue_id, index)
);

create index pages_issue_idx on public.pages(issue_id, index);

alter table public.pages enable row level security;

create policy "pages public read" on public.pages
  for select using (true);
create policy "pages admin insert" on public.pages
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "pages admin update" on public.pages
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "pages admin delete" on public.pages
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('magazines', 'magazines', true);

create policy "magazines public read" on storage.objects
  for select using (bucket_id = 'magazines');
create policy "magazines admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'magazines' and public.has_role(auth.uid(), 'admin'));
create policy "magazines admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'magazines' and public.has_role(auth.uid(), 'admin'));
create policy "magazines admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'magazines' and public.has_role(auth.uid(), 'admin'));
