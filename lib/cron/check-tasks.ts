import { createClient } from '@supabase/supabase-js'
import { sendNotificationEmail } from '@/lib/email/send'
import type { Task } from '@/types'

// Use service_role client to bypass RLS for system-level cron job
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function checkAndNotify() {
  const supabase = adminClient

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*, notifications(*)')
    .eq('is_active', true)

  if (error) {
    console.error('Failed to fetch tasks:', error.message)
    return { checked: 0, notified: 0, errors: 1 }
  }

  let notified = 0

  for (const task of tasks) {
    const shouldNotify = await evaluateCondition(task)
    if (!shouldNotify) continue

    // Dedup: don't notify if already sent within the last hour
    const { data: recentLogs } = await supabase
      .from('notification_logs')
      .select('id')
      .eq('task_id', task.id)
      .gte('sent_at', new Date(Date.now() - 3600000).toISOString())
      .limit(1)

    if (recentLogs && recentLogs.length > 0) continue

    for (const notification of task.notifications) {
      if (!notification.is_active) continue

      const { data: creator } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', task.user_id)
        .single()

      if (notification.channel === 'email') {
        await sendNotificationEmail({
          notificationId: notification.id,
          taskId: task.id,
          template: notification.template as any,
          recipients: notification.recipients as any,
          variables: {
            task_name: task.title,
            deadline: formatDeadline(task),
            creator_name: creator?.display_name || creator?.email || '用户',
          },
        })
      }
    }

    notified++
  }

  return { checked: tasks.length, notified, errors: 0 }
}

async function evaluateCondition(task: Task): Promise<boolean> {
  const supabase = await createClient()
  const cfg = task.condition_config

  if (cfg.type === 'checkin') {
    const { data: lastCheckin } = await supabase
      .from('checkin_records')
      .select('checked_at')
      .eq('task_id', task.id)
      .eq('user_id', task.user_id)
      .order('checked_at', { ascending: false })
      .limit(1)

    if (!lastCheckin || lastCheckin.length === 0) return true

    const lastTime = new Date(lastCheckin[0].checked_at).getTime()
    const graceMs = (cfg.grace_minutes || 0) * 60000

    const intervals: Record<string, number> = {
      daily: 86400000,
      weekly: 604800000,
      monthly: 2592000000,
      yearly: 31536000000,
    }

    const interval = intervals[cfg.frequency] || 86400000
    return Date.now() - lastTime > interval + graceMs
  }

  if (cfg.type === 'deadline') {
    const dlTime = new Date(cfg.deadline).getTime()
    if (Date.now() < dlTime) return false

    if (cfg.require_checkin) {
      const { data: checkins } = await supabase
        .from('checkin_records')
        .select('id')
        .eq('task_id', task.id)
        .eq('user_id', task.user_id)
        .gte('checked_at', new Date(dlTime - 86400000).toISOString())
        .limit(1)

      return !checkins || checkins.length === 0
    }

    return true
  }

  if (cfg.type === 'count') {
    const { count } = await supabase
      .from('checkin_records')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', task.id)
      .eq('user_id', task.user_id)
      .gte('checked_at', cfg.start_date)

    return (count || 0) < cfg.target_count
  }

  return false
}

function formatDeadline(task: Task): string {
  const cfg = task.condition_config
  if (cfg.type === 'deadline') {
    return new Date(cfg.deadline).toLocaleString('zh-CN')
  }
  if (cfg.type === 'checkin') {
    const freqMap: Record<string, string> = { daily: '每天', weekly: '每周', monthly: '每月', yearly: '每年' }
    return `${freqMap[cfg.frequency] || ''} ${cfg.count_per_period} 次`
  }
  return '请查看任务详情'
}
