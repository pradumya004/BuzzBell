-- Signup, room creation, inbox, search, and message lifecycle triggers.

-- A profile for every auth user. Guests (anonymous sign-in) get a generated name.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  animals text[] := array['Otter','Falcon','Panda','Lynx','Koala','Heron','Fox','Orca','Ibis','Yak'];
  pick text := animals[1 + floor(random() * array_length(animals, 1))::int];
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  uname text;
begin
  uname := lower(coalesce(meta->>'username', case when new.is_anonymous then 'guest' else split_part(new.email, '@', 1) end));
  uname := left(regexp_replace(uname, '[^a-z0-9_]', '', 'g'), 17) || '_' || substr(md5(new.id::text), 1, 6);

  insert into profiles (id, username, display_name, is_guest)
  values (
    new.id,
    uname,
    coalesce(nullif(meta->>'display_name', ''), case when new.is_anonymous then 'Guest ' || pick else split_part(new.email, '@', 1) end),
    coalesce(new.is_anonymous, false)
  );

  insert into members (conversation_id, user_id)
  select id, new.id from conversations where auto_join;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Channels: slug from the name, creator becomes owner.
create or replace function public.create_channel(p_name text, p_topic text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_slug text := trim(both '-' from regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g'));
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if char_length(v_slug) not between 2 and 32 then raise exception 'channel name must be 2-32 letters or numbers'; end if;

  insert into conversations (kind, slug, name, topic, created_by)
  values ('channel', v_slug, v_slug, nullif(btrim(p_topic), ''), auth.uid())
  returning id into v_id;

  insert into members (conversation_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return v_id;
exception when unique_violation then
  raise exception 'a channel called #% already exists', v_slug;
end;
$$;

-- DMs are idempotent: the sorted pair is a unique key, so a race opens the same room.
create or replace function public.open_dm(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_key text;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_other = auth.uid() then raise exception 'cannot message yourself'; end if;
  if not exists (select 1 from profiles where id = p_other) then raise exception 'no such user'; end if;

  v_key := least(auth.uid(), p_other)::text || ':' || greatest(auth.uid(), p_other)::text;
  insert into conversations (kind, dm_key, is_public, created_by)
  values ('dm', v_key, false, auth.uid())
  on conflict (dm_key) do nothing;

  select id into v_id from conversations where dm_key = v_key;
  insert into members (conversation_id, user_id)
  values (v_id, auth.uid()), (v_id, p_other)
  on conflict do nothing;
  return v_id;
end;
$$;

-- Sidebar in one round trip: rooms I am in, last message, unread count.
-- security invoker, so RLS still applies to everything it reads.
create or replace function public.inbox()
returns table (
  id uuid, kind text, name text, topic text, peer_id uuid,
  last_message_at timestamptz, last_body text, last_author text, unread int
) language sql stable security invoker set search_path = public as $$
  select
    c.id, c.kind,
    coalesce(c.name, p.display_name) as name,
    c.topic,
    p.id as peer_id,
    c.last_message_at,
    lm.body, la.display_name,
    (select count(*)::int from messages m
      where m.conversation_id = c.id and m.created_at > me.last_read_at
        and m.author_id <> auth.uid() and m.deleted_at is null) as unread
  from members me
  join conversations c on c.id = me.conversation_id
  left join lateral (
    select mm.user_id from members mm
    where c.kind = 'dm' and mm.conversation_id = c.id and mm.user_id <> auth.uid() limit 1
  ) peer on true
  left join profiles p on p.id = peer.user_id
  left join lateral (
    select m.body, m.author_id from messages m
    where m.conversation_id = c.id and m.deleted_at is null
    order by m.created_at desc limit 1
  ) lm on true
  left join profiles la on la.id = lm.author_id
  where me.user_id = auth.uid()
  order by c.last_message_at desc;
$$;

-- Full-text search across every room the caller can read (RLS filters the rest).
create or replace function public.search_messages(q text)
returns table (id bigint, conversation_id uuid, body text, author text, created_at timestamptz, rank real)
language sql stable security invoker set search_path = public as $$
  select m.id, m.conversation_id, m.body, p.display_name, m.created_at,
         ts_rank(m.search, websearch_to_tsquery('simple', q)) as rank
  from messages m join profiles p on p.id = m.author_id
  where m.deleted_at is null and m.search @@ websearch_to_tsquery('simple', q)
  order by rank desc, m.created_at desc
  limit 30;
$$;

-- Spam guard for a public demo: max 8 messages per 10 seconds per user.
create or replace function public.guard_message_rate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select is_bot from profiles where id = new.author_id) then return new; end if;
  if (select count(*) from messages
      where author_id = new.author_id and created_at > now() - interval '10 seconds') >= 8 then
    raise exception 'slow down: too many messages' using errcode = 'P0429';
  end if;
  return new;
end;
$$;
create trigger messages_rate before insert on public.messages
  for each row execute function public.guard_message_rate();

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  update members set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.author_id;
  return new;
end;
$$;
create trigger messages_touch after insert on public.messages
  for each row execute function public.touch_conversation();

-- Edits stamp edited_at; deletes are soft and clear the content.
create or replace function public.message_update()
returns trigger language plpgsql as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.body := '';
    new.attachment_path := null;
  elsif new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;
create trigger messages_update before update on public.messages
  for each row execute function public.message_update();

grant execute on function public.create_channel(text, text), public.open_dm(uuid),
  public.inbox(), public.search_messages(text) to authenticated;
revoke execute on function public.create_channel(text, text), public.open_dm(uuid),
  public.inbox(), public.search_messages(text) from anon;
