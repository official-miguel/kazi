-- =============================================================================
-- Kazi: full database setup for a NEW, EMPTY Supabase project.
--
-- How to run: Supabase dashboard -> SQL Editor -> paste this whole file -> Run.
-- (Or with the Supabase CLI: `supabase db push`.)
--
-- Contents
--   1. Types
--   2. Tables
--   3. Helper functions (private schema)
--   4. Triggers
--   5. Actions the app calls (apply status changes, admin review, phone reveal)
--   6. Job listing view
--   7. Privileges and row-level security
--   8. Storage buckets and their rules
--   9. Reference data (47 counties, categories, starter skills)
--
-- After running, make yourself an admin (see the last lines of this file).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Types
-- -----------------------------------------------------------------------------

create type public.profile_type        as enum ('worker', 'intern', 'employer');
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type public.review_status       as enum ('pending', 'approved', 'rejected');
create type public.job_type            as enum ('job', 'internship', 'attachment');
create type public.job_status          as enum ('draft', 'waiting', 'live', 'closed');
create type public.pay_period          as enum ('day', 'week', 'month');
create type public.application_status  as enum ('sent', 'seen', 'shortlisted', 'accepted', 'not_selected');
create type public.education_kind      as enum ('secondary', 'college', 'university', 'certificate', 'trade_test');
create type public.verification_doc    as enum ('national_id', 'student_id', 'institution_letter', 'business_registration', 'kra_pin');
create type public.report_reason       as enum ('asks_for_money', 'fake_job', 'wrong_details', 'offensive', 'other');


-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------

-- Reference lists ------------------------------------------------------------

create table public.counties (
  id   smallint primary key,            -- official county code, 1 to 47
  name text not null unique
);

create table public.categories (
  id   smallint generated always as identity primary key,
  slug text not null unique,
  name text not null unique
);

create table public.skills (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 2 and 60),
  category_id smallint references public.categories (id) on delete set null
);
create unique index skills_name_unique on public.skills (lower(name));

-- One row per login ----------------------------------------------------------

create table public.accounts (
  id                uuid primary key references auth.users (id) on delete cascade,
  phone             text,
  email             text,
  active_profile_id uuid,                 -- which profile the person is using now
  is_admin          boolean not null default false,
  created_at        timestamptz not null default now()
);

-- Role profiles: one login can hold one of each type --------------------------

create table public.profiles (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null references public.accounts (id) on delete cascade,
  type                public.profile_type not null,
  full_name           text not null check (char_length(full_name) between 2 and 80),
  headline            text check (char_length(headline) <= 120),   -- e.g. "Electrician, 4 years"
  bio                 text check (char_length(bio) <= 1000),
  county_id           smallint references public.counties (id),
  town                text check (char_length(town) <= 60),
  photo_path          text,                                        -- path in the "avatars" bucket
  verification_status public.verification_status not null default 'unverified',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (account_id, type)
);
create index profiles_account_idx on public.profiles (account_id);

alter table public.accounts
  add constraint accounts_active_profile_fk
  foreign key (active_profile_id) references public.profiles (id) on delete set null;

-- Business details for employer profiles --------------------------------------

create table public.employer_details (
  profile_id    uuid primary key references public.profiles (id) on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 100),
  sector        text check (char_length(sector) <= 60)
);

-- The profile is the CV: these sections build it ------------------------------

create table public.experiences (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  title        text not null check (char_length(title) between 2 and 100),
  organisation text check (char_length(organisation) <= 100),
  town         text check (char_length(town) <= 60),
  start_date   date,
  end_date     date,                       -- empty means "still here"
  description  text check (char_length(description) <= 1000),
  created_at   timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index experiences_profile_idx on public.experiences (profile_id);

create table public.education (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  kind          public.education_kind not null,
  institution   text not null check (char_length(institution) between 2 and 120),
  qualification text check (char_length(qualification) <= 120),   -- e.g. "Diploma", "KCSE", "Grade II"
  field         text check (char_length(field) <= 120),           -- e.g. "Electrical Engineering"
  start_year    smallint check (start_year between 1960 and 2100),
  end_year      smallint check (end_year between 1960 and 2100),  -- empty means "still studying"
  created_at    timestamptz not null default now()
);
create index education_profile_idx on public.education (profile_id);

create table public.profile_skills (
  profile_id uuid   not null references public.profiles (id) on delete cascade,
  skill_id   bigint not null references public.skills (id) on delete cascade,
  primary key (profile_id, skill_id)
);

create table public.portfolio_items (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  image_path text not null,                -- path in the "portfolio" bucket
  caption    text check (char_length(caption) <= 140),
  created_at timestamptz not null default now()
);
create index portfolio_profile_idx on public.portfolio_items (profile_id);

-- Posts: jobs, internships and attachments ------------------------------------

create table public.jobs (
  id                  uuid primary key default gen_random_uuid(),
  employer_profile_id uuid not null references public.profiles (id) on delete cascade,
  title               text not null check (char_length(title) between 3 and 100),
  type                public.job_type not null,
  category_id         smallint references public.categories (id),
  county_id           smallint not null references public.counties (id),
  town                text check (char_length(town) <= 60),
  pay_min             integer check (pay_min >= 0),       -- KES
  pay_max             integer check (pay_max >= 0),       -- KES
  pay_period          public.pay_period not null default 'month',
  description         text check (char_length(description) <= 3000),
  requirements        text check (char_length(requirements) <= 2000),
  deadline            date not null,
  status              public.job_status not null default 'draft',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (pay_min is null or pay_max is null or pay_max >= pay_min)
);
create index jobs_employer_idx on public.jobs (employer_profile_id);
create index jobs_browse_idx   on public.jobs (status, county_id, type, category_id, deadline);

-- Applications and their history ----------------------------------------------

create table public.applications (
  id                uuid primary key default gen_random_uuid(),
  job_id            uuid not null references public.jobs (id) on delete cascade,
  seeker_profile_id uuid not null references public.profiles (id) on delete cascade,
  status            public.application_status not null default 'sent',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (job_id, seeker_profile_id)      -- one application per person per post
);
create index applications_seeker_idx on public.applications (seeker_profile_id);

create table public.application_events (
  id               bigint generated always as identity primary key,
  application_id   uuid not null references public.applications (id) on delete cascade,
  status           public.application_status not null,
  actor_account_id uuid references public.accounts (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index application_events_app_idx on public.application_events (application_id, created_at);

-- Verification requests (reviewed by an admin) --------------------------------

create table public.verifications (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid not null references public.profiles (id) on delete cascade,
  doc_type             public.verification_doc not null,
  doc_number           text check (char_length(doc_number) <= 40),    -- ID number, KRA PIN, reg. number
  document_path        text,                                          -- path in the private "verification-docs" bucket
  contact_person_name  text check (char_length(contact_person_name) <= 80),
  contact_person_phone text check (char_length(contact_person_phone) <= 20),
  institution_name     text check (char_length(institution_name) <= 120),
  status               public.review_status not null default 'pending',
  reviewer_note        text check (char_length(reviewer_note) <= 500),
  reviewed_by          uuid references public.accounts (id) on delete set null,
  reviewed_at          timestamptz,
  created_at           timestamptz not null default now()
);
-- Only one open request per profile at a time.
create unique index verifications_one_pending on public.verifications (profile_id) where status = 'pending';

-- Alerts -----------------------------------------------------------------------

create table public.notifications (
  id         bigint generated always as identity primary key,
  account_id uuid not null references public.accounts (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,  -- which role it belongs to
  type       text not null,          -- application_received, application_status, verification_result
  title      text not null,
  body       text,
  link       text,                   -- in-app path to open
  channel    text not null default 'in_app' check (channel in ('in_app', 'sms', 'whatsapp')),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_account_idx on public.notifications (account_id, created_at desc);

-- "Report this post" ------------------------------------------------------------

create table public.job_reports (
  id                  bigint generated always as identity primary key,
  job_id              uuid not null references public.jobs (id) on delete cascade,
  reporter_account_id uuid not null default auth.uid() references public.accounts (id) on delete cascade,
  reason              public.report_reason not null,
  details             text check (char_length(details) <= 500),
  resolved_at         timestamptz,
  created_at          timestamptz not null default now(),
  unique (job_id, reporter_account_id)
);


-- -----------------------------------------------------------------------------
-- 3. Helper functions
--    They live in a "private" schema so they cannot be called from the browser.
--    They run with the owner's rights so security rules can use them safely.
-- -----------------------------------------------------------------------------

create schema if not exists private;

create function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select a.is_admin from public.accounts a where a.id = auth.uid()), false);
$$;

create function private.owns_profile(_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = _profile_id and p.account_id = auth.uid()
  );
$$;

create function private.owns_job(_job_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.jobs j
    join public.profiles p on p.id = j.employer_profile_id
    where j.id = _job_id and p.account_id = auth.uid()
  );
$$;

create function private.applied_to_job(_job_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.applications a
    join public.profiles p on p.id = a.seeker_profile_id
    where a.job_id = _job_id and p.account_id = auth.uid()
  );
$$;

-- A worker or intern may apply to a live post that is still open and is not their own.
create function private.can_apply(_job_id uuid, _seeker_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.jobs j
    join public.profiles employer on employer.id = j.employer_profile_id
    join public.profiles seeker   on seeker.id = _seeker_profile_id
    where j.id = _job_id
      and j.status = 'live'
      and j.deadline >= current_date
      and seeker.account_id = auth.uid()
      and seeker.type in ('worker', 'intern')
      and employer.account_id <> seeker.account_id
  );
$$;

-- Can the signed-in person see this application? (the applicant, the employer, or an admin)
create function private.can_see_application(_application_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.applications a
    join public.profiles seeker on seeker.id = a.seeker_profile_id
    join public.jobs j on j.id = a.job_id
    join public.profiles employer on employer.id = j.employer_profile_id
    where a.id = _application_id
      and (seeker.account_id = auth.uid() or employer.account_id = auth.uid())
  ) or private.is_admin();
$$;

create function private.notify(
  _account_id uuid, _profile_id uuid, _type text, _title text, _body text, _link text
)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (account_id, profile_id, type, title, body, link)
  values (_account_id, _profile_id, _type, _title, _body, _link);
$$;


-- -----------------------------------------------------------------------------
-- 4. Triggers
-- -----------------------------------------------------------------------------

-- 4a. Create an account row whenever someone signs up.
create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.accounts (id, phone, email)
  values (new.id, new.phone, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- 4b. Keep updated_at fresh.
create function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- 4c. Job rules: only employer profiles post, and a post is only "live"
--     when the employer is verified. Otherwise it waits.
create function private.enforce_job_rules()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _type   public.profile_type;
  _status public.verification_status;
begin
  select p.type, p.verification_status into _type, _status
  from public.profiles p where p.id = new.employer_profile_id;

  if _type is distinct from 'employer' then
    raise exception 'Only an employer profile can post a job.' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.employer_profile_id <> old.employer_profile_id then
    raise exception 'A post cannot be moved to another employer.' using errcode = '42501';
  end if;

  if new.status in ('waiting', 'live') then
    if _status = 'verified' then
      new.status := 'live';
    else
      new.status := 'waiting';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger jobs_enforce_rules
  before insert or update on public.jobs
  for each row execute function private.enforce_job_rules();

-- 4d. A new application: record the first history entry and alert the employer.
create function private.handle_new_application()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _job_title        text;
  _employer_profile uuid;
  _employer_account uuid;
  _seeker_name      text;
begin
  insert into public.application_events (application_id, status, actor_account_id)
  values (new.id, 'sent', auth.uid());

  select j.title, p.id, p.account_id into _job_title, _employer_profile, _employer_account
  from public.jobs j
  join public.profiles p on p.id = j.employer_profile_id
  where j.id = new.job_id;

  select p.full_name into _seeker_name from public.profiles p where p.id = new.seeker_profile_id;

  perform private.notify(
    _employer_account, _employer_profile, 'application_received',
    'New applicant',
    _seeker_name || ' applied for ' || _job_title || '.',
    '/posts/' || new.job_id::text
  );
  return new;
end;
$$;

create trigger applications_after_insert
  after insert on public.applications
  for each row execute function private.handle_new_application();

-- 4e. A new verification request: check the document fits the role, mark the profile as pending.
create function private.handle_new_verification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  _type public.profile_type;
begin
  select p.type into _type from public.profiles p where p.id = new.profile_id;

  if _type = 'employer' and new.doc_type not in ('business_registration', 'kra_pin') then
    raise exception 'Employers verify with a business registration or KRA PIN.';
  elsif _type = 'worker' and new.doc_type <> 'national_id' then
    raise exception 'Workers verify with a national ID.';
  elsif _type = 'intern' and new.doc_type not in ('national_id', 'student_id', 'institution_letter') then
    raise exception 'Interns verify with a national ID, student ID or a letter from their institution.';
  end if;

  update public.profiles
  set verification_status = 'pending'
  where id = new.profile_id and verification_status <> 'verified';

  return new;
end;
$$;

create trigger verifications_after_insert
  after insert on public.verifications
  for each row execute function private.handle_new_verification();


-- -----------------------------------------------------------------------------
-- 5. Actions the app calls
-- -----------------------------------------------------------------------------

-- 5a. Employer moves an application along: seen, shortlisted, accepted, not_selected.
--     Records the history and alerts the applicant.
create function public.set_application_status(_application_id uuid, _new_status public.application_status)
returns public.application_status
language plpgsql security definer set search_path = '' as $$
declare
  _current        public.application_status;
  _job_id         uuid;
  _job_title      text;
  _seeker_profile uuid;
  _seeker_account uuid;
  _title          text;
  _body           text;
begin
  select a.status, a.job_id, a.seeker_profile_id, j.title, sp.account_id
    into _current, _job_id, _seeker_profile, _job_title, _seeker_account
  from public.applications a
  join public.jobs j      on j.id = a.job_id
  join public.profiles sp on sp.id = a.seeker_profile_id
  where a.id = _application_id
  for update of a;

  if not found then
    raise exception 'Application not found.' using errcode = 'P0002';
  end if;

  if not private.owns_job(_job_id) then
    raise exception 'Only the employer who posted this can update it.' using errcode = '42501';
  end if;

  -- Opening an application that was already seen changes nothing.
  if _new_status = 'seen' and _current <> 'sent' then
    return _current;
  end if;

  if _new_status = _current then
    return _current;
  end if;

  if not (
       (_new_status = 'seen'         and _current = 'sent')
    or (_new_status = 'shortlisted'  and _current in ('sent', 'seen'))
    or (_new_status = 'accepted'     and _current = 'shortlisted')
    or (_new_status = 'not_selected' and _current in ('sent', 'seen', 'shortlisted'))
  ) then
    raise exception 'An application cannot go from % to %.', _current, _new_status;
  end if;

  update public.applications
  set status = _new_status, updated_at = now()
  where id = _application_id;

  insert into public.application_events (application_id, status, actor_account_id)
  values (_application_id, _new_status, auth.uid());

  _title := case _new_status
    when 'seen'         then 'Your application was seen'
    when 'shortlisted'  then 'You have been shortlisted'
    when 'accepted'     then 'You have been accepted'
    when 'not_selected' then 'Update on your application'
  end;
  _body := case _new_status
    when 'seen'         then 'The employer opened your application for ' || _job_title || '.'
    when 'shortlisted'  then 'You are on the shortlist for ' || _job_title || '. The employer may call you.'
    when 'accepted'     then 'Good news. You were accepted for ' || _job_title || '.'
    when 'not_selected' then 'You were not selected for ' || _job_title || '. Keep applying.'
  end;

  perform private.notify(
    _seeker_account, _seeker_profile, 'application_status',
    _title, _body, '/applications/' || _application_id::text
  );

  return _new_status;
end;
$$;

-- 5b. Employer gets the applicant's phone number, but only once shortlisted or accepted.
create function public.get_applicant_phone(_application_id uuid)
returns text
language sql stable security definer set search_path = '' as $$
  select acc.phone
  from public.applications a
  join public.jobs j      on j.id = a.job_id
  join public.profiles ep on ep.id = j.employer_profile_id
  join public.profiles sp on sp.id = a.seeker_profile_id
  join public.accounts acc on acc.id = sp.account_id
  where a.id = _application_id
    and ep.account_id = auth.uid()
    and a.status in ('shortlisted', 'accepted');
$$;

-- 5c. Admin approves or rejects a verification request.
--     Approving an employer also puts their waiting posts live.
create function public.review_verification(_verification_id uuid, _approve boolean, _note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  _profile_id uuid;
  _status     public.review_status;
  _account_id uuid;
begin
  if not private.is_admin() then
    raise exception 'Only admins can review verifications.' using errcode = '42501';
  end if;

  select v.profile_id, v.status into _profile_id, _status
  from public.verifications v
  where v.id = _verification_id
  for update;

  if not found then
    raise exception 'Verification request not found.' using errcode = 'P0002';
  end if;

  if _status <> 'pending' then
    raise exception 'This request has already been reviewed.';
  end if;

  update public.verifications
  set status        = case when _approve then 'approved'::public.review_status else 'rejected'::public.review_status end,
      reviewer_note = _note,
      reviewed_by   = auth.uid(),
      reviewed_at   = now()
  where id = _verification_id;

  update public.profiles
  set verification_status = case when _approve then 'verified'::public.verification_status
                                 else 'rejected'::public.verification_status end
  where id = _profile_id
  returning account_id into _account_id;

  if _approve then
    update public.jobs set status = 'live'
    where employer_profile_id = _profile_id and status = 'waiting';
  end if;

  perform private.notify(
    _account_id, _profile_id, 'verification_result',
    case when _approve then 'You are verified' else 'We could not verify you yet' end,
    case when _approve then 'Your profile now shows the Verified badge.'
         else coalesce(_note, 'Please check your details and send them again.') end,
    '/verification'
  );
end;
$$;


-- -----------------------------------------------------------------------------
-- 6. Job listing view: what browse, search and the public job page read.
--    It follows the reader's own permissions (security_invoker).
-- -----------------------------------------------------------------------------

create view public.job_listings
with (security_invoker = true) as
select
  j.id,
  j.title,
  j.type,
  j.status,
  j.category_id,
  cat.name                                as category_name,
  j.county_id,
  c.name                                  as county_name,
  j.town,
  j.pay_min,
  j.pay_max,
  j.pay_period,
  j.description,
  j.requirements,
  j.deadline,
  j.created_at,
  j.employer_profile_id,
  coalesce(ed.business_name, p.full_name) as employer_name,
  (p.verification_status = 'verified')    as employer_verified
from public.jobs j
join public.profiles p             on p.id = j.employer_profile_id
left join public.employer_details ed on ed.profile_id = p.id
join public.counties c             on c.id = j.county_id
left join public.categories cat    on cat.id = j.category_id;


-- -----------------------------------------------------------------------------
-- 7. Privileges and row-level security
--    Rule of thumb: people see and edit only what they should.
-- -----------------------------------------------------------------------------

-- 7a. Start from nothing, then grant exactly what each kind of visitor needs.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema private to anon, authenticated;
grant execute on all functions in schema private to anon, authenticated;

-- Visitors who are not signed in: can read live posts and the reference lists only.
grant select on public.counties, public.categories, public.jobs, public.job_listings to anon;
grant select on public.profiles, public.employer_details to anon;   -- limited to employers by policy

-- Signed-in people.
grant select on all tables in schema public to authenticated;

grant update (email, active_profile_id) on public.accounts to authenticated;

grant insert (account_id, type, full_name, headline, bio, county_id, town, photo_path) on public.profiles to authenticated;
grant update (full_name, headline, bio, county_id, town, photo_path)                   on public.profiles to authenticated;
grant delete on public.profiles to authenticated;

grant insert, update, delete on public.employer_details, public.experiences, public.education,
                                public.portfolio_items to authenticated;
grant insert, delete on public.profile_skills to authenticated;
grant insert (name, category_id) on public.skills to authenticated;

grant insert, update, delete on public.jobs to authenticated;

grant insert (job_id, seeker_profile_id) on public.applications to authenticated;   -- status only changes through set_application_status

grant insert (profile_id, doc_type, doc_number, document_path, contact_person_name,
              contact_person_phone, institution_name) on public.verifications to authenticated;

grant update (read_at) on public.notifications to authenticated;

grant insert (job_id, reason, details) on public.job_reports to authenticated;
grant update (resolved_at) on public.job_reports to authenticated;                  -- admins only, by policy

grant execute on function public.set_application_status(uuid, public.application_status) to authenticated;
grant execute on function public.get_applicant_phone(uuid)                              to authenticated;
grant execute on function public.review_verification(uuid, boolean, text)               to authenticated;

-- 7b. Turn on row-level security everywhere.
alter table public.counties           enable row level security;
alter table public.categories         enable row level security;
alter table public.skills             enable row level security;
alter table public.accounts           enable row level security;
alter table public.profiles           enable row level security;
alter table public.employer_details   enable row level security;
alter table public.experiences        enable row level security;
alter table public.education          enable row level security;
alter table public.profile_skills     enable row level security;
alter table public.portfolio_items    enable row level security;
alter table public.jobs               enable row level security;
alter table public.applications       enable row level security;
alter table public.application_events enable row level security;
alter table public.verifications      enable row level security;
alter table public.notifications      enable row level security;
alter table public.job_reports        enable row level security;

-- 7c. Reference lists: everyone can read.
create policy "Anyone can read counties"   on public.counties   for select to anon, authenticated using (true);
create policy "Anyone can read categories" on public.categories for select to anon, authenticated using (true);
create policy "Signed-in people can read skills" on public.skills for select to authenticated using (true);
create policy "Signed-in people can add a skill" on public.skills for insert to authenticated with check (true);

-- 7d. Accounts: only your own. (Phone numbers are never readable by others.)
create policy "Read own account" on public.accounts
  for select to authenticated
  using (id = (select auth.uid()) or private.is_admin());

create policy "Update own account" on public.accounts
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (active_profile_id is null or private.owns_profile(active_profile_id))
  );

-- 7e. Profiles: signed-in people can read them; visitors only see employers; only the owner edits.
create policy "Signed-in people can read profiles" on public.profiles
  for select to authenticated using (true);

create policy "Visitors can read employer profiles" on public.profiles
  for select to anon using (type = 'employer');

create policy "Create own profile" on public.profiles
  for insert to authenticated with check (account_id = (select auth.uid()));

create policy "Update own profile" on public.profiles
  for update to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

create policy "Delete own profile" on public.profiles
  for delete to authenticated using (account_id = (select auth.uid()));

-- 7f. Employer details: public business info; only the owner edits.
create policy "Anyone can read employer details" on public.employer_details
  for select to anon, authenticated using (true);

create policy "Owner manages employer details" on public.employer_details
  for all to authenticated
  using (private.owns_profile(profile_id))
  with check (private.owns_profile(profile_id));

-- 7g. CV sections: signed-in people can read; only the owner edits.
create policy "Signed-in people can read experience" on public.experiences
  for select to authenticated using (true);
create policy "Owner manages experience" on public.experiences
  for all to authenticated
  using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));

create policy "Signed-in people can read education" on public.education
  for select to authenticated using (true);
create policy "Owner manages education" on public.education
  for all to authenticated
  using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));

create policy "Signed-in people can read profile skills" on public.profile_skills
  for select to authenticated using (true);
create policy "Owner adds profile skills" on public.profile_skills
  for insert to authenticated with check (private.owns_profile(profile_id));
create policy "Owner removes profile skills" on public.profile_skills
  for delete to authenticated using (private.owns_profile(profile_id));

create policy "Signed-in people can read portfolio" on public.portfolio_items
  for select to authenticated using (true);
create policy "Owner manages portfolio" on public.portfolio_items
  for all to authenticated
  using (private.owns_profile(profile_id)) with check (private.owns_profile(profile_id));

-- 7h. Jobs: live posts are public. Drafts and waiting posts are for their owner.
--     Someone who applied can still see the post after it closes.
create policy "Visitors can read live posts" on public.jobs
  for select to anon using (status = 'live');

create policy "Read live, own or applied-to posts" on public.jobs
  for select to authenticated
  using (
    status = 'live'
    or private.owns_profile(employer_profile_id)
    or private.applied_to_job(id)
    or private.is_admin()
  );

create policy "Employer creates own posts" on public.jobs
  for insert to authenticated with check (private.owns_profile(employer_profile_id));

create policy "Employer updates own posts" on public.jobs
  for update to authenticated
  using (private.owns_profile(employer_profile_id))
  with check (private.owns_profile(employer_profile_id));

create policy "Employer deletes own posts" on public.jobs
  for delete to authenticated using (private.owns_profile(employer_profile_id));

-- 7i. Applications: the applicant and the post's employer can see them.
--     Applicants create them. Status changes only through set_application_status().
create policy "Applicant and employer can read applications" on public.applications
  for select to authenticated
  using (
    private.owns_profile(seeker_profile_id)
    or private.owns_job(job_id)
    or private.is_admin()
  );

create policy "Seeker applies to an open post" on public.applications
  for insert to authenticated
  with check (private.can_apply(job_id, seeker_profile_id));

create policy "Applicant and employer can read history" on public.application_events
  for select to authenticated
  using (private.can_see_application(application_id));

-- 7j. Verifications: the owner sends and reads their own; admins read all.
--     Approving or rejecting happens only through review_verification().
create policy "Owner and admins can read verifications" on public.verifications
  for select to authenticated
  using (private.owns_profile(profile_id) or private.is_admin());

create policy "Owner sends a verification request" on public.verifications
  for insert to authenticated with check (private.owns_profile(profile_id));

-- 7k. Notifications: your own only. You can mark them read.
create policy "Read own notifications" on public.notifications
  for select to authenticated using (account_id = (select auth.uid()));

create policy "Mark own notifications read" on public.notifications
  for update to authenticated
  using (account_id = (select auth.uid()))
  with check (account_id = (select auth.uid()));

-- 7l. Reports: anyone signed in can report a post; only admins read and resolve.
create policy "Report a post" on public.job_reports
  for insert to authenticated with check (reporter_account_id = (select auth.uid()));

create policy "Admins read reports" on public.job_reports
  for select to authenticated using (private.is_admin());

create policy "Admins resolve reports" on public.job_reports
  for update to authenticated using (private.is_admin()) with check (private.is_admin());


-- -----------------------------------------------------------------------------
-- 8. Storage
--    Files are stored under a folder named after the owner's account id:
--      avatars/<account id>/photo.jpg
--    Photos are public and small. Verification documents are private.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',           'avatars',           true,  1048576, array['image/jpeg', 'image/png', 'image/webp']),
  ('portfolio',         'portfolio',         true,  2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-docs', 'verification-docs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "People manage files in their own folder" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('avatars', 'portfolio', 'verification-docs')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('avatars', 'portfolio', 'verification-docs')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Admins read verification documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'verification-docs' and private.is_admin());


-- -----------------------------------------------------------------------------
-- 9. Reference data
-- -----------------------------------------------------------------------------

insert into public.counties (id, name) values
  (1, 'Mombasa'), (2, 'Kwale'), (3, 'Kilifi'), (4, 'Tana River'), (5, 'Lamu'),
  (6, 'Taita-Taveta'), (7, 'Garissa'), (8, 'Wajir'), (9, 'Mandera'), (10, 'Marsabit'),
  (11, 'Isiolo'), (12, 'Meru'), (13, 'Tharaka-Nithi'), (14, 'Embu'), (15, 'Kitui'),
  (16, 'Machakos'), (17, 'Makueni'), (18, 'Nyandarua'), (19, 'Nyeri'), (20, 'Kirinyaga'),
  (21, 'Murang''a'), (22, 'Kiambu'), (23, 'Turkana'), (24, 'West Pokot'), (25, 'Samburu'),
  (26, 'Trans-Nzoia'), (27, 'Uasin Gishu'), (28, 'Elgeyo-Marakwet'), (29, 'Nandi'), (30, 'Baringo'),
  (31, 'Laikipia'), (32, 'Nakuru'), (33, 'Narok'), (34, 'Kajiado'), (35, 'Kericho'),
  (36, 'Bomet'), (37, 'Kakamega'), (38, 'Vihiga'), (39, 'Bungoma'), (40, 'Busia'),
  (41, 'Siaya'), (42, 'Kisumu'), (43, 'Homa Bay'), (44, 'Migori'), (45, 'Kisii'),
  (46, 'Nyamira'), (47, 'Nairobi');

insert into public.categories (slug, name) values
  ('construction',  'Construction and building'),
  ('electrical',    'Electrical and solar'),
  ('plumbing',      'Plumbing and water'),
  ('mechanics',     'Mechanics and garages'),
  ('transport',     'Driving, riding and delivery'),
  ('tailoring',     'Tailoring and fashion'),
  ('beauty',        'Hair and beauty'),
  ('hospitality',   'Hotels, food and catering'),
  ('retail',        'Shops and sales'),
  ('farming',       'Farming and agribusiness'),
  ('domestic',      'Home, cleaning and care'),
  ('security',      'Security'),
  ('office',        'Office and administration'),
  ('accounting',    'Accounts and finance'),
  ('ict',           'ICT and technology'),
  ('health',        'Health'),
  ('education',     'Teaching and training'),
  ('engineering',   'Engineering and manufacturing'),
  ('media',         'Media, design and marketing'),
  ('other',         'Other');

insert into public.skills (name, category_id)
select s.name, c.id
from (values
  ('Masonry', 'construction'), ('Carpentry', 'construction'), ('Painting', 'construction'),
  ('Tiling', 'construction'), ('Welding', 'construction'), ('Roofing', 'construction'),
  ('House wiring', 'electrical'), ('Solar installation', 'electrical'), ('Appliance repair', 'electrical'),
  ('Pipe fitting', 'plumbing'), ('Borehole and pump repair', 'plumbing'),
  ('Motor vehicle repair', 'mechanics'), ('Motorcycle repair', 'mechanics'), ('Panel beating', 'mechanics'),
  ('Driving (BCE licence)', 'transport'), ('Boda boda riding', 'transport'), ('Delivery', 'transport'),
  ('Dressmaking', 'tailoring'), ('School uniform tailoring', 'tailoring'), ('Embroidery', 'tailoring'),
  ('Hairdressing', 'beauty'), ('Barbering', 'beauty'), ('Nail care', 'beauty'),
  ('Cooking', 'hospitality'), ('Baking', 'hospitality'), ('Waiting tables', 'hospitality'), ('Housekeeping', 'hospitality'),
  ('Shop attendant', 'retail'), ('Sales', 'retail'), ('M-Pesa agent', 'retail'), ('Customer service', 'retail'),
  ('Dairy farming', 'farming'), ('Poultry keeping', 'farming'), ('Greenhouse farming', 'farming'),
  ('Cleaning', 'domestic'), ('Child care', 'domestic'), ('Laundry', 'domestic'),
  ('Guarding', 'security'), ('CCTV installation', 'security'),
  ('Data entry', 'office'), ('Reception', 'office'), ('Record keeping', 'office'),
  ('Bookkeeping', 'accounting'), ('QuickBooks', 'accounting'), ('Excel', 'accounting'),
  ('Computer repair', 'ict'), ('Networking', 'ict'), ('Web development', 'ict'), ('Graphic design', 'media'),
  ('Social media marketing', 'media'), ('Photography', 'media'),
  ('Nursing', 'health'), ('Community health work', 'health'), ('Pharmacy assistant', 'health'),
  ('Teaching', 'education'), ('Tutoring', 'education'),
  ('Machine operation', 'engineering'), ('Technical drawing', 'engineering')
) as s(name, slug)
join public.categories c on c.slug = s.slug;


-- =============================================================================
-- AFTER RUNNING THIS FILE
--
-- 1. Sign in to the app once with your own phone number, so your account exists.
-- 2. Make yourself an admin by running this, with your own number starting 254:
--
--      update public.accounts set is_admin = true where phone = '254712345678';
--
--    (Supabase stores phone numbers without the leading "+". If no row changes,
--     run `select id, phone from public.accounts;` to see how yours is stored.)
-- =============================================================================
