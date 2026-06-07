'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TaskCard } from '@/components/tasks/task-card'
import type { Task } from '@/types'

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'checkin', label: '签到' },
  { key: 'deadline', label: '截止' },
  { key: 'count', label: '计数' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('tasks')
        .select('*, notifications(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!error && data) setTasks(data)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = activeTab === 'all'
    ? tasks
    : tasks.filter(t => t.task_type === activeTab)

  return (
    <div className="max-w-4xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800 mb-1">任务管理</h1>
          <p className="text-[13px] text-stone-400">管理你的所有任务和通知规则</p>
        </div>
        <Link
          href="/tasks/new"
          className="hidden sm:inline-flex items-center gap-2 h-10 px-5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-800 transition-colors cursor-pointer"
        >
          <Plus size={18} /> 创建任务
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-lg mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 text-[13px] rounded-md font-medium transition-all cursor-pointer
              ${activeTab === tab.key
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-stone-400 hover:text-stone-600'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-stone-100 rounded-lg animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <Plus size={32} className="text-stone-300" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-medium text-stone-500 mb-1">还没有任务</p>
          <p className="text-[13px] text-stone-300 mb-5">点击下方按钮创建第一个任务</p>
          <Link href="/tasks/new" className="inline-flex items-center h-9 px-5 bg-brand-600 text-white text-[13px] font-medium rounded-lg hover:bg-brand-800 transition-colors cursor-pointer">
            创建任务
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* FAB for mobile */}
      <Link href="/tasks/new"
        className="sm:hidden fixed bottom-20 right-5 w-13 h-13 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-800 transition-colors flex items-center justify-center z-40 cursor-pointer">
        <Plus size={24} />
      </Link>
    </div>
  )
}
