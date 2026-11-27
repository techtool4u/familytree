-- OurFamilyTree shared family trees: run this once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: it only creates what is missing and replaces functions/policies.
--
-- Model
--   trees         one row per shared tree
--   tree_members  who can open a tree, with a role: owner | editor | viewer
--   people        one row per person (the Person JSON in `data`), soft-deleted with `deleted`
--   invites       share links: whoever opens one (and signs in) joins with its role
-- Every table is protected by row-level security, so people only ever see trees they belong to.

create extension if not exists pgcrypto;

create table if not exists public.trees (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 200),
  focus_id    text,
  created_by  uuid not null default auth.uid() references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.tree_members (
  tree_id       uuid not null references public.trees on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  role          text not null check (role in ('owner', 'editor', 'viewer')),
  display_name  text not null default '',
  email         text,
  joined_at     timestamptz not null default now(),
  primary key (tree_id, user_id)
);
create index if not exists tree_members_user on public.tree_members (user_id);

create table if not exists public.people (
  tree_id     uuid not null references public.trees on delete cascade,
  id          text not null,
  data        jsonb not null,
  deleted     boolean not null default false,
  updated_by  uuid default auth.uid() references auth.users on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (tree_id, id)
);

create table if not exists public.invites (
  token       uuid primary key default gen_random_uuid(),
  tree_id     uuid not null references public.trees on delete cascade,
  role        text not null check (role in ('editor', 'viewer')),
  created_by  uuid not null default auth.uid() references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  revoked     boolean not null default false
);
create index if not exists invites_tree on public.invites (tree_id);

-- ---------- helpers (security definer so policies don't recurse) ----------

create or replace function public.tree_role(t uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from tree_members where tree_id = t and user_id = auth.uid()
$$;

create or replace function public.touch_updated() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_table_name = 'people' then new.updated_by := auth.uid(); end if;
  return new;
end $$;

drop trigger if exists people_touch on public.people;
create trigger people_touch before insert or update on public.people
  for each row execute function public.touch_updated();
drop trigger if exists trees_touch on public.trees;
create trigger trees_touch before update on public.trees
  for each row execute function public.touch_updated();

-- ---------- row-level security ----------

alter table public.trees        enable row level security;
alter table public.tree_members enable row level security;
alter table public.people       enable row level security;
alter table public.invites      enable row level security;

drop policy if exists trees_read   on public.trees;
drop policy if exists trees_edit   on public.trees;
drop policy if exists trees_delete on public.trees;
create policy trees_read   on public.trees for select using (public.tree_role(id) is not null);
create policy trees_edit   on public.trees for update using (public.tree_role(id) in ('owner', 'editor'));
create policy trees_delete on public.trees for delete using (public.tree_role(id) = 'owner');

drop policy if exists members_read   on public.tree_members;
drop policy if exists members_update on public.tree_members;
drop policy if exists members_delete on public.tree_members;
create policy members_read on public.tree_members for select using (public.tree_role(tree_id) is not null);
-- the owner can change other members' roles (never to owner) …
create policy members_update on public.tree_members for update
  using (public.tree_role(tree_id) = 'owner' and user_id <> auth.uid())
  with check (role in ('editor', 'viewer'));
-- … and remove them; anyone except the owner can leave
create policy members_delete on public.tree_members for delete
  using ((public.tree_role(tree_id) = 'owner' and user_id <> auth.uid()) or (user_id = auth.uid() and role <> 'owner'));

drop policy if exists people_read   on public.people;
drop policy if exists people_insert on public.people;
drop policy if exists people_update on public.people;
create policy people_read   on public.people for select using (public.tree_role(tree_id) is not null);
create policy people_insert on public.people for insert with check (public.tree_role(tree_id) in ('owner', 'editor'));
create policy people_update on public.people for update using (public.tree_role(tree_id) in ('owner', 'editor'));

drop policy if exists invites_owner on public.invites;
create policy invites_owner on public.invites for all
  using (public.tree_role(tree_id) = 'owner') with check (public.tree_role(tree_id) = 'owner');

-- ---------- actions ----------

-- Create a shared tree; the caller becomes its owner.
create or replace function public.create_tree(p_name text, p_focus text, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into trees (name, focus_id, created_by) values (p_name, p_focus, auth.uid()) returning id into t;
  insert into tree_members (tree_id, user_id, role, display_name, email)
    values (t, auth.uid(), 'owner', coalesce(p_display_name, ''), auth.jwt() ->> 'email');
  return t;
end $$;

-- Join a tree with an invite link. Existing members keep their role unless the link gives more.
create or replace function public.accept_invite(p_token uuid, p_display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv invites;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into inv from invites where token = p_token and not revoked;
  if not found then raise exception 'This invite link is no longer valid'; end if;
  insert into tree_members (tree_id, user_id, role, display_name, email)
    values (inv.tree_id, auth.uid(), inv.role, coalesce(p_display_name, ''), auth.jwt() ->> 'email')
  on conflict (tree_id, user_id) do update
    set role = case when tree_members.role = 'viewer' and excluded.role = 'editor' then 'editor' else tree_members.role end,
        display_name = case when excluded.display_name <> '' then excluded.display_name else tree_members.display_name end;
  return inv.tree_id;
end $$;

-- Update the caller's display name on every tree they belong to.
create or replace function public.set_my_name(p_display_name text)
returns void language sql security definer set search_path = public as $$
  update tree_members set display_name = p_display_name where user_id = auth.uid()
$$;

revoke all on function public.create_tree(text, text, text) from public, anon;
revoke all on function public.accept_invite(uuid, text) from public, anon;
revoke all on function public.set_my_name(text) from public, anon;
grant execute on function public.create_tree(text, text, text) to authenticated;
grant execute on function public.accept_invite(uuid, text) to authenticated;
grant execute on function public.set_my_name(text) to authenticated;
grant execute on function public.tree_role(uuid) to authenticated;

-- ---------- live updates ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'people') then
    alter publication supabase_realtime add table public.people;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'trees') then
    alter publication supabase_realtime add table public.trees;
  end if;
end $$;
