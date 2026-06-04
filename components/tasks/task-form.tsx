'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ConditionConfig } from './condition-config'
import { NotificationConfig } from './notification-config'
import type { TaskType, TaskCondition } from '@/types'

function loadStoredNotifications(): NotificationEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem('todonow_last_notification')
    if (saved) return [JSON.parse(saved)]
  } catch {}
  return []
}

interface NotificationEntry {
  channel: string
  recipients: { email?: string; name?: string }[]
  template: { subject: string; body: string }
}

interface Props {
  mode: 'create' | 'edit'
  defaultValues?: {
    id?: string
    title?: string
    description?: string
    task_type?: TaskType
    condition_config?: TaskCondition
    notifications?: NotificationEntry[]
  }
}

export function TaskForm({ mode, defaultValues }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(defaultValues?.title ?? '')
  const [description, setDescription] = useState(defaultValues?.description ?? '')
  const [taskType, setTaskType] = useState<TaskType>(defaultValues?.task_type ?? 'checkin')
  const [condition, setCondition] = useState<Record<string, unknown>>(
    (defaultValues?.condition_config as unknown as Record<string, unknown>) ?? { type: 'checkin', frequency: 'daily', count_per_period: 1, grace_minutes: 0, start_date: '' }
  )
  const [notifications, setNotifications] = useState<NotificationEntry[]>(
    defaultValues?.notifications ?? []
  )
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Load stored notification defaults on client mount (bypasses SSR)
  useEffect(() => {
    if (mode === 'create' && !defaultValues?.notifications?.length && !notificationsLoaded) {
      const stored = loadStoredNotifications()
      if (stored.length > 0) {
        setNotifications(stored)
      }
      setNotificationsLoaded(true)
    }
  }, [mode, defaultValues, notificationsLoaded])

  function handleTaskTypeChange(type: TaskType) {
    setTaskType(type)
    if (type === 'checkin') {
      setCondition({ type: 'checkin', frequency: 'daily', count_per_period: 1, grace_minutes: 0, start_date: '' })
    } else if (type === 'deadline') {
      setCondition({ type: 'deadline', deadline: '', require_checkin: true, remind_before_minutes: [] })
    } else {
      setCondition({ type: 'count', frequency: 'daily', target_count: 1, start_date: '' })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const body = {
      title,
      description: description || undefined,
      task_type: taskType,
      condition_config: condition,
      notifications,
    }

    const url = mode === 'create' ? '/api/tasks' : `/api/tasks/${defaultValues?.id}`
    const method = mode === 'create' ? 'POST' : 'PUT'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '操作失败')
      }

      router.push('/tasks')
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">任务类型</label>
        <div className="flex gap-3">
          {[
            { value: 'checkin' as TaskType, label: '周期性签到' },
            { value: 'deadline' as TaskType, label: '截止时间未完成' },
            { value: 'count' as TaskType, label: '次数达标' },
          ].map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTaskTypeChange(t.value)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                ${taskType === t.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">任务名称</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          maxLength={200}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="例如：每日健身打卡"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">任务描述（选填）</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="补充说明..."
        />
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-3">条件配置</h4>
        <ConditionConfig
          taskType={taskType}
          value={condition}
          onChange={setCondition}
        />
      </div>

      <div className="border rounded-lg p-4">
        <NotificationConfig
          value={notifications}
          onChange={setNotifications}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '保存中...' : mode === 'create' ? '创建任务' : '保存修改'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 rounded-lg border font-medium text-gray-700 hover:bg-gray-50"
        >
          取消
        </button>
      </div>
    </form>
  )
}
