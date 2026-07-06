-- ============================================================================
-- Batch 8 — Team management RLS for company_members
-- ============================================================================
-- The original policies only let users manage their OWN membership row.
-- Company owners/admins must be able to read, update roles for and remove
-- other members. A SECURITY DEFINER helper avoids RLS self-recursion.
--
-- Safe to re-run.
-- ============================================================================

create or replace function public.current_user_is_company_manager(target_company_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.team_role in ('owner', 'admin')
  ) or public.current_user_is_admin();
$$;

drop policy if exists "company managers read members" on public.company_members;
create policy "company managers read members" on public.company_members
  for select using (public.current_user_is_company_manager(company_id));

drop policy if exists "company managers update members" on public.company_members;
create policy "company managers update members" on public.company_members
  for update using (public.current_user_is_company_manager(company_id))
  with check (public.current_user_is_company_manager(company_id));

drop policy if exists "company managers remove members" on public.company_members;
create policy "company managers remove members" on public.company_members
  for delete using (public.current_user_is_company_manager(company_id));

-- Existing members created before team_role existed default to 'admin', which
-- matches the previous behavior where every member could manage the company.
