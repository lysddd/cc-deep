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
