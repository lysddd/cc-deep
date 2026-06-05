import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTaskSchema } from '@/lib/validators/task'
import { ZodError } from 'zod'
import { getTasks, createTask } from '@/lib/db/tasks'
import { LIMITS } from '@/lib/security/limits'

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

    // Rate limit: check task count
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) >= LIMITS.MAX_TASKS) {
      return NextResponse.json({ error: `每个账号最多 ${LIMITS.MAX_TASKS} 个任务` }, { status: 429 })
    }

    const body = await request.json()
    const validated = createTaskSchema.parse(body)

    // Validate notification limits
    if (validated.notifications.length > LIMITS.MAX_NOTIFICATIONS_PER_TASK) {
      return NextResponse.json({ error: `每个任务最多 ${LIMITS.MAX_NOTIFICATIONS_PER_TASK} 个通知` }, { status: 400 })
    }
    for (const n of validated.notifications) {
      if (n.recipients.length > LIMITS.MAX_RECIPIENTS_PER_NOTIFICATION) {
        return NextResponse.json({ error: `每个通知最多 ${LIMITS.MAX_RECIPIENTS_PER_NOTIFICATION} 个接收人` }, { status: 400 })
      }
    }

    const task = await createTask({
      userId: user.id,
      title: validated.title,
      description: validated.description,
      task_type: validated.task_type,
      condition_config: validated.condition_config,
      notifications: validated.notifications.map(n => ({ ...n, is_active: true })),
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
