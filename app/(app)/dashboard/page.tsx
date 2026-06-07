import { createClient } from '@/lib/supabase/server'
import { getTasks } from '@/lib/db/tasks'
import { StatCard } from '@/components/dashboard/stat-card'
import { TodayCheckins } from '@/components/dashboard/today-checkins'
import { BarChart3, CheckCircle2, Bell } from 'lucide-react'
import Link from 'next/link'

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
    <div className="max-w-4xl">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-stone-800 mb-1">仪表盘</h1>
        <p className="text-[13px] text-stone-400">管理你的任务与通知</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="活跃任务" value={activeTasks} icon={<BarChart3 size={18} />} color="purple" />
        <StatCard label="今日需打卡" value={todayCheckinCount ?? 0} icon={<CheckCircle2 size={18} />} color="green" />
        <StatCard label="本月通知" value={notificationsThisMonth ?? 0} icon={<Bell size={18} />} color="blue" />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-stone-800">今日需打卡</h2>
          <Link href="/tasks" className="text-brand-600 text-[13px] font-medium hover:text-brand-800 transition-colors">
            查看全部
          </Link>
        </div>
        <TodayCheckins />
      </section>
    </div>
  )
}
