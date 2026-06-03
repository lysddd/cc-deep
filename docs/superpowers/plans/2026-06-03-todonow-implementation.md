# TodoNow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build TodoNow MVP — a condition-driven task + notification web app with email notifications and WeChat check-in.

**Architecture:** Next.js 14 App Router with Supabase (Auth, PostgreSQL, Realtime). pg_cron handles scheduled condition checking. WeChat Official Account provides template message push and H5 check-in. All deployed on domestic Node.js hosting.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (Auth + DB + Realtime + pg_cron), Zod, Resend (email), WeChat Official Account API

**Spec:** [docs/superpowers/specs/2026-06-03-todonow-design.md](../specs/2026-06-03-todonow-design.md)

---

## File Structure

```
app/
  layout.tsx                    # Root layout with metadata
  globals.css                   # Tailwind + base styles
  page.tsx                      # Landing page (redirect to /login or /dashboard)
  (auth)/
    layout.tsx                  # Auth layout (centered card)
    login/page.tsx              # Login page
    register/page.tsx           # Register page
    auth/callback/route.ts      # Supabase email verification callback
  (app)/
    layout.tsx                  # App shell: sidebar nav + header
    dashboard/page.tsx          # Dashboard: active tasks, today's checkins, recent timeouts
    tasks/
      page.tsx                  # Task list with filters
      new/page.tsx              # Create task form
      [id]/
        page.tsx                # Task detail view
        edit/page.tsx           # Edit task form
    settings/
      page.tsx                  # User settings: profile, WeChat bind, delete account
  api/
    tasks/
      route.ts                  # GET (list) + POST (create)
      [id]/route.ts             # GET/PUT/DELETE single task
    checkins/
      route.ts                  # POST check-in
    wechat/
      callback/route.ts         # WeChat server verification + message handler
    settings/
      delete-account/route.ts   # DELETE account
  wechat/
    checkin/page.tsx            # H5 check-in page (from WeChat template message)

components/
  ui/
    button.tsx
    input.tsx
    card.tsx
    badge.tsx
    modal.tsx
    toast.tsx
  auth/
    login-form.tsx
    register-form.tsx
  tasks/
    task-card.tsx               # Task summary card
    task-form.tsx               # Shared create/edit form
    condition-config.tsx        # Condition type selector + config fields
    notification-config.tsx     # Channel selector + recipients + template editor
  dashboard/
    stat-card.tsx               # Metric display card
    today-checkins.tsx          # Tasks needing check-in today
    recent-timeouts.tsx         # Recently triggered notifications
  layout/
    sidebar.tsx                 # App sidebar navigation
    header.tsx                  # Top header bar
  compliance/
    privacy-policy.tsx          # Privacy policy content
    terms-of-service.tsx        # Terms of service content

lib/
  supabase/
    client.ts                   # Browser Supabase client (singleton)
    server.ts                   # Server Supabase client (per-request)
    middleware.ts               # Next.js middleware for auth redirect
  db/
    tasks.ts                    # Task DB operations
    checkins.ts                 # Check-in DB operations
    notifications.ts            # Notification DB operations
    users.ts                    # User DB operations
  validators/
    task.ts                     # Zod schemas for task + condition + notification
  email/
    send.ts                     # Resend email sending wrapper
    templates.ts                # Email template rendering
  wechat/
    client.ts                   # WeChat API: access token, template message, user info
  cron/
    check-tasks.ts              # pg_cron function: scan tasks, trigger notifications
  utils.ts                      # Shared helpers (date formatting, etc.)

types/
  index.ts                      # Shared TypeScript types (Task, Condition, Notification, etc.)

supabase/
  migrations/
    001_schema.sql              # All tables, indexes, RLS policies, pg_cron job
```

---

## Phase 1: Project Foundation

### Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`

- [ ] **Step 1: Scaffold Next.js with TypeScript and Tailwind**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --no-turbopack
```

Expected: Creates Next.js project in current directory. When prompted, accept defaults.

- [ ] **Step 2: Install core dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr zod resend lucide-react
npm install -D @types/node
```

Expected: Dependencies installed without errors.

- [ ] **Step 3: Verify dev server starts**

```bash
npm run dev
```

Visit `http://localhost:3000`. Expected: Next.js default page renders. Stop server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add package.json tsconfig.json next.config.js tailwind.config.ts postcss.config.js app/ components/ .gitignore eslint.config.mjs
git commit -m "chore: scaffold Next.js + Tailwind + TypeScript project"
```

### Task 2: Configure Supabase client and environment

**Files:**
- Create: `.env.local.example`, `lib/supabase/client.ts`, `lib/supabase/server.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create environment variables template**

Write `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
RESEND_API_KEY=<your-resend-api-key>
WECHAT_APP_ID=<your-wechat-app-id>
WECHAT_APP_SECRET=<your-wechat-app-secret>
WECHAT_TOKEN=<your-wechat-token>
```

- [ ] **Step 2: Create browser Supabase client**

Write `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create server Supabase client**

Write `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignore in server components
          }
        },
      },
    }
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add .env.local.example lib/supabase/ app/layout.tsx
git commit -m "feat: configure Supabase client (browser + server)"
```

### Task 3: Create types and Zod validators

**Files:**
- Create: `types/index.ts`, `lib/validators/task.ts`

- [ ] **Step 1: Define shared types**

Write `types/index.ts`:

```typescript
export type TaskType = 'checkin' | 'deadline' | 'count'

export interface CheckinCondition {
  type: 'checkin'
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  count_per_period: number
  grace_minutes: number
  start_date: string
}

export interface DeadlineCondition {
  type: 'deadline'
  deadline: string
  require_checkin: boolean
  remind_before_minutes: number[]
}

export interface CountCondition {
  type: 'count'
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  target_count: number
  start_date: string
}

export type TaskCondition = CheckinCondition | DeadlineCondition | CountCondition

export type NotificationChannel = 'email' | 'wechat_template'

export interface NotificationTemplate {
  subject: string
  body: string
}

export interface NotificationRecipient {
  email?: string
  name?: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  task_type: TaskType
  condition_config: TaskCondition
  is_active: boolean
  created_at: string
  notifications?: Notification[]
}

export interface Notification {
  id: string
  task_id: string
  channel: NotificationChannel
  recipients: NotificationRecipient[]
  template: NotificationTemplate
  is_active: boolean
}

export interface CheckinRecord {
  id: string
  task_id: string
  user_id: string
  checked_at: string
  source: 'web' | 'wechat'
}

export interface UserProfile {
  id: string
  email: string
  display_name: string
  wechat_openid: string | null
  email_verified_at: string | null
  created_at: string
}
```

- [ ] **Step 2: Define Zod validation schemas**

Write `lib/validators/task.ts`:

```typescript
import { z } from 'zod'

export const checkinConditionSchema = z.object({
  type: z.literal('checkin'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  count_per_period: z.number().int().min(1),
  grace_minutes: z.number().int().min(0).default(0),
  start_date: z.string().min(1),
})

export const deadlineConditionSchema = z.object({
  type: z.literal('deadline'),
  deadline: z.string().min(1),
  require_checkin: z.boolean().default(true),
  remind_before_minutes: z.array(z.number().int().min(0)).default([]),
})

export const countConditionSchema = z.object({
  type: z.literal('count'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  target_count: z.number().int().min(1),
  start_date: z.string().min(1),
})

export const taskConditionSchema = z.discriminatedUnion('type', [
  checkinConditionSchema,
  deadlineConditionSchema,
  countConditionSchema,
])

export const notificationTemplateSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
})

export const notificationRecipientSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
})

export const notificationSchema = z.object({
  channel: z.enum(['email', 'wechat_template']),
  recipients: z.array(notificationRecipientSchema).min(1),
  template: notificationTemplateSchema,
})

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  task_type: z.enum(['checkin', 'deadline', 'count']),
  condition_config: taskConditionSchema,
  notifications: z.array(notificationSchema).min(1),
})

export const updateTaskSchema = createTaskSchema.partial()

export const createCheckinSchema = z.object({
  task_id: z.string().uuid(),
  source: z.enum(['web', 'wechat']).default('web'),
})
```

- [ ] **Step 3: Commit**

```bash
git add types/index.ts lib/validators/task.ts
git commit -m "feat: add shared types and Zod validation schemas"
```

---

## Phase 2: Database & Auth

### Task 4: Create database schema and RLS policies

**Files:**
- Create: `supabase/migrations/001_schema.sql`

- [ ] **Step 1: Write migration SQL**

Write `supabase/migrations/001_schema.sql`:

```sql
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
  notif_record record;
  last_checkin timestamptz;
  period_start timestamptz;
  checkin_count int;
  should_notify boolean;
begin
  -- Loop through active tasks
  for task_record in
    select t.*, array_agg(n.*) as notifs
    from public.tasks t
    left join public.notifications n on n.task_id = t.id and n.is_active = true
    where t.is_active = true
    group by t.id
  loop
    should_notify := false;

    -- Evaluate condition type
    case
      when task_record.condition_config->>'type' = 'checkin' then
        -- Get latest check-in for this task
        select checked_at into last_checkin
        from public.checkin_records
        where task_id = task_record.id and user_id = task_record.user_id
        order by checked_at desc limit 1;

        -- Determine if check-in is overdue based on frequency
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
        -- Check if deadline passed without check-in
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
        -- Count check-ins in current period
        select now() into period_start;

        -- Don't notify before period starts, but for simplicity check count
        -- If not enough check-ins in current period
        should_notify := false; -- placeholder — notify only if count unmet near period end

      else null;
    end case;

    -- TODO: Queue notifications if should_notify (handled by application layer)
    -- Insert into a notification queue or call Edge Function
  end loop;
end;
$$ language plpgsql;

-- Schedule: run every minute
select cron.schedule(
  'check-pending-tasks',
  '* * * * *',
  'select public.check_pending_tasks();'
);
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Open Supabase Dashboard → SQL Editor → paste and run `supabase/migrations/001_schema.sql`.

Expected: All tables created, RLS enabled, trigger and cron job registered.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_schema.sql
git commit -m "feat: add database schema with RLS, triggers, and cron"
```

### Task 5: Set up Supabase Auth (frontend)

**Files:**
- Create: `lib/supabase/middleware.ts`, `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/auth/callback/route.ts`, `components/auth/login-form.tsx`, `components/auth/register-form.tsx`
- Modify: `app/layout.tsx`, `app/globals.css`

- [ ] **Step 1: Create auth middleware**

Write `lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const publicPaths = ['/login', '/register', '/auth/callback', '/wechat']
  const isPublicPath = publicPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}
```

- [ ] **Step 2: Create root middleware file**

Create `middleware.ts` in project root (same level as `app/`):

```typescript
import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 3: Create auth callback route**

Write `app/auth/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (tokenHash && type) {
    const supabase = await createClient()
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any })
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

- [ ] **Step 4: Create auth layout**

Write `app/(auth)/layout.tsx`:

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TodoNow - 登录',
  description: 'TodoNow 条件驱动任务通知系统',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
```

- [ ] **Step 5: Create login form component**

Write `components/auth/login-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-8">
      <h1 className="text-2xl font-bold text-center mb-2">TodoNow</h1>
      <p className="text-gray-500 text-center mb-6">登录你的账号</p>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">密码</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-4">
        还没有账号？<Link href="/register" className="text-blue-600 hover:underline">注册</Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 6: Create login page**

Write `app/(auth)/login/page.tsx`:

```typescript
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return <LoginForm />
}
```

- [ ] **Step 7: Create register form component**

Write `components/auth/register-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess('注册成功！请检查邮箱完成验证。')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-8">
      <h1 className="text-2xl font-bold text-center mb-2">TodoNow</h1>
      <p className="text-gray-500 text-center mb-6">创建新账号</p>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg mb-4">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">显示名称</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="你的昵称"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">密码</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="至少 6 位"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-4">
        已有账号？<Link href="/login" className="text-blue-600 hover:underline">登录</Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 8: Create register page**

Write `app/(auth)/register/page.tsx`:

```typescript
import { RegisterForm } from '@/components/auth/register-form'

export default function RegisterPage() {
  return <RegisterForm />
}
```

- [ ] **Step 9: Update root layout**

Write `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TodoNow',
  description: '条件驱动的任务通知系统',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 10: Test auth flow**

```bash
npm run dev
```

Navigate to `http://localhost:3000`, verify redirect to /login. Test register and login. Verify /dashboard redirects to /login when unauthenticated.

- [ ] **Step 11: Commit**

```bash
git add middleware.ts app/layout.tsx app/auth/ app/\(auth\)/ lib/supabase/middleware.ts components/auth/
git commit -m "feat: add Supabase auth with login, register, email verification, and middleware"
```

### Task 6: Create app shell layout and navigation

**Files:**
- Create: `app/(app)/layout.tsx`, `components/layout/sidebar.tsx`, `components/layout/header.tsx`

- [ ] **Step 1: Create sidebar component**

Write `components/layout/sidebar.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListTodo, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const links = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/tasks', label: '任务管理', icon: ListTodo },
  { href: '/settings', label: '个人设置', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="w-64 bg-white border-r min-h-screen flex flex-col">
      <div className="p-6 border-b">
        <Link href="/dashboard" className="text-xl font-bold text-blue-600">
          TodoNow
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(link => {
          const Icon = link.icon
          const active = pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 w-full"
        >
          <LogOut size={18} />
          退出登录
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create header component**

Write `components/layout/header.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function Header() {
  const [email, setEmail] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email ?? '')
    })
  }, [])

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-gray-800">TodoNow</h2>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{email}</span>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Create app layout**

Write `app/(app)/layout.tsx`:

```typescript
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify layout renders**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`. Expected: sidebar on left, header on top, content area. Login if needed.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/layout.tsx components/layout/
git commit -m "feat: add app shell layout with sidebar navigation and header"
```

---

## Phase 3: Task CRUD

### Task 7: Create task database operations

**Files:**
- Create: `lib/db/tasks.ts`

- [ ] **Step 1: Write task DB operations**

Write `lib/db/tasks.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import type { Task, TaskCondition, Notification } from '@/types'

export async function getTasks(userId: string): Promise<Task[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, notifications(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`)
  return data
}

export async function getTask(taskId: string, userId: string): Promise<Task | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, notifications(*)')
    .eq('id', taskId)
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch task: ${error.message}`)
  }
  return data
}

export async function createTask(input: {
  userId: string
  title: string
  description?: string
  task_type: string
  condition_config: TaskCondition
  notifications: Omit<Notification, 'id' | 'task_id'>[]
}): Promise<Task> {
  const supabase = await createClient()

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      user_id: input.userId,
      title: input.title,
      description: input.description ?? null,
      task_type: input.task_type,
      condition_config: input.condition_config,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create task: ${error.message}`)

  // Create associated notifications
  if (input.notifications.length > 0) {
    const { error: notifError } = await supabase
      .from('notifications')
      .insert(
        input.notifications.map(n => ({
          task_id: task.id,
          channel: n.channel,
          recipients: n.recipients,
          template: n.template,
          is_active: n.is_active ?? true,
        }))
      )

    if (notifError) throw new Error(`Failed to create notifications: ${notifError.message}`)
  }

  return getTask(task.id, input.userId) as Promise<Task>
}

export async function updateTask(input: {
  taskId: string
  userId: string
  title?: string
  description?: string
  task_type?: string
  condition_config?: TaskCondition
  is_active?: boolean
}): Promise<Task> {
  const supabase = await createClient()

  const updates: Record<string, unknown> = {}
  if (input.title !== undefined) updates.title = input.title
  if (input.description !== undefined) updates.description = input.description
  if (input.task_type !== undefined) updates.task_type = input.task_type
  if (input.condition_config !== undefined) updates.condition_config = input.condition_config
  if (input.is_active !== undefined) updates.is_active = input.is_active

  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', input.taskId)
    .eq('user_id', input.userId)

  if (error) throw new Error(`Failed to update task: ${error.message}`)
  return (await getTask(input.taskId, input.userId))!
}

export async function deleteTask(taskId: string, userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to delete task: ${error.message}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/db/tasks.ts
git commit -m "feat: add task database operations (CRUD)"
```

### Task 8: Create task API routes

**Files:**
- Create: `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`

- [ ] **Step 1: Write tasks list/create API**

Write `app/api/tasks/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTaskSchema } from '@/lib/validators/task'
import { ZodError } from 'zod'
import { getTasks, createTask } from '@/lib/db/tasks'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tasks = await getTasks(user.id)
    return NextResponse.json(tasks)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const validated = createTaskSchema.parse(body)

    const task = await createTask({
      userId: user.id,
      title: validated.title,
      description: validated.description,
      task_type: validated.task_type,
      condition_config: validated.condition_config,
      notifications: validated.notifications,
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Write single task API**

Write `app/api/tasks/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateTaskSchema } from '@/lib/validators/task'
import { ZodError } from 'zod'
import { getTask, updateTask, deleteTask } from '@/lib/db/tasks'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const task = await getTask(id, user.id)
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(task)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const validated = updateTaskSchema.parse(body)

    const task = await updateTask({
      taskId: id,
      userId: user.id,
      ...validated,
    })

    return NextResponse.json(task)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    await deleteTask(id, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/tasks/
git commit -m "feat: add task API routes (GET list, POST create, GET/PUT/DELETE single)"
```

### Task 9: Create task management pages

**Files:**
- Create: `app/(app)/tasks/page.tsx`, `app/(app)/tasks/new/page.tsx`, `app/(app)/tasks/[id]/page.tsx`, `app/(app)/tasks/[id]/edit/page.tsx`, `components/tasks/task-card.tsx`, `components/tasks/task-form.tsx`, `components/tasks/condition-config.tsx`, `components/tasks/notification-config.tsx`

- [ ] **Step 1: Create TaskCard component**

Write `components/tasks/task-card.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { Calendar, Bell } from 'lucide-react'
import type { Task } from '@/types'

function formatCondition(task: Task): string {
  const cfg = task.condition_config
  if (cfg.type === 'checkin') {
    return `${cfg.frequency === 'daily' ? '每天' : cfg.frequency === 'weekly' ? '每周' : '每月'}签到 ${cfg.count_per_period} 次`
  }
  if (cfg.type === 'deadline') {
    return `截止: ${new Date(cfg.deadline).toLocaleDateString('zh-CN')}`
  }
  if (cfg.type === 'count') {
    return `${cfg.target_count} 次/${cfg.frequency === 'daily' ? '天' : '周'}`
  }
  return ''
}

export function TaskCard({ task }: { task: Task }) {
  const typeLabels: Record<string, string> = {
    checkin: '签到',
    deadline: '截止',
    count: '计数',
  }

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium
              ${task.task_type === 'checkin' ? 'bg-green-100 text-green-700' :
                task.task_type === 'deadline' ? 'bg-orange-100 text-orange-700' :
                'bg-purple-100 text-purple-700'}`}>
              {typeLabels[task.task_type]}
            </span>
            {!task.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">已暂停</span>
            )}
          </div>
          {(task.notifications?.length ?? 0) > 0 && <Bell size={14} className="text-gray-400" />}
        </div>

        <h3 className="font-semibold mb-1">{task.title}</h3>
        <p className="text-sm text-gray-500">{formatCondition(task)}</p>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create ConditionConfig sub-form**

Write `components/tasks/condition-config.tsx`:

```typescript
'use client'

import type { TaskType } from '@/types'

interface Props {
  taskType: TaskType
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

export function ConditionConfig({ taskType, value, onChange }: Props) {
  function updateField(field: string, val: unknown) {
    onChange({ ...value, [field]: val })
  }

  if (taskType === 'checkin') {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">签到频率</label>
          <select
            value={(value.frequency as string) ?? 'daily'}
            onChange={e => updateField('frequency', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
            <option value="monthly">每月</option>
            <option value="yearly">每年</option>
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">每周期打卡次数</label>
            <input
              type="number"
              min={1}
              value={(value.count_per_period as number) ?? 1}
              onChange={e => updateField('count_per_period', parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">宽限期（分钟）</label>
            <input
              type="number"
              min={0}
              value={(value.grace_minutes as number) ?? 0}
              onChange={e => updateField('grace_minutes', parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">开始日期</label>
          <input
            type="date"
            value={(value.start_date as string) ?? ''}
            onChange={e => updateField('start_date', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>
    )
  }

  if (taskType === 'deadline') {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">截止时间</label>
          <input
            type="datetime-local"
            value={(value.deadline as string) ?? ''}
            onChange={e => updateField('deadline', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={(value.require_checkin as boolean) ?? true}
            onChange={e => updateField('require_checkin', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">需要手动确认完成</span>
        </label>

        <div>
          <label className="block text-sm font-medium mb-1">提前提醒（分钟前）</label>
          <input
            type="text"
            value={((value.remind_before_minutes as number[]) ?? []).join(', ')}
            onChange={e => {
              const nums = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
              updateField('remind_before_minutes', nums)
            }}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="60, 15"
          />
        </div>
      </div>
    )
  }

  if (taskType === 'count') {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">统计周期</label>
          <select
            value={(value.frequency as string) ?? 'daily'}
            onChange={e => updateField('frequency', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
            <option value="monthly">每月</option>
            <option value="yearly">每年</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">目标次数</label>
          <input
            type="number"
            min={1}
            value={(value.target_count as number) ?? 1}
            onChange={e => updateField('target_count', parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">开始日期</label>
          <input
            type="date"
            value={(value.start_date as string) ?? ''}
            onChange={e => updateField('start_date', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>
    )
  }

  return null
}
```

- [ ] **Step 3: Create NotificationConfig sub-form**

Write `components/tasks/notification-config.tsx`:

```typescript
'use client'

interface Recipient {
  email?: string
  name?: string
}

interface NotificationEntry {
  channel: string
  recipients: Recipient[]
  template: { subject: string; body: string }
}

interface Props {
  value: NotificationEntry[]
  onChange: (value: NotificationEntry[]) => void
}

export function NotificationConfig({ value, onChange }: Props) {
  function addNotification() {
    onChange([
      ...value,
      {
        channel: 'email',
        recipients: [{ email: '', name: '' }],
        template: {
          subject: '提醒：{{task_name}} 未按时完成',
          body: '你好，你设置的「{{task_name}}」任务需要在 {{deadline}} 前完成，目前尚未收到完成确认。\n\n—— TodoNow 自动提醒',
        },
      },
    ])
  }

  function updateNotification(index: number, field: string, val: unknown) {
    const updated = [...value]
    updated[index] = { ...updated[index], [field]: val }
    onChange(updated)
  }

  function updateRecipient(notifIndex: number, recipIndex: number, field: string, val: string) {
    const updated = [...value]
    const recipients = [...updated[notifIndex].recipients]
    recipients[recipIndex] = { ...recipients[recipIndex], [field]: val }
    updated[notifIndex] = { ...updated[notifIndex], recipients }
    onChange(updated)
  }

  function addRecipient(notifIndex: number) {
    const updated = [...value]
    updated[notifIndex] = {
      ...updated[notifIndex],
      recipients: [...updated[notifIndex].recipients, { email: '', name: '' }],
    }
    onChange(updated)
  }

  function removeNotification(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function removeRecipient(notifIndex: number, recipIndex: number) {
    const updated = [...value]
    updated[notifIndex] = {
      ...updated[notifIndex],
      recipients: updated[notifIndex].recipients.filter((_, i) => i !== recipIndex),
    }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">通知规则</h4>
        <button
          type="button"
          onClick={addNotification}
          className="text-sm text-blue-600 hover:underline"
        >
          + 添加通知
        </button>
      </div>

      {value.length === 0 && (
        <p className="text-sm text-gray-400">尚未添加通知规则</p>
      )}

      {value.map((notif, ni) => (
        <div key={ni} className="border rounded-lg p-4 space-y-3 relative">
          <button
            type="button"
            onClick={() => removeNotification(ni)}
            className="absolute top-3 right-3 text-sm text-red-500 hover:underline"
          >
            删除
          </button>

          <div>
            <label className="block text-sm font-medium mb-1">通知渠道</label>
            <select
              value={notif.channel}
              onChange={e => updateNotification(ni, 'channel', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="email">邮件</option>
              <option value="wechat_template">微信模板消息</option>
            </select>
          </div>

          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">接收人</label>
              <button
                type="button"
                onClick={() => addRecipient(ni)}
                className="text-xs text-blue-600 hover:underline"
              >
                + 添加
              </button>
            </div>
            {notif.recipients.map((recip, ri) => (
              <div key={ri} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="姓名（选填）"
                  value={recip.name ?? ''}
                  onChange={e => updateRecipient(ni, ri, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="email"
                  placeholder="邮箱"
                  value={recip.email ?? ''}
                  onChange={e => updateRecipient(ni, ri, 'email', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                {notif.recipients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRecipient(ni, ri)}
                    className="text-red-500 text-sm hover:underline"
                  >
                    移除
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Template */}
          <div>
            <label className="block text-sm font-medium mb-1">邮件标题</label>
            <input
              type="text"
              value={notif.template.subject}
              onChange={e => {
                const t = { ...notif.template, subject: e.target.value }
                updateNotification(ni, 'template', t)
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">邮件正文</label>
            <textarea
              rows={4}
              value={notif.template.body}
              onChange={e => {
                const t = { ...notif.template, body: e.target.value }
                updateNotification(ni, 'template', t)
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              可用变量：{'{{task_name}}'} {'{{deadline}}'} {'{{receiver_name}}'} {'{{creator_name}}'}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create TaskForm component**

Write `components/tasks/task-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConditionConfig } from './condition-config'
import { NotificationConfig } from './notification-config'
import type { TaskType, TaskCondition } from '@/types'

interface NotificationEntry {
  channel: string
  recipients: { email?: string; name?: string }[]
  template: { subject: string; body: string }
}

interface Props {
  mode: 'create' | 'edit'
  defaultValues?: {
    id?: string
    title?: string
    description?: string
    task_type?: TaskType
    condition_config?: TaskCondition
    notifications?: NotificationEntry[]
  }
}

export function TaskForm({ mode, defaultValues }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(defaultValues?.title ?? '')
  const [description, setDescription] = useState(defaultValues?.description ?? '')
  const [taskType, setTaskType] = useState<TaskType>(defaultValues?.task_type ?? 'checkin')
  const [condition, setCondition] = useState<Record<string, unknown>>(
    defaultValues?.condition_config ?? { type: 'checkin', frequency: 'daily', count_per_period: 1, grace_minutes: 0, start_date: '' }
  )
  const [notifications, setNotifications] = useState<NotificationEntry[]>(
    defaultValues?.notifications ?? []
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleTaskTypeChange(type: TaskType) {
    setTaskType(type)
    // Reset condition config for new type
    if (type === 'checkin') {
      setCondition({ type: 'checkin', frequency: 'daily', count_per_period: 1, grace_minutes: 0, start_date: '' })
    } else if (type === 'deadline') {
      setCondition({ type: 'deadline', deadline: '', require_checkin: true, remind_before_minutes: [] })
    } else {
      setCondition({ type: 'count', frequency: 'daily', target_count: 1, start_date: '' })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const body = {
      title,
      description: description || undefined,
      task_type: taskType,
      condition_config: condition,
      notifications,
    }

    const url = mode === 'create' ? '/api/tasks' : `/api/tasks/${defaultValues?.id}`
    const method = mode === 'create' ? 'POST' : 'PUT'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '操作失败')
      }

      router.push('/tasks')
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">任务类型</label>
        <div className="flex gap-3">
          {[
            { value: 'checkin' as TaskType, label: '周期性签到' },
            { value: 'deadline' as TaskType, label: '截止时间未完成' },
            { value: 'count' as TaskType, label: '次数达标' },
          ].map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTaskTypeChange(t.value)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                ${taskType === t.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">任务名称</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          maxLength={200}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="例如：每日健身打卡"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">任务描述（选填）</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="补充说明..."
        />
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">条件配置</h4>
        <ConditionConfig
          taskType={taskType}
          value={condition}
          onChange={setCondition}
        />
      </div>

      <div className="border rounded-lg p-4">
        <NotificationConfig
          value={notifications}
          onChange={setNotifications}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '保存中...' : mode === 'create' ? '创建任务' : '保存修改'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 rounded-lg border font-medium text-gray-700 hover:bg-gray-50"
        >
          取消
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Create task list page**

Write `app/(app)/tasks/page.tsx`:

```typescript
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTasks } from '@/lib/db/tasks'
import { TaskCard } from '@/components/tasks/task-card'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const tasks = await getTasks(user.id)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">任务管理</h1>
          <p className="text-gray-500 text-sm mt-1">管理你的所有任务和通知规则</p>
        </div>
        <Link
          href="/tasks/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
        >
          <Plus size={18} />
          创建任务
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">还没有任务</p>
          <p className="text-sm">点击「创建任务」开始吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create new task page**

Write `app/(app)/tasks/new/page.tsx`:

```typescript
import { TaskForm } from '@/components/tasks/task-form'

export default function NewTaskPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">创建新任务</h1>
      <TaskForm mode="create" />
    </div>
  )
}
```

- [ ] **Step 7: Create task detail page**

Write `app/(app)/tasks/[id]/page.tsx`:

```typescript
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTask } from '@/lib/db/tasks'

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { id } = await params
  const task = await getTask(id, user.id)
  if (!task) notFound()

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{task.title}</h1>
        <Link
          href={`/tasks/${task.id}/edit`}
          className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
        >
          <Pencil size={14} />
          编辑
        </Link>
      </div>

      {task.description && (
        <p className="text-gray-600 mb-6">{task.description}</p>
      )}

      <div className="border rounded-lg p-4 mb-6">
        <h3 className="font-medium mb-2">条件配置</h3>
        <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
          {JSON.stringify(task.condition_config, null, 2)}
        </pre>
      </div>

      {task.notifications && task.notifications.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">通知规则 ({task.notifications.length})</h3>
          {task.notifications.map((n, i) => (
            <div key={n.id} className="text-sm text-gray-600 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs mr-2 ${
                n.channel === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>
                {n.channel === 'email' ? '邮件' : '微信'}
              </span>
              发送给 {n.recipients.length} 人
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-400">
        创建于 {new Date(task.created_at).toLocaleDateString('zh-CN')}
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Create edit task page**

Write `app/(app)/tasks/[id]/edit/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTask } from '@/lib/db/tasks'
import { TaskForm } from '@/components/tasks/task-form'

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { id } = await params
  const task = await getTask(id, user.id)
  if (!task) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">编辑任务</h1>
      <TaskForm
        mode="edit"
        defaultValues={{
          id: task.id,
          title: task.title,
          description: task.description ?? '',
          task_type: task.task_type,
          condition_config: task.condition_config,
          notifications: task.notifications ?? [],
        }}
      />
    </div>
  )
}
```

- [ ] **Step 9: Verify task CRUD**

```bash
npm run dev
```

Navigate to /tasks, create a new task with each condition type. Edit, view detail, verify list updates.

- [ ] **Step 10: Commit**

```bash
git add app/\(app\)/tasks/ components/tasks/
git commit -m "feat: add task management pages with CRUD, condition config, and notification setup"
```

---

## Phase 4: Check-in System

### Task 10: Create check-in API and database operations

**Files:**
- Create: `lib/db/checkins.ts`, `app/api/checkins/route.ts`, `lib/db/users.ts`

- [ ] **Step 1: Write users DB operations**

Write `lib/db/users.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types'

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function bindWeChat(userId: string, openid: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ wechat_openid: openid })
    .eq('id', userId)

  if (error) throw new Error(`Failed to bind WeChat: ${error.message}`)
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw new Error(`Failed to delete account: ${error.message}`)
}
```

- [ ] **Step 2: Write check-in DB operations**

Write `lib/db/checkins.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import type { CheckinRecord } from '@/types'

export async function createCheckin(
  taskId: string,
  userId: string,
  source: 'web' | 'wechat'
): Promise<CheckinRecord> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('checkin_records')
    .insert({
      task_id: taskId,
      user_id: userId,
      source,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create check-in: ${error.message}`)
  return data
}

export async function getTaskCheckins(
  taskId: string,
  userId: string,
  limit = 30
): Promise<CheckinRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('checkin_records')
    .select('*')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .order('checked_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch checkins: ${error.message}`)
  return data
}

export async function getTodayCheckins(userId: string): Promise<CheckinRecord[]> {
  const supabase = await createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('checkin_records')
    .select('*, task:tasks(id, title, task_type)')
    .eq('user_id', userId)
    .gte('checked_at', today.toISOString())
    .order('checked_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch today's checkins: ${error.message}`)
  return data
}
```

- [ ] **Step 3: Write check-in API route**

Write `app/api/checkins/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckinSchema } from '@/lib/validators/task'
import { ZodError } from 'zod'
import { createCheckin, getTodayCheckins } from '@/lib/db/checkins'
import { getTask } from '@/lib/db/tasks'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const validated = createCheckinSchema.parse(body)

    // Verify task belongs to user
    const task = await getTask(validated.task_id, user.id)
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    if (!task.is_active) return NextResponse.json({ error: 'Task is not active' }, { status: 400 })

    const record = await createCheckin(validated.task_id, user.id, validated.source)
    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const checkins = await getTodayCheckins(user.id)
    return NextResponse.json(checkins)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/db/checkins.ts lib/db/users.ts app/api/checkins/route.ts
git commit -m "feat: add check-in API, DB operations, and user profile operations"
```

---

## Phase 5: Dashboard & Settings

### Task 11: Create dashboard page

**Files:**
- Create: `app/(app)/dashboard/page.tsx`, `components/dashboard/stat-card.tsx`, `components/dashboard/today-checkins.tsx`

- [ ] **Step 1: Create StatCard**

Write `components/dashboard/stat-card.tsx`:

```typescript
interface Props {
  label: string
  value: number | string
  icon?: React.ReactNode
}

export function StatCard({ label, value, icon }: Props) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-500">{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
```

- [ ] **Step 2: Create TodayCheckins**

Write `components/dashboard/today-checkins.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check } from 'lucide-react'

export function TodayCheckins() {
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; task_type: string }>>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get active tasks that need check-in today
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id, title, task_type')
        .eq('user_id', user.id)
        .eq('is_active', true)

      // Get today's checkins
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data: todayCheckins } = await supabase
        .from('checkin_records')
        .select('task_id')
        .eq('user_id', user.id)
        .gte('checked_at', today.toISOString())

      if (allTasks) setTasks(allTasks)
      if (todayCheckins) setChecked(new Set(todayCheckins.map(c => c.task_id)))
      setLoading(false)
    }
    load()
  }, [])

  async function handleCheckin(taskId: string) {
    setLoading(true)
    const res = await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, source: 'web' }),
    })
    if (res.ok) {
      setChecked(prev => new Set([...prev, taskId]))
    }
    setLoading(false)
  }

  if (tasks.length === 0 && !loading) {
    return <p className="text-sm text-gray-400">暂无需要签到的任务</p>
  }

  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-sm">{task.title}</p>
            <span className="text-xs text-gray-400">{task.task_type === 'checkin' ? '签到' : task.task_type === 'deadline' ? '截止' : '计数'}</span>
          </div>
          <button
            onClick={() => handleCheckin(task.id)}
            disabled={checked.has(task.id) || loading}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${checked.has(task.id)
                ? 'bg-green-100 text-green-600'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'}`}
          >
            {checked.has(task.id) && <Check size={14} />}
            {checked.has(task.id) ? '已打卡' : '打卡'}
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create dashboard page**

Write `app/(app)/dashboard/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getTasks } from '@/lib/db/tasks'
import { StatCard } from '@/components/dashboard/stat-card'
import { TodayCheckins } from '@/components/dashboard/today-checkins'
import { ListTodo, CheckCircle2, Bell } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const tasks = await getTasks(user.id)
  const activeTasks = tasks.filter(t => t.is_active).length
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count: todayCheckinCount } = await supabase
    .from('checkin_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('checked_at', today.toISOString())

  // Count notifications sent this month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const { count: notificationsThisMonth } = await supabase
    .from('notification_logs')
    .select('*', { count: 'exact', head: true })
    .eq('task.user_id', user.id)
    .gte('sent_at', monthStart.toISOString())

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="活跃任务"
          value={activeTasks}
          icon={<ListTodo size={18} className="text-blue-500" />}
        />
        <StatCard
          label="今日打卡"
          value={todayCheckinCount ?? 0}
          icon={<CheckCircle2 size={18} className="text-green-500" />}
        />
        <StatCard
          label="本月通知"
          value={notificationsThisMonth ?? 0}
          icon={<Bell size={18} className="text-orange-500" />}
        />
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="font-semibold mb-4">今日需打卡</h2>
        <TodayCheckins />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/dashboard/ components/dashboard/
git commit -m "feat: add dashboard with stats, today's checkins, and one-click check-in"
```

### Task 12: Create settings page with account deletion

**Files:**
- Create: `app/(app)/settings/page.tsx`, `app/api/settings/delete-account/route.ts`

- [ ] **Step 1: Write delete account API**

Write `app/api/settings/delete-account/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteUserAccount } from '@/lib/db/users'

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await deleteUserAccount(user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create settings page**

Write `app/(app)/settings/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    setDeleteError('')

    try {
      const res = await fetch('/api/settings/delete-account', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '注销失败')
      }
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      setDeleteError((error as Error).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">个人设置</h1>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-4">账号安全</h2>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          退出登录
        </button>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="font-semibold mb-2 text-red-600">危险区域</h2>
        <p className="text-sm text-gray-500 mb-4">
          注销账号将永久删除你的所有数据，包括任务、打卡记录、通知历史。此操作不可撤销。
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            注销账号
          </button>
        ) : (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <p className="text-sm font-medium text-red-800 mb-3">
              确认注销？所有数据将被永久删除。
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 mb-2">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? '注销中...' : '确认注销'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/settings/ app/api/settings/
git commit -m "feat: add settings page with account deletion (注销)"
```

---

## Phase 6: Notification Engine

### Task 13: Create email sending service

**Files:**
- Create: `lib/email/send.ts`, `lib/email/templates.ts`

- [ ] **Step 1: Write email template renderer**

Write `lib/email/templates.ts`:

```typescript
import type { NotificationTemplate, NotificationRecipient } from '@/types'

interface TemplateVariables {
  task_name: string
  deadline: string
  receiver_name: string
  creator_name: string
}

export function renderTemplate(
  template: NotificationTemplate,
  variables: TemplateVariables
): { subject: string; body: string; disclaimer: string } {
  let subject = template.subject
  let body = template.body

  const varMap: Record<string, string> = {
    '{{task_name}}': variables.task_name,
    '{{deadline}}': variables.deadline,
    '{{receiver_name}}': variables.receiver_name,
    '{{creator_name}}': variables.creator_name,
  }

  for (const [key, value] of Object.entries(varMap)) {
    subject = subject.replaceAll(key, value)
    body = body.replaceAll(key, value)
  }

  const disclaimer = `\n\n---\n此提醒由 ${variables.creator_name} 通过 TodoNow 发送，如不想接收请联系发送者。`

  return { subject, body, disclaimer }
}
```

- [ ] **Step 2: Write email sender**

Write `lib/email/send.ts`:

```typescript
import { Resend } from 'resend'
import { renderTemplate } from './templates'
import { createClient } from '@/lib/supabase/server'
import type { NotificationTemplate, NotificationRecipient } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendNotificationEmail(input: {
  notificationId: string
  taskId: string
  template: NotificationTemplate
  recipients: NotificationRecipient[]
  variables: {
    task_name: string
    deadline: string
    receiver_name?: string
    creator_name: string
  }
}) {
  const supabase = await createClient()
  const results: Array<{ recipient: string; status: 'sent' | 'failed'; error?: string }> = []

  for (const recipient of input.recipients) {
    if (!recipient.email) continue

    const vars = {
      ...input.variables,
      receiver_name: recipient.name || input.variables.receiver_name || recipient.email,
    }

    const { subject, body, disclaimer } = renderTemplate(input.template, vars)

    try {
      await resend.emails.send({
        from: 'TodoNow <noreply@todonow.app>',
        to: [recipient.email],
        subject,
        text: body + disclaimer,
      })

      results.push({ recipient: recipient.email, status: 'sent' })

      // Log successful send
      await supabase.from('notification_logs').insert({
        notification_id: input.notificationId,
        task_id: input.taskId,
        recipient: recipient.email,
        channel: 'email',
        status: 'sent',
      })
    } catch (error) {
      const errMsg = (error as Error).message
      results.push({ recipient: recipient.email, status: 'failed', error: errMsg })

      // Log failure
      await supabase.from('notification_logs').insert({
        notification_id: input.notificationId,
        task_id: input.taskId,
        recipient: recipient.email,
        channel: 'email',
        status: 'failed',
        error_message: errMsg,
      })
    }
  }

  return results
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/email/
git commit -m "feat: add email sending service with template rendering and audit logs"
```

### Task 14: Create notification trigger endpoint

**Files:**
- Create: `app/api/notifications/trigger/route.ts`, `lib/cron/check-tasks.ts`

- [ ] **Step 1: Write task condition checker**

Write `lib/cron/check-tasks.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { sendNotificationEmail } from '@/lib/email/send'
import type { Task, Notification } from '@/types'

export async function checkAndNotify() {
  const supabase = await createClient()

  // Fetch all active tasks with their notifications
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*, notifications(*)')
    .eq('is_active', true)

  if (error) {
    console.error('Failed to fetch tasks:', error.message)
    return { checked: 0, notified: 0, errors: 1 }
  }

  let notified = 0

  for (const task of tasks) {
    const shouldNotify = await evaluateCondition(task)
    if (!shouldNotify) continue

    // Check if already notified recently (dedup: don't spam)
    const { data: recentLogs } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('task_id', task.id)
      .gte('sent_at', new Date(Date.now() - 3600000).toISOString()) // last hour
      .limit(1)

    if (recentLogs && recentLogs.length > 0) continue // Already notified within the hour

    // Send notifications
    for (const notification of task.notifications) {
      if (!notification.is_active) continue

      // Get creator info
      const { data: creator } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', task.user_id)
        .single()

      if (notification.channel === 'email') {
        await sendNotificationEmail({
          notificationId: notification.id,
          taskId: task.id,
          template: notification.template as any,
          recipients: notification.recipients as any,
          variables: {
            task_name: task.title,
            deadline: formatDeadline(task),
            creator_name: creator?.display_name || creator?.email || '用户',
          },
        })
      }

      // WeChat notification handled separately via template message
    }

    notified++
  }

  return { checked: tasks.length, notified, errors: 0 }
}

async function evaluateCondition(task: Task): Promise<boolean> {
  const supabase = await createClient()
  const cfg = task.condition_config

  if (cfg.type === 'checkin') {
    const { data: lastCheckin } = await supabase
      .from('checkin_records')
      .select('checked_at')
      .eq('task_id', task.id)
      .eq('user_id', task.user_id)
      .order('checked_at', { ascending: false })
      .limit(1)

    if (!lastCheckin || lastCheckin.length === 0) return true

    const lastTime = new Date(lastCheckin[0].checked_at).getTime()
    const graceMs = (cfg.grace_minutes || 0) * 60000

    const intervals: Record<string, number> = {
      daily: 86400000,
      weekly: 604800000,
      monthly: 2592000000,
      yearly: 31536000000,
    }

    const interval = intervals[cfg.frequency] || 86400000
    return Date.now() - lastTime > interval + graceMs
  }

  if (cfg.type === 'deadline') {
    const dlTime = new Date(cfg.deadline).getTime()
    if (Date.now() < dlTime) return false

    if (cfg.require_checkin) {
      const { data: checkins } = await supabase
        .from('checkin_records')
        .select('id')
        .eq('task_id', task.id)
        .eq('user_id', task.user_id)
        .gte('checked_at', new Date(dlTime - 86400000).toISOString())
        .limit(1)

      return !checkins || checkins.length === 0
    }

    return true
  }

  // Count type: notify if insufficient checkins
  if (cfg.type === 'count') {
    const { count } = await supabase
      .from('checkin_records')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', task.id)
      .eq('user_id', task.user_id)
      .gte('checked_at', cfg.start_date)

    return (count || 0) < cfg.target_count
  }

  return false
}

function formatDeadline(task: Task): string {
  const cfg = task.condition_config
  if (cfg.type === 'deadline') {
    return new Date(cfg.deadline).toLocaleString('zh-CN')
  }
  if (cfg.type === 'checkin') {
    const freqMap: Record<string, string> = { daily: '每天', weekly: '每周', monthly: '每月', yearly: '每年' }
    return `${freqMap[cfg.frequency] || ''} ${cfg.count_per_period} 次`
  }
  return '请查看任务详情'
}
```

- [ ] **Step 2: Write notification trigger API**

Write `app/api/notifications/trigger/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { checkAndNotify } from '@/lib/cron/check-tasks'

// This endpoint is called by pg_cron via Supabase Edge Function
// or can be triggered manually for testing
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await checkAndNotify()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await checkAndNotify()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/cron/check-tasks.ts app/api/notifications/trigger/route.ts
git commit -m "feat: add notification engine with condition evaluator and email trigger"
```

---

## Phase 7: WeChat Integration

### Task 15: Create WeChat service

**Files:**
- Create: `lib/wechat/client.ts`, `app/api/wechat/callback/route.ts`, `app/wechat/checkin/page.tsx`
- Modify: `lib/supabase/middleware.ts`

- [ ] **Step 1: Write WeChat API client**

Write `lib/wechat/client.ts`:

```typescript
interface WeChatAccessToken {
  access_token: string
  expires_at: number
}

let cachedToken: WeChatAccessToken | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() + 60000) {
    return cachedToken.access_token
  }

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${process.env.WECHAT_APP_ID}&secret=${process.env.WECHAT_APP_SECRET}`
  )

  const data = await res.json()
  if (data.errcode) throw new Error(`WeChat token error: ${data.errmsg}`)

  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 300) * 1000,
  }

  return cachedToken.access_token
}

export async function sendTemplateMessage(input: {
  openid: string
  templateId: string
  url: string
  data: Record<string, { value: string; color?: string }>
}) {
  const token = await getAccessToken()

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        touser: input.openid,
        template_id: input.templateId,
        url: input.url,
        data: input.data,
      }),
    }
  )

  const data = await res.json()
  if (data.errcode !== 0) throw new Error(`WeChat template message error: ${data.errmsg}`)
  return data
}

export async function getUserInfo(openid: string) {
  const token = await getAccessToken()

  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${token}&openid=${openid}&lang=zh_CN`
  )

  const data = await res.json()
  if (data.errcode) throw new Error(`WeChat user info error: ${data.errmsg}`)
  return data
}
```

- [ ] **Step 2: Write WeChat callback route**

Write `app/api/wechat/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bindWeChat } from '@/lib/db/users'

// WeChat server verification (GET) + message handling (POST)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const signature = searchParams.get('signature')
  const timestamp = searchParams.get('timestamp')
  const nonce = searchParams.get('nonce')
  const echostr = searchParams.get('echostr')

  // Basic verification - in production, validate signature with SHA1
  // For MVP, return echostr to complete verification
  if (!echostr) return NextResponse.json({ error: 'Missing echostr' }, { status: 400 })

  return new NextResponse(echostr, { headers: { 'Content-Type': 'text/plain' } })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    // Parse XML message
    const openid = extractFromXml(body, 'FromUserName')
    const msgType = extractFromXml(body, 'MsgType')

    if (msgType === 'event') {
      const event = extractFromXml(body, 'Event')

      if (event === 'subscribe') {
        // User followed the official account — send binding link
        return new NextResponse(
          buildTextResponse(openid, extractFromXml(body, 'ToUserName'),
            `欢迎关注 TodoNow！\n\n请点击链接绑定账号：\n${process.env.NEXT_PUBLIC_SITE_URL}/settings?wechat_bind=${openid}`
          ),
          { headers: { 'Content-Type': 'application/xml' } }
        )
      }
    }

    if (msgType === 'text') {
      const content = extractFromXml(body, 'Content')
      if (content === '打卡') {
        return new NextResponse(
          buildTextResponse(openid, extractFromXml(body, 'ToUserName'),
            `请点击链接完成打卡：\n${process.env.NEXT_PUBLIC_SITE_URL}/wechat/checkin?openid=${openid}`
          ),
          { headers: { 'Content-Type': 'application/xml' } }
        )
      }
    }

    return new NextResponse('success')
  } catch (error) {
    console.error('WeChat callback error:', error)
    return new NextResponse('success') // Always return success to WeChat
  }
}

function extractFromXml(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]></${tag}>`)
  const match = xml.match(regex)
  if (match) return match[1]

  const simpleRegex = new RegExp(`<${tag}>(.*?)</${tag}>`)
  const simpleMatch = xml.match(simpleRegex)
  return simpleMatch ? simpleMatch[1] : ''
}

function buildTextResponse(to: string, from: string, content: string): string {
  return `<xml>
<ToUserName><![CDATA[${to}]]></ToUserName>
<FromUserName><![CDATA[${from}]]></FromUserName>
<CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${content}]]></Content>
</xml>`
}
```

- [ ] **Step 3: Create WeChat H5 check-in page**

Write `app/wechat/checkin/page.tsx`:

```typescript
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2 } from 'lucide-react'

function CheckinContent() {
  const searchParams = useSearchParams()
  const openid = searchParams.get('openid')
  const [tasks, setTasks] = useState<Array<{ id: string; title: string }>>([])
  const [checked, setChecked] = useState<string | null>(null)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      // Find user by openid and get their active check-in tasks
      if (!openid) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('wechat_openid', openid)
        .single()

      if (!profile) {
        setError('未找到绑定账号，请先在 TodoNow 网页端绑定微信')
        return
      }

      const { data } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('user_id', profile.id)
        .eq('is_active', true)

      if (data) setTasks(data)
    }
    load()
  }, [openid])

  async function handleCheckin(taskId: string) {
    const res = await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, source: 'wechat' }),
    })
    if (res.ok) {
      setChecked(taskId)
    } else {
      setError('打卡失败，请稍后再试')
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
        </div>
      </div>
    )
  }

  if (checked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">打卡成功！</h2>
          <p className="text-gray-500">已完成今日打卡</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-xl font-bold mb-4 text-center">TodoNow 打卡</h1>
      {tasks.length === 0 ? (
        <p className="text-center text-gray-400">暂无需要打卡的任务</p>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <button
              key={task.id}
              onClick={() => handleCheckin(task.id)}
              className="w-full p-4 bg-white border rounded-xl text-left hover:bg-gray-50 active:bg-gray-100"
            >
              <p className="font-medium">{task.title}</p>
              <p className="text-sm text-blue-600 mt-1">点击打卡</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function WeChatCheckinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <CheckinContent />
    </Suspense>
  )
}
```

- [ ] **Step 4: Update middleware to allow wechat path without auth**

Modify `lib/supabase/middleware.ts` — the wechat path is already in `publicPaths`. No change needed.

- [ ] **Step 5: Commit**

```bash
git add lib/wechat/client.ts app/api/wechat/ app/wechat/
git commit -m "feat: add WeChat integration (official account callback, H5 check-in page)"
```

---

## Phase 8: Compliance & Polish

### Task 16: Add privacy policy and terms of service

**Files:**
- Create: `components/compliance/privacy-policy.tsx`, `components/compliance/terms-of-service.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`
- Modify: `components/auth/register-form.tsx`

- [ ] **Step 1: Create privacy policy component**

Write `components/compliance/privacy-policy.tsx`:

```typescript
export function PrivacyPolicy() {
  return (
    <article className="prose prose-sm max-w-none">
      <h2>隐私政策</h2>
      <p>更新日期：2026 年 6 月 3 日</p>

      <h3>1. 我们收集的信息</h3>
      <p>注册时，我们收集你的邮箱地址和显示名称。如果你选择绑定微信服务号，我们会存储你的微信 OpenID。使用过程中，你创建的任务内容、打卡记录、通知配置均会保存在服务器上。</p>

      <h3>2. 信息的使用</h3>
      <p>你的信息仅用于以下目的：</p>
      <ul>
        <li>提供任务管理、打卡签到和通知发送服务</li>
        <li>向你发送你设置的任务提醒通知</li>
        <li>改善服务质量</li>
      </ul>

      <h3>3. 信息的存储</h3>
      <p>所有数据存储在 Supabase 提供的加密数据库中。我们采取合理的技术手段保护你的数据安全。</p>

      <h3>4. 信息的分享</h3>
      <p>我们不会将你的个人信息出售给第三方。当你在任务中设置通知接收人时，系统会向接收人邮箱发送你自定义的通知内容。</p>

      <h3>5. 注销账号</h3>
      <p>你可以在「个人设置」页面随时注销账号。注销后，你的所有数据将被永久删除。</p>

      <h3>6. 联系我们</h3>
      <p>如有隐私相关问题，请联系：support@todonow.app</p>
    </article>
  )
}
```

- [ ] **Step 2: Create terms of service component**

Write `components/compliance/terms-of-service.tsx`:

```typescript
export function TermsOfService() {
  return (
    <article className="prose prose-sm max-w-none">
      <h2>服务条款</h2>
      <p>更新日期：2026 年 6 月 3 日</p>

      <h3>1. 服务说明</h3>
      <p>TodoNow 是一个条件驱动的任务管理和通知系统。用户可创建任务、设置触发条件，当条件不满足时系统自动发送通知。</p>

      <h3>2. 用户义务</h3>
      <ul>
        <li>提供真实有效的注册信息</li>
        <li>不得利用本服务发送垃圾信息或骚扰他人</li>
        <li>对自己创建的任务和通知内容负责</li>
      </ul>

      <h3>3. 免责声明</h3>
      <p>TodoNow 是一个辅助工具，不对因通知延迟、未送达等情况造成的任何损失承担责任。本服务不构成任何形式的安全保障。</p>

      <h3>4. 服务变更</h3>
      <p>我们保留随时修改或终止服务的权利，修改后会通过网站公告通知用户。</p>

      <h3>5. 终止</h3>
      <p>如发现用户违反本条款，我们有权暂停或终止其账号。</p>
    </article>
  )
}
```

- [ ] **Step 3: Create standalone policy pages**

Write `app/privacy/page.tsx`:

```typescript
import { PrivacyPolicy } from '@/components/compliance/privacy-policy'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-xl border p-8">
        <PrivacyPolicy />
      </div>
    </div>
  )
}
```

Write `app/terms/page.tsx`:

```typescript
import { TermsOfService } from '@/components/compliance/terms-of-service'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-xl border p-8">
        <TermsOfService />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add links to register form**

Modify `components/auth/register-form.tsx` — add below the submit button, before the login link:

```typescript
<p className="text-xs text-gray-400 text-center mt-3">
  注册即表示同意
  <Link href="/terms" className="text-blue-600 hover:underline">服务条款</Link>
  和
  <Link href="/privacy" className="text-blue-600 hover:underline">隐私政策</Link>
</p>
```

Make sure `Link` is already imported (it is from the login link below).

- [ ] **Step 5: Commit**

```bash
git add components/compliance/ app/privacy/ app/terms/ components/auth/register-form.tsx
git commit -m "feat: add privacy policy, terms of service, and registration consent links"
```

### Task 17: Final polish — error handling and UX

**Files:**
- Create: `app/not-found.tsx`
- Modify: `app/(app)/tasks/page.tsx` (add loading state)

- [ ] **Step 1: Create 404 page**

Write `app/not-found.tsx`:

```typescript
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <p className="text-gray-500 mb-6">页面不存在</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          返回首页
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create landing page redirect**

Write `app/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
```

- [ ] **Step 3: Add loading states to task pages**

Create `app/(app)/tasks/loading.tsx`:

```typescript
export default function TasksLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify full app flow**

```bash
npm run dev
```

Walk through all flows: register → verify email → login → create task (each type) → check in → check dashboard → edit task → delete task → settings → logout.

- [ ] **Step 5: Commit**

```bash
git add app/not-found.tsx app/page.tsx app/\(app\)/tasks/loading.tsx
git commit -m "feat: add 404 page, landing redirect, and loading states"
```

---

## Implementation Notes

1. **Supabase Setup:** Before starting, create a Supabase project and copy the URL + anon key + service role key to `.env.local`
2. **Resend Setup:** Sign up at resend.com, verify a sending domain, copy API key to `.env.local`
3. **WeChat Setup:** Register a WeChat Official Account (服务号), configure server callback URL to `https://your-domain.com/api/wechat/callback`, set token in `.env.local`
4. **pg_cron:** The condition-checking SQL function is defined in the migration. In production, configure Supabase Edge Function to call `/api/notifications/trigger` or use a dedicated cron service (Vercel Cron, etc.)
5. **ICP 备案:** Before deploying in China, complete ICP filing for your domain. Deploy to a domestic Node.js host (Alibaba Cloud, Tencent Cloud) since Vercel is inaccessible in China.
6. **Email Sender:** For MVP with Resend, use their free tier (100 emails/day). Before launch, verify a custom domain for better deliverability.
