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
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
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
