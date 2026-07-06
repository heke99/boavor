-- ============================================================================
-- Notifications: add missing INSERT policies
-- ============================================================================
-- The notifications table only had SELECT/UPDATE policies for owners, so all
-- in-app notification inserts (e.g. "Ansökan skickad") were silently rejected
-- by RLS. Users may create their own notifications and admins may notify any
-- user (e.g. document review decisions).

drop policy if exists "users insert own notifications" on public.notifications;
create policy "users insert own notifications" on public.notifications
  for insert with check (auth.uid() = user_id);

drop policy if exists "admins insert notifications" on public.notifications;
create policy "admins insert notifications" on public.notifications
  for insert with check (public.current_user_is_admin());
