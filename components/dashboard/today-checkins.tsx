'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check } from 'lucide-react'

interface TaskItem {
  id: string
  title: string
  task_type: string
  condition_config: Record<string, unknown>
}

function isTaskForToday(task: TaskItem): boolean {
  // Checkin and count tasks: always show
  if (task.task_type === 'checkin' || task.task_type === 'count') return true

  // Deadline tasks: only show if deadline is today
  if (task.task_type === 'deadline') {
    const cfg = task.condition_config
    if (cfg.type !== 'deadline' || !cfg.deadline) return false
    const dl = new Date(cfg.deadline as string)
    const now = new Date()
    return dl.getFullYear() === now.getFullYear() &&
           dl.getMonth() === now.getMonth() &&
           dl.getDate() === now.getDate()
  }

  return false
}

export function TodayCheckins() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id, title, task_type, condition_config')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data: todayCheckins } = await supabase
        .from('checkin_records')
        .select('task_id')
        .eq('user_id', user.id)
        .gte('checked_at', today.toISOString())

      // Filter: only show tasks relevant for today
      const filtered = allTasks ? allTasks.filter(isTaskForToday) : []
      if (filtered) setTasks(filtered)
      if (todayCheckins) setChecked(new Set(todayCheckins.map(c => c.task_id)))
      setLoading(false)
    }
    load()
  }, [])

  async function handleCheckin(taskId: string) {
    setError('')
    setLoading(true)
    const res = await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, source: 'web' }),
    })
    if (res.ok) {
      setChecked(prev => new Set([...prev, taskId]))
    } else {
      const data = await res.json()
      setError(data.error || '打卡失败')
    }
    setLoading(false)
  }

  function isDeadlinePassed(task: TaskItem): boolean {
    if (task.task_type !== 'deadline') return false
    const cfg = task.condition_config
    if (cfg.type !== 'deadline' || !cfg.deadline) return false
    return Date.now() > new Date(cfg.deadline as string).getTime()
  }

  function formatDeadlineTime(task: TaskItem): string {
    if (task.task_type !== 'deadline') return ''
    const cfg = task.condition_config
    if (cfg.type !== 'deadline' || !cfg.deadline) return ''
    return new Date(cfg.deadline as string).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    })
  }

  if (tasks.length === 0 && !loading) {
    return <p className="text-sm text-gray-400">暂无需要签到的任务</p>
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-50 text-red-600 text-xs p-2 rounded mb-2">{error}</div>
      )}
      {tasks.map(task => {
        const passed = isDeadlinePassed(task)
        const deadlineTime = formatDeadlineTime(task)
        return (
          <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">{task.title}</p>
              <span className="text-xs text-gray-400">
                {task.task_type === 'checkin' ? '签到' :
                 task.task_type === 'deadline' ?
                   `${passed ? '已截止' : '截止'} ${deadlineTime}` : '计数'}
              </span>
            </div>
            <button
              onClick={() => handleCheckin(task.id)}
              disabled={checked.has(task.id) || loading || passed}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${checked.has(task.id)
                  ? 'bg-green-100 text-green-600'
                  : passed
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'}`}
            >
              {checked.has(task.id) && <Check size={14} />}
              {passed ? '已截止' : checked.has(task.id) ? '已打卡' : '打卡'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
