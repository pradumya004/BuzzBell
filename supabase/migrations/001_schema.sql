-- Core tables. Every row is reachable only through RLS (see 002).

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_hue int not null default floor(random() * 360),
  is_guest boolean not null default false,
  is_bot boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('channel', 'dm')),
  slug text unique,
  name text,
  topic text check (char_length(topic) <= 140),
  is_public boolean not null default true,
  auto_join boolean not null default false,
  -- "<smaller uuid>:<larger uuid>" so a DM between two people exists once
  dm_key text unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check (
    (kind = 'channel' and slug is not null and name is not null and dm_key is null)
    or (kind = 'dm' and dm_key is not null and slug is null and not is_public)
  )
);

create table public.members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index members_user_idx on public.members (user_id);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 4000),
  attachment_path text,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  search tsvector generated always as (to_tsvector('simple', body)) stored,
  check (deleted_at is not null or char_length(btrim(body)) > 0 or attachment_path is not null)
);
create index messages_conv_created_idx on public.messages (conversation_id, created_at desc);
create index messages_search_idx on public.messages using gin (search);

create table public.reactions (
  message_id bigint not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '🎉', '👀', '🔥')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
