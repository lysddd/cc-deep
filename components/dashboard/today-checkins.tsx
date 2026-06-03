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

      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id, title, task_type')
        .eq('user_id', user.id)
        .eq('is_active', true)

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
