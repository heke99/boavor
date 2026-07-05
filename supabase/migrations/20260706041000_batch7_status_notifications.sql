-- ============================================================================
-- Batch 7 — Status-change notifications and applicant messaging helper
-- ============================================================================
-- * Trigger: every rental application status change notifies the applicant
--   in-app (runs as table owner, so landlord updates can notify applicants
--   despite notifications RLS).
-- * notify_application_applicant(): lets a managing landlord send a
--   "request more info" notification to the applicant, permission-checked.
--
-- Safe to re-run.
-- ============================================================================

create or replace function public.notify_application_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_label text;
begin
  if new.status is distinct from old.status and new.user_id is not null then
    v_label := case new.status::text
      when 'submitted' then 'Din ansökan är mottagen'
      when 'screening' then 'Din ansökan kontrolleras'
      when 'qualified' then 'Din ansökan uppfyller kraven'
      when 'not_qualified' then 'Din ansökan uppfyller inte kraven'
      when 'reviewing' then 'Din ansökan granskas'
      when 'shortlisted' then 'Du är en av slutkandidaterna'
      when 'viewing_invited' then 'Du är inbjuden till visning'
      when 'viewing_booked' then 'Din visning är bokad'
      when 'offered' then 'Du har fått ett erbjudande'
      when 'offer_accepted' then 'Du har accepterat erbjudandet'
      when 'contract_pending' then 'Kontraktet förbereds'
      when 'signed' then 'Kontraktet är signerat'
      when 'rejected' then 'Din ansökan har fått avslag'
      when 'withdrawn' then 'Din ansökan är återtagen'
      when 'expired' then 'Din ansökan har gått ut'
      when 'rented_to_other' then 'Bostaden hyrdes ut till en annan sökande'
      else 'Ny status på din ansökan'
    end;

    insert into public.notifications (user_id, title, body)
    values (
      new.user_id,
      v_label,
      coalesce(new.listing_title, 'Bostadsansökan') ||
        case when new.status::text = 'rejected' and new.rejection_reason is not null
          then ' — ' || new.rejection_reason
          else ''
        end
    );
  end if;

  return new;
end;
$$;

drop trigger if exists rental_applications_status_notify on public.rental_applications;
create trigger rental_applications_status_notify
  after update on public.rental_applications
  for each row execute function public.notify_application_status_change();

-- Landlord → applicant notification (e.g. request more information).
create or replace function public.notify_application_applicant(
  p_application_id uuid,
  p_title text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid;
begin
  if not public.current_user_can_manage_application(p_application_id) then
    raise exception 'not authorized';
  end if;

  select user_id into v_user_id
  from public.rental_applications
  where id = p_application_id;

  if v_user_id is null then
    return;
  end if;

  insert into public.notifications (user_id, title, body)
  values (v_user_id, p_title, p_body);
end;
$$;
