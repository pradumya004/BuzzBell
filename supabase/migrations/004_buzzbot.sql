-- BuzzBot: a Postgres trigger that answers DMs, so someone testing alone
-- still gets a conversation. No server, no function host.

create or replace function public.buzzbot_answer(q text)
returns text language sql immutable as $$
  select case
    when q ~* '\m(hi|hey|hello|yo|namaste)\M' then
      'Hey! I''m BuzzBot. Open BuzzBell in a second tab or a private window as another guest and message yourself: typing, presence and messages all arrive live.'
    when q ~* '(stack|built|how|tech|work)' then
      'React + TypeScript up front. Underneath it''s Supabase: Postgres with Row Level Security, Realtime for messages, Presence for who''s online, Broadcast for typing. I''m a Postgres trigger, by the way.'
    when q ~* '(rls|secur|safe|private|policy)' then
      'Every read and write is checked by Postgres RLS policies. Even with the public key in the browser, you can only read rooms you''re a member of. The repo has tests that try to break that.'
    when q ~* '(search|find)' then
      'Try the search bar: it''s Postgres full-text search, and it only returns messages you''re allowed to read.'
    when q ~* '(who|made|author|pradumya)' then
      'Pradumya Gaurav built me. He''s a backend engineer who automates ops work with Node.js, queues and LLMs. github.com/pradumya004'
    else
      (array[
        'Noted. Try reacting to a message, or ask me how this was built.',
        'I only know a few tricks: ask me about the stack, security or search.',
        'Fun fact: this reply came from a trigger in the same transaction as your message.'
      ])[1 + floor(random() * 3)::int]
  end;
$$;

create or replace function public.buzzbot_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_bot uuid;
begin
  select p.id into v_bot
  from members mm join profiles p on p.id = mm.user_id
  where mm.conversation_id = new.conversation_id and p.is_bot and p.id <> new.author_id
  limit 1;

  if v_bot is null
     or (select kind from conversations where id = new.conversation_id) <> 'dm'
     or (select is_bot from profiles where id = new.author_id) then
    return new;
  end if;

  insert into messages (conversation_id, author_id, body)
  values (new.conversation_id, v_bot, buzzbot_answer(new.body));
  return new;
end;
$$;

create trigger messages_buzzbot after insert on public.messages
  for each row execute function public.buzzbot_reply();

-- Every new person gets a DM from BuzzBot, so the inbox is never empty.
create or replace function public.buzzbot_welcome()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_bot uuid;
  v_conv uuid;
begin
  if new.is_bot then return new; end if;
  select id into v_bot from profiles where is_bot limit 1;
  if v_bot is null then return new; end if;

  insert into conversations (kind, dm_key, is_public, created_by)
  values ('dm', least(v_bot, new.id)::text || ':' || greatest(v_bot, new.id)::text, false, v_bot)
  returning id into v_conv;
  insert into members (conversation_id, user_id) values (v_conv, v_bot), (v_conv, new.id);
  insert into messages (conversation_id, author_id, body)
  values (v_conv, v_bot, 'Welcome to BuzzBell, ' || new.display_name || '! Say hi to me here, or jump into #general.');
  return new;
end;
$$;

create trigger profiles_welcome after insert on public.profiles
  for each row execute function public.buzzbot_welcome();
