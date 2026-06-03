'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2 } from 'lucide-react'

function CheckinContent() {
  const searchParams = useSearchParams()
  const openid = searchParams.get('openid')
  const [tasks, setTasks] = useState<Array<{ id: string; title: string }>>([])
  const [checked, setChecked] = useState<string | null>(null)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      if (!openid) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('wechat_openid', openid)
        .single()

      if (!profile) {
        setError('未找到绑定账号，请先在 TodoNow 网页端绑定微信')
        return
      }

      const { data } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('user_id', profile.id)
        .eq('is_active', true)

      if (data) setTasks(data)
    }
    load()
  }, [openid])

  async function handleCheckin(taskId: string) {
    const res = await fetch('/api/checkins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, source: 'wechat' }),
    })
    if (res.ok) {
      setChecked(taskId)
    } else {
      setError('打卡失败，请稍后再试')
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
        </div>
      </div>
    )
  }

  if (checked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">打卡成功！</h2>
          <p className="text-gray-500">已完成今日打卡</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-xl font-bold mb-4 text-center">TodoNow 打卡</h1>
      {tasks.length === 0 ? (
        <p className="text-center text-gray-400">暂无需要打卡的任务</p>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <button
              key={task.id}
              onClick={() => handleCheckin(task.id)}
              className="w-full p-4 bg-white border rounded-xl text-left hover:bg-gray-50 active:bg-gray-100"
            >
              <p className="font-medium">{task.title}</p>
              <p className="text-sm text-blue-600 mt-1">点击打卡</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function WeChatCheckinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <CheckinContent />
    </Suspense>
  )
}
