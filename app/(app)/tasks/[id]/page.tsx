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
          {task.notifications.map((n) => (
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
