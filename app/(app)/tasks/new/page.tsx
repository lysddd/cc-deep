import { TaskForm } from '@/components/tasks/task-form'

export default function NewTaskPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">创建新任务</h1>
      <TaskForm mode="create" />
    </div>
  )
}
