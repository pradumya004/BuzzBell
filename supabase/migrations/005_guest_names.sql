-- Guest names from 20 adjectives x 20 animals (400 combinations) instead of
-- 10 animals, so two guests online at once rarely share a name.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  adjectives text[] := array['Calm','Swift','Bright','Quiet','Bold','Lucky','Sunny','Brave','Clever','Gentle',
                             'Rapid','Witty','Mellow','Nimble','Steady','Vivid','Cosmic','Jolly','Keen','Noble'];
  animals text[] := array['Otter','Falcon','Panda','Lynx','Koala','Heron','Fox','Orca','Ibis','Yak',
                          'Badger','Crane','Gecko','Marten','Puffin','Quokka','Raven','Seal','Tapir','Wren'];
  pick text := adjectives[1 + floor(random() * 20)::int] || ' ' || animals[1 + floor(random() * 20)::int];
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  uname text;
begin
  uname := lower(coalesce(meta->>'username', case when new.is_anonymous then 'guest' else split_part(new.email, '@', 1) end));
  uname := left(regexp_replace(uname, '[^a-z0-9_]', '', 'g'), 17) || '_' || substr(md5(new.id::text), 1, 6);

  insert into profiles (id, username, display_name, is_guest)
  values (
    new.id,
    uname,
    coalesce(nullif(meta->>'display_name', ''), case when new.is_anonymous then pick else split_part(new.email, '@', 1) end),
    coalesce(new.is_anonymous, false)
  );

  insert into members (conversation_id, user_id)
  select id, new.id from conversations where auto_join;
  return new;
end;
$$;
