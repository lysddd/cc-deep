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
