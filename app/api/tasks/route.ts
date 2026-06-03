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
