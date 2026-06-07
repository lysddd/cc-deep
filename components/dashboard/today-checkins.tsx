'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarCheck, Clock, Hash, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface TaskItem {
  id: string
  title: string
  task_type: string
  condition_config: Record<string, unknown>
}

const iconMap: Record<string, { icon: typeof CalendarCheck; bg: string; text: string }> = {
  checkin:  { icon: CalendarCheck, bg: 'bg-lime-100', text: 'text-lime-700' },
  deadline: { icon: Clock, bg: 'bg-blue-50', text: 'text-blue-600' },
  count:    { icon: Hash, bg: 'bg-amber-50', text: 'text-amber-600' },
}

function isTaskForToday(task: TaskItem): boolean {
  if (task.task_type === 'checkin' || task.task_type === 'count') return true
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

function isDeadlinePassed(task: TaskItem): boolean {
  if (task.task_type !== 'deadline') return false
  const cfg = task.condition_config
  if (cfg.type !== 'deadline' || !cfg.deadline) return false
  return Date.now() > new Date(cfg.deadline as string).getTime()
}

function formatTime(task: TaskItem): string {
  if (task.task_type !== 'deadline') return ''
  const cfg = task.condition_config
  if (cfg.type !== 'deadline' || !cfg.deadline) return ''
  return new Date(cfg.deadline as string).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
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
      const filtered = allTasks ? allTasks.filter(isTaskForToday) : []

      const today = new Date(); today.setHours(0, 0, 0, 0)
      const { data: todayCheckins } = await supabase
        .from('checkin_records')
        .select('task_id')
        .eq('user_id', user.id)
        .gte('checked_at', today.toISOString())

      setTasks(filtered)
      if (todayCheckins) setChecked(new Set(todayCheckins.map(c => c.task_id)))
      setLoading(false)
    }
    load()
  }, [])

  async function handleCheckin(taskId: string) {
    setError('')
    setLoading(true)
    const res = await fetch('/api/checkins', { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, source: 'web' }) })
    if (res.ok) setChecked(prev => new Set([...prev, taskId]))
    else { const data = await res.json(); setError(data.error || '打卡失败') }
    setLoading(false)
  }

  // Empty state
  if (tasks.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-stone-300" strokeWidth={1.5} />
        </div>
        <p className="text-[15px] font-medium text-stone-500 mb-1">暂无今日打卡任务</p>
        <p className="text-[13px] text-stone-300 mb-5">当前没有需要打卡的任务，创建一个吧</p>
        <Link href="/tasks/new" className="inline-flex items-center h-9 px-5 bg-brand-600 text-white text-[13px] font-medium rounded-lg hover:bg-brand-800 transition-colors cursor-pointer">
          创建任务
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <div className="bg-red-50 text-red-600 text-xs p-2 rounded-lg">{error}</div>}
      {tasks.map(task => {
        const passed = isDeadlinePassed(task)
        const tm = formatTime(task)
        const cfg = iconMap[task.task_type] ?? iconMap.checkin
        const Icon = cfg.icon
        const isChecked = checked.has(task.id)

        return (
          <div key={task.id} className="bg-white border border-stone-200 rounded-lg px-5 py-4 flex items-center gap-4 hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.text}`}>
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-stone-800 truncate">{task.title}</div>
              <div className="text-xs text-stone-400">
                {task.task_type === 'checkin' ? '签到' :
                 task.task_type === 'deadline' ? `${passed ? '已截止' : '截止'} ${tm}` : '计数'}
              </div>
            </div>
            <button
              onClick={() => handleCheckin(task.id)}
              disabled={isChecked || loading || passed}
              className={`shrink-0 h-8 px-4 rounded-md text-xs font-medium transition-colors cursor-pointer
                ${isChecked ? 'bg-lime-100 text-lime-700' :
                  passed ? 'bg-stone-100 text-stone-400 cursor-not-allowed' :
                  'bg-brand-600 text-white hover:bg-brand-800'}`}
            >
              {isChecked ? '已打卡' : passed ? '已截止' : '打卡'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
