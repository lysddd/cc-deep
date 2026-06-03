export type TaskType = 'checkin' | 'deadline' | 'count'

export interface CheckinCondition {
  type: 'checkin'
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  count_per_period: number
  grace_minutes: number
  start_date: string
}

export interface DeadlineCondition {
  type: 'deadline'
  deadline: string
  require_checkin: boolean
  remind_before_minutes: number[]
}

export interface CountCondition {
  type: 'count'
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  target_count: number
  start_date: string
}

export type TaskCondition = CheckinCondition | DeadlineCondition | CountCondition

export type NotificationChannel = 'email' | 'wechat_template'

export interface NotificationTemplate {
  subject: string
  body: string
}

export interface NotificationRecipient {
  email?: string
  name?: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  task_type: TaskType
  condition_config: TaskCondition
  is_active: boolean
  created_at: string
  notifications?: Notification[]
}

export interface Notification {
  id: string
  task_id: string
  channel: NotificationChannel
  recipients: NotificationRecipient[]
  template: NotificationTemplate
  is_active: boolean
}

export interface CheckinRecord {
  id: string
  task_id: string
  user_id: string
  checked_at: string
  source: 'web' | 'wechat'
}

export interface UserProfile {
  id: string
  email: string
  display_name: string
  wechat_openid: string | null
  email_verified_at: string | null
  created_at: string
}
