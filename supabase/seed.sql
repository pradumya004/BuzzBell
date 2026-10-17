-- Demo data: three channels, three teammates, BuzzBot. Safe to re-run.
-- Seeded users get a random password nobody knows, so they can't be signed into.

create or replace function pg_temp.seed_user(p_id uuid, p_email text, p_username text, p_name text, p_hue int, p_bot boolean)
returns void language plpgsql as $$
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_anonymous)
  values (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
          crypt(gen_random_uuid()::text, gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('username', p_username, 'display_name', p_name),
          now(), now(), false)
  on conflict (id) do nothing;
  update public.profiles set avatar_hue = p_hue, is_bot = p_bot where id = p_id;
end;
$$;

-- bot first, so the people seeded after it get their welcome DM
select pg_temp.seed_user('00000000-0000-4000-8000-0000000000b0', 'buzzbot@buzzbell.local', 'buzzbot', 'BuzzBot', 45, true);

insert into public.conversations (kind, slug, name, topic, auto_join, created_by) values
  ('channel', 'general', 'general', 'Say hi. Everyone lands here.', true, '00000000-0000-4000-8000-0000000000b0'),
  ('channel', 'show-and-tell', 'show-and-tell', 'Share what you shipped this week', true, '00000000-0000-4000-8000-0000000000b0'),
  ('channel', 'random', 'random', 'Everything else', true, '00000000-0000-4000-8000-0000000000b0')
on conflict (slug) do nothing;

insert into public.members (conversation_id, user_id)
select id, '00000000-0000-4000-8000-0000000000b0' from public.conversations where auto_join
on conflict do nothing;

select pg_temp.seed_user('00000000-0000-4000-8000-000000000001', 'maya@buzzbell.local', 'maya', 'Maya Rao', 330, false);
select pg_temp.seed_user('00000000-0000-4000-8000-000000000002', 'arjun@buzzbell.local', 'arjun', 'Arjun Mehta', 200, false);
select pg_temp.seed_user('00000000-0000-4000-8000-000000000003', 'leo@buzzbell.local', 'leo', 'Leo Park', 150, false);

-- a little history so the demo doesn't open on empty rooms
do $$
declare
  g uuid := (select id from public.conversations where slug = 'general');
  s uuid := (select id from public.conversations where slug = 'show-and-tell');
begin
  if exists (select 1 from public.messages where conversation_id = g) then return; end if;

  insert into public.messages (conversation_id, author_id, body, created_at) values
    (g, '00000000-0000-4000-8000-000000000001', 'Morning all. Standup notes are in the doc, short one today.', now() - interval '3 hours'),
    (g, '00000000-0000-4000-8000-000000000002', 'Ack. The webhook retries went out last night, error rate is flat since.', now() - interval '2 hours 50 minutes'),
    (g, '00000000-0000-4000-8000-000000000003', 'Nice. Was it the backoff change or the idempotency key?', now() - interval '2 hours 45 minutes'),
    (g, '00000000-0000-4000-8000-000000000002', 'Both. Backoff stopped the stampede, the key stopped double sends.', now() - interval '2 hours 44 minutes'),
    (g, '00000000-0000-4000-8000-0000000000b0', 'New here? Try reacting to a message, or DM me and ask how BuzzBell is built.', now() - interval '1 hour'),
    (s, '00000000-0000-4000-8000-000000000003', 'Shipped dark mode for the dashboard. Took longer to pick the grey than to write the code.', now() - interval '5 hours'),
    (s, '00000000-0000-4000-8000-000000000001', 'The grey is perfect though.', now() - interval '4 hours 58 minutes');

  insert into public.reactions (message_id, user_id, emoji)
  select m.id, u.id, e.emoji
  from public.messages m
  cross join (values ('00000000-0000-4000-8000-000000000001'::uuid), ('00000000-0000-4000-8000-000000000003'::uuid)) u(id)
  cross join (values ('🔥')) e(emoji)
  where m.body like 'Both. Backoff%'
  on conflict do nothing;
end $$;
