import { createClient } from '@/lib/supabase/server'
import type { CheckinRecord } from '@/types'

export async function createCheckin(
  taskId: string,
  userId: string,
  source: 'web' | 'wechat'
): Promise<CheckinRecord> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('checkin_records')
    .insert({
      task_id: taskId,
      user_id: userId,
      source,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create check-in: ${error.message}`)
  return data
}

export async function getTaskCheckins(
  taskId: string,
  userId: string,
  limit = 30
): Promise<CheckinRecord[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('checkin_records')
    .select('*')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .order('checked_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch checkins: ${error.message}`)
  return data
}

export async function getTodayCheckins(userId: string): Promise<CheckinRecord[]> {
  const supabase = await createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('checkin_records')
    .select('*, task:tasks(id, title, task_type)')
    .eq('user_id', userId)
    .gte('checked_at', today.toISOString())
    .order('checked_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch today's checkins: ${error.message}`)
  return data
}
