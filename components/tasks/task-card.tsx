'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import type { Task } from '@/types'

function formatCondition(task: Task): string {
  const cfg = task.condition_config
  if (cfg.type === 'checkin') {
    const freq = cfg.frequency === 'daily' ? '每天' : cfg.frequency === 'weekly' ? '每周' : '每月'
    return `${freq}签到 ${cfg.count_per_period} 次`
  }
  if (cfg.type === 'deadline') {
    return `截止: ${new Date(cfg.deadline).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
  }
  if (cfg.type === 'count') {
    return `${cfg.target_count} 次/${cfg.frequency === 'daily' ? '天' : '周'}`
  }
  return ''
}

function isEnded(task: Task): boolean {
  const cfg = task.condition_config
  if (cfg.type === 'deadline' && cfg.deadline) {
    return Date.now() > new Date(cfg.deadline).getTime()
  }
  return false
}

const typeTag = {
  checkin: 'bg-lime-100 text-lime-700',
  deadline: 'bg-blue-50 text-blue-600',
  count: 'bg-amber-50 text-amber-600',
}

const typeLabel: Record<string, string> = {
  checkin: '签到',
  deadline: '截止',
  count: '计数',
}

export function TaskCard({ task }: { task: Task }) {
  const ended = isEnded(task)

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className={`bg-white border border-stone-200 rounded-lg p-5 hover:border-stone-300 hover:shadow-sm transition-all cursor-pointer ${ended ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-0.5 rounded-md font-medium ${ended ? 'bg-stone-100 text-stone-400' : typeTag[task.task_type] ?? typeTag.checkin}`}>
              {typeLabel[task.task_type]}
            </span>
            {ended && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-400">已结束</span>
            )}
            {!task.is_active && !ended && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-stone-100 text-stone-400">已暂停</span>
            )}
          </div>
          {(task.notifications?.length ?? 0) > 0 && <Bell size={14} className="text-stone-300" />}
        </div>

        <h3 className={`font-medium text-sm mb-1 ${ended ? 'text-stone-400' : 'text-stone-800'}`}>
          {task.title}
        </h3>
        <p className="text-[13px] text-stone-400">{formatCondition(task)}</p>
      </div>
    </Link>
  )
}
