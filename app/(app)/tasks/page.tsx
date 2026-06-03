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
