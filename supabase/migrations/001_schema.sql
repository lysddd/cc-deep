-- Enable pg_cron extension (requires Supabase Pro or manual enable)
create extension if not exists pg_cron;

-- ========== TABLES ==========

-- User profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  wechat_openid text unique,
  email_verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  task_type text not null check (task_type in ('checkin', 'deadline', 'count')),
  condition_config jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_tasks_user_id on public.tasks(user_id);
create index idx_tasks_active on public.tasks(is_active);

-- Check-in records
create table public.checkin_records (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  checked_at timestamptz not null default now(),
  source text not null check (source in ('web', 'wechat'))
);

create index idx_checkin_task_user on public.checkin_records(task_id, user_id);
create index idx_checkin_checked_at on public.checkin_records(checked_at);

-- Notification configurations
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  channel text not null check (channel in ('email', 'wechat_template')),
  recipients jsonb not null default '[]'::jsonb,
  template jsonb not null default '{}'::jsonb,
  is_active boolean not null default true
);

create index idx_notifications_task on public.notifications(task_id);

-- Notification send logs (compliance audit trail)
create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete set null,
  task_id uuid not null references public.tasks(id) on delete cascade,
  recipient text not null,
  channel text not null,
  status text not null check (status in ('sent', 'failed')),
  sent_at timestamptz not null default now(),
  error_message text
);

create index idx_notification_logs_task on public.notification_logs(task_id);
create index idx_notification_logs_sent_at on public.notification_logs(sent_at);

-- ========== ROW LEVEL SECURITY ==========

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.checkin_records enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_logs enable row level security;

-- Profiles: users can read/write their own
create policy "Users can manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Tasks: owners have full access
create policy "Users can manage own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Checkin records: owners have full access
create policy "Users can manage own checkins"
  on public.checkin_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notifications: owners have full access
create policy "Users can manage own notifications"
  on public.notifications for all
  using (
    auth.uid() = (
      select user_id from public.tasks where id = task_id
    )
  );

-- Notification logs: owners can read
create policy "Users can read own notification logs"
  on public.notification_logs for select
  using (
    auth.uid() = (
      select user_id from public.tasks where id = task_id
    )
  );

-- ========== TRIGGER: Auto-create profile on signup ==========

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== CRON: Periodic task condition checker ==========

create or replace function public.check_pending_tasks()
returns void as $$
declare
  task_record record;
  last_checkin timestamptz;
  should_notify boolean;
begin
  for task_record in
    select t.*, array_agg(n.*) as notifs
    from public.tasks t
    left join public.notifications n on n.task_id = t.id and n.is_active = true
    where t.is_active = true
    group by t.id
  loop
    should_notify := false;

    case
      when task_record.condition_config->>'type' = 'checkin' then
        select checked_at into last_checkin
        from public.checkin_records
        where task_id = task_record.id and user_id = task_record.user_id
        order by checked_at desc limit 1;

        if last_checkin is null then
          should_notify := true;
        else
          case task_record.condition_config->>'frequency'
            when 'daily' then
              should_notify := last_checkin < (now() - interval '1 day'
                + (task_record.condition_config->>'grace_minutes')::int * interval '1 minute');
            when 'weekly' then
              should_notify := last_checkin < (now() - interval '1 week');
            when 'monthly' then
              should_notify := last_checkin < (now() - interval '1 month');
            when 'yearly' then
              should_notify := last_checkin < (now() - interval '1 year');
            else null;
          end case;
        end if;

      when task_record.condition_config->>'type' = 'deadline' then
        if (task_record.condition_config->>'deadline')::timestamptz < now() then
          if task_record.condition_config->>'require_checkin' = 'true' then
            select checked_at into last_checkin
            from public.checkin_records
            where task_id = task_record.id and user_id = task_record.user_id
              and checked_at > (task_record.condition_config->>'deadline')::timestamptz - interval '24 hours'
            order by checked_at desc limit 1;
            should_notify := last_checkin is null;
          else
            should_notify := true;
          end if;
        end if;

      when task_record.condition_config->>'type' = 'count' then
        should_notify := false;
      else null;
    end case;
  end loop;
end;
$$ language plpgsql;

-- Schedule: run every minute
select cron.schedule(
  'check-pending-tasks',
  '* * * * *',
  'select public.check_pending_tasks();'
);
