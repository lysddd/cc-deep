import { createClient } from '@/lib/supabase/server'
import { getTasks } from '@/lib/db/tasks'
import { StatCard } from '@/components/dashboard/stat-card'
import { TodayCheckins } from '@/components/dashboard/today-checkins'
import { ListTodo, CheckCircle2, Bell } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const tasks = await getTasks(user.id)
  const activeTasks = tasks.filter(t => t.is_active).length
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count: todayCheckinCount } = await supabase
    .from('checkin_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('checked_at', today.toISOString())

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const { count: notificationsThisMonth } = await supabase
    .from('notification_logs')
    .select('*', { count: 'exact', head: true })
    .gte('sent_at', monthStart.toISOString())

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="活跃任务"
          value={activeTasks}
          icon={<ListTodo size={18} className="text-blue-500" />}
        />
        <StatCard
          label="今日打卡"
          value={todayCheckinCount ?? 0}
          icon={<CheckCircle2 size={18} className="text-green-500" />}
        />
        <StatCard
          label="本月通知"
          value={notificationsThisMonth ?? 0}
          icon={<Bell size={18} className="text-orange-500" />}
        />
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="font-semibold mb-4">今日需打卡</h2>
        <TodayCheckins />
      </div>
    </div>
  )
}
