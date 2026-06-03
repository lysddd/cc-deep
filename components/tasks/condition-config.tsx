'use client'

import type { TaskType } from '@/types'

interface Props {
  taskType: TaskType
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

export function ConditionConfig({ taskType, value, onChange }: Props) {
  function updateField(field: string, val: unknown) {
    onChange({ ...value, [field]: val })
  }

  if (taskType === 'checkin') {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">签到频率</label>
          <select
            value={(value.frequency as string) ?? 'daily'}
            onChange={e => updateField('frequency', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
            <option value="monthly">每月</option>
            <option value="yearly">每年</option>
          </select>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">每周期打卡次数</label>
            <input
              type="number"
              min={1}
              value={(value.count_per_period as number) ?? 1}
              onChange={e => updateField('count_per_period', parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">宽限期（分钟）</label>
            <input
              type="number"
              min={0}
              value={(value.grace_minutes as number) ?? 0}
              onChange={e => updateField('grace_minutes', parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">开始日期</label>
          <input
            type="date"
            value={(value.start_date as string) ?? ''}
            onChange={e => updateField('start_date', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>
    )
  }

  if (taskType === 'deadline') {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">截止时间</label>
          <input
            type="datetime-local"
            value={(value.deadline as string) ?? ''}
            onChange={e => updateField('deadline', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={(value.require_checkin as boolean) ?? true}
            onChange={e => updateField('require_checkin', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">需要手动确认完成</span>
        </label>

        <div>
          <label className="block text-sm font-medium mb-1">提前提醒（分钟前）</label>
          <input
            type="text"
            value={((value.remind_before_minutes as number[]) ?? []).join(', ')}
            onChange={e => {
              const nums = e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
              updateField('remind_before_minutes', nums)
            }}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="60, 15"
          />
        </div>
      </div>
    )
  }

  if (taskType === 'count') {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">统计周期</label>
          <select
            value={(value.frequency as string) ?? 'daily'}
            onChange={e => updateField('frequency', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
            <option value="monthly">每月</option>
            <option value="yearly">每年</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">目标次数</label>
          <input
            type="number"
            min={1}
            value={(value.target_count as number) ?? 1}
            onChange={e => updateField('target_count', parseInt(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">开始日期</label>
          <input
            type="date"
            value={(value.start_date as string) ?? ''}
            onChange={e => updateField('start_date', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>
    )
  }

  return null
}
