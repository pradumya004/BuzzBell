-- Row Level Security. Clients use the anon key plus a user session; these
-- policies are the whole authorization layer.

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.members enable row level security;
alter table public.messages enable row level security;
alter table public.reactions enable row level security;

-- security definer so policies on members can call it without recursing
create or replace function public.is_member(conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where conversation_id = conv and user_id = auth.uid());
$$;
revoke all on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;

-- profiles: everyone signed in can see names; you edit only yourself
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and not is_bot);

-- conversations: public channels are browsable, everything else is members-only.
-- Creation goes through create_channel / open_dm (003), never a direct insert.
create policy conversations_read on public.conversations for select to authenticated
  using ((kind = 'channel' and is_public) or public.is_member(id));

-- members: see the member lists of rooms you are in; join public channels; leave anything
create policy members_read on public.members for select to authenticated
  using (user_id = auth.uid() or public.is_member(conversation_id));
create policy members_join_public on public.members for insert to authenticated
  with check (
    user_id = auth.uid() and role = 'member'
    and exists (select 1 from conversations c where c.id = conversation_id and c.kind = 'channel' and c.is_public)
  );
create policy members_update_own on public.members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy members_leave on public.members for delete to authenticated
  using (user_id = auth.uid());

-- messages: members read and write; authors edit and soft-delete their own
create policy messages_read on public.messages for select to authenticated
  using (public.is_member(conversation_id));
create policy messages_send on public.messages for insert to authenticated
  with check (author_id = auth.uid() and public.is_member(conversation_id) and edited_at is null and deleted_at is null);
create policy messages_edit_own on public.messages for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- reactions: members of the message's room
create policy reactions_read on public.reactions for select to authenticated
  using (exists (select 1 from messages m where m.id = message_id and public.is_member(m.conversation_id)));
create policy reactions_add on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from messages m where m.id = message_id and public.is_member(m.conversation_id)));
create policy reactions_remove on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- column-level guard: only body/edited_at/deleted_at are editable on a message
revoke update on public.messages from authenticated;
grant update (body, edited_at, deleted_at) on public.messages to authenticated;
revoke update on public.members from authenticated;
grant update (last_read_at) on public.members to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_hue) on public.profiles to authenticated;

-- Storage: attachments/<conversation_id>/<file>, readable and writable by members
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 5242880, array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
on conflict (id) do nothing;

create policy attachments_read on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy attachments_write on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.is_member(((storage.foldername(name))[1])::uuid));

-- Realtime: postgres_changes on these tables, filtered per subscriber by the RLS above
alter publication supabase_realtime add table public.messages, public.reactions;
alter table public.messages replica identity full;
alter table public.reactions replica identity full;
