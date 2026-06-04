'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import type { Task } from '@/types'

function formatCondition(task: Task): string {
  const cfg = task.condition_config
  if (cfg.type === 'checkin') {
    return `${cfg.frequency === 'daily' ? '每天' : cfg.frequency === 'weekly' ? '每周' : '每月'}签到 ${cfg.count_per_period} 次`
  }
  if (cfg.type === 'deadline') {
    return `截止: ${new Date(cfg.deadline).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
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

export function TaskCard({ task }: { task: Task }) {
  const typeLabels: Record<string, string> = {
    checkin: '签到',
    deadline: '截止',
    count: '计数',
  }

  const ended = isEnded(task)

  return (
    <Link href={`/tasks/${task.id}`}>
      <div className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${ended ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium
              ${task.task_type === 'checkin' ? 'bg-green-100 text-green-700' :
                task.task_type === 'deadline' ? (ended ? 'bg-gray-100 text-gray-500' : 'bg-orange-100 text-orange-700') :
                'bg-purple-100 text-purple-700'}`}>
              {typeLabels[task.task_type]}
            </span>
            {ended && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">已结束</span>
            )}
            {!task.is_active && !ended && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">已暂停</span>
            )}
          </div>
          {(task.notifications?.length ?? 0) > 0 && <Bell size={14} className="text-gray-400" />}
        </div>

        <h3 className={`font-semibold mb-1 ${ended ? 'text-gray-400' : ''}`}>{task.title}</h3>
        <p className="text-sm text-gray-500">{formatCondition(task)}</p>
      </div>
    </Link>
  )
}
