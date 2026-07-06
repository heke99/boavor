-- ============================================================================
-- Batch 23 — Support desk and help center
-- ============================================================================
-- * support_tickets + support_ticket_messages: signed-in users open tickets
--   and converse with staff. SLA due dates derive from priority (set
--   server-side at creation).
-- * support_macros: admin-managed canned replies.
-- * help_articles: public help center (published articles readable by all,
--   managed by admins).
--
-- Safe to re-run.
-- ============================================================================

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  category text not null default 'other'
    check (category in ('account', 'application', 'listing', 'billing', 'gdpr', 'technical', 'other')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'new'
    check (status in ('new', 'open', 'waiting_on_user', 'resolved', 'closed')),
  assigned_to uuid references auth.users(id) on delete set null,
  sla_due_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets (status, sla_due_at);

drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  is_staff boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_idx on public.support_ticket_messages (ticket_id, created_at);

create table if not exists public.support_macros (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.help_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]*)[a-z0-9]$'),
  title text not null,
  body text not null,
  category text not null default 'allmant'
    check (category in ('allmant', 'sokande', 'hyresvard', 'byta', 'betalning', 'integritet')),
  is_published boolean not null default false,
  sort_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists help_articles_category_idx on public.help_articles (category, sort_order)
  where is_published = true;

drop trigger if exists help_articles_updated_at on public.help_articles;
create trigger help_articles_updated_at before update on public.help_articles
  for each row execute function public.set_updated_at();

-- RLS -------------------------------------------------------------------------

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;
alter table public.support_macros enable row level security;
alter table public.help_articles enable row level security;

drop policy if exists "users manage own tickets" on public.support_tickets;
create policy "users manage own tickets" on public.support_tickets
  for select using (user_id = auth.uid());
drop policy if exists "users create own tickets" on public.support_tickets;
create policy "users create own tickets" on public.support_tickets
  for insert with check (user_id = auth.uid());
drop policy if exists "admins manage tickets" on public.support_tickets;
create policy "admins manage tickets" on public.support_tickets
  for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "participants read ticket messages" on public.support_ticket_messages;
create policy "participants read ticket messages" on public.support_ticket_messages
  for select using (
    public.current_user_is_admin()
    or exists (
      select 1 from public.support_tickets t
      where t.id = support_ticket_messages.ticket_id and t.user_id = auth.uid()
    )
  );
drop policy if exists "participants write ticket messages" on public.support_ticket_messages;
create policy "participants write ticket messages" on public.support_ticket_messages
  for insert with check (
    sender_user_id = auth.uid()
    and (
      (public.current_user_is_admin() and is_staff = true)
      or (
        is_staff = false
        and exists (
          select 1 from public.support_tickets t
          where t.id = support_ticket_messages.ticket_id and t.user_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "admins manage macros" on public.support_macros;
create policy "admins manage macros" on public.support_macros
  for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());

drop policy if exists "public reads published articles" on public.help_articles;
create policy "public reads published articles" on public.help_articles
  for select using (is_published = true);
drop policy if exists "admins manage articles" on public.help_articles;
create policy "admins manage articles" on public.help_articles
  for all using (public.current_user_is_admin()) with check (public.current_user_is_admin());
